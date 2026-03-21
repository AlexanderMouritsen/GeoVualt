"use client"

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import { CountrySearch } from '@/components/game/CountrySearch'
import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { normalizeChallengeDate } from '@/lib/challenge'
import { loadCountries } from '@/lib/countries'
import {
  createGeodleGuess,
  formatInteger,
  formatTemperature,
  geodleContinentLabel,
  makeRng,
  pickGeodleTarget,
} from '@/lib/game'
import type { Country, GeodleDirection, GeodleGuess } from '@/types'

const DAILY_LOCK_KEY = 'geovault-geodle-daily-completed'
const DAILY_RESULT_KEY = 'geovault-geodle-daily-result'
const GEODLE_PROGRESS_KEY_PREFIX = 'geovault-geodle-progress'

interface DailyGeodleResult {
  date: string
  targetName: string
  targetFlagEmoji: string
  guessCount: number
  guesses: string[]
  outcome: 'win' | 'give-up'
}

interface GeodleProgressCache {
  targetCca2: string
  guessCodes: string[]
  challengeDate: string
  seedOverride: string | null
}

function getProgressStorageKey(mode: 'daily' | 'unlimited', challengeDate: string): string {
  return mode === 'daily'
    ? `${GEODLE_PROGRESS_KEY_PREFIX}:daily:${challengeDate}`
    : `${GEODLE_PROGRESS_KEY_PREFIX}:unlimited`
}

function directionLabel(direction: GeodleDirection): string {
  if (direction === 'higher') return '↑'
  if (direction === 'lower') return '↓'
  if (direction === 'exact') return '●'
  return '○'
}

function directionCellClass(direction: GeodleDirection, isClose: boolean): string {
  if (direction === 'exact') return 'border-[var(--accent)] text-[var(--accent)] bg-transparent'
  if (direction === 'higher' || direction === 'lower') return 'border-[var(--accent)] text-[var(--accent)] bg-transparent'
  if (isClose) return 'border-[var(--accent-gold)] text-[var(--accent-gold)] bg-transparent'
  return 'border-[var(--border-bright)] text-[var(--text-muted)] bg-transparent'
}

export default function GeodlePage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<Country | null>(null)
  const [seedMode, setSeedMode] = useState<'daily' | 'unlimited'>('daily')
  const [seedOverride, setSeedOverride] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<GeodleGuess[]>([])
  const [didRecordResult, setDidRecordResult] = useState(false)
  const [didGiveUp, setDidGiveUp] = useState(false)
  const [dailyCompletedDate, setDailyCompletedDate] = useState<string | null>(null)
  const [dailyResult, setDailyResult] = useState<DailyGeodleResult | null>(null)
  const [challengeDate, setChallengeDate] = useState(() => normalizeChallengeDate(null))

  const { recordResult } = useStats()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setChallengeDate(normalizeChallengeDate(params.get('day')))
  }, [])

  const isWon = useMemo(() => {
    if (!target) return false
    return guesses.some((entry) => entry.guess.cca2 === target.cca2)
  }, [guesses, target])

  const dailyAlreadyCompleted = seedMode === 'daily' && dailyCompletedDate === challengeDate
  const inputLocked = isWon || didGiveUp || dailyAlreadyCompleted
  const guessedCodes = guesses.map((entry) => entry.guess.cca2)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DAILY_LOCK_KEY)
    if (stored) {
      setDailyCompletedDate(stored)
    }

    const storedResult = window.localStorage.getItem(DAILY_RESULT_KEY)
    if (!storedResult) return

    try {
      const parsed = JSON.parse(storedResult) as DailyGeodleResult
      if (parsed?.date && parsed?.targetName) {
        setDailyResult(parsed)
      }
    } catch {
      // Ignore malformed localStorage payloads.
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    loadCountries()
      .then((loadedCountries) => {
        if (cancelled) return
        setCountries(loadedCountries)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load countries'
        setError(message)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (countries.length === 0) return

    const progressKey = getProgressStorageKey(seedMode, challengeDate)

    if (typeof window !== 'undefined' && !dailyAlreadyCompleted) {
      const raw = window.localStorage.getItem(progressKey)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as GeodleProgressCache
          const restoredTarget = countries.find((country) => country.cca2 === parsed.targetCca2)

          if (restoredTarget) {
            const restoredGuesses = parsed.guessCodes
              .map((code) => countries.find((country) => country.cca2 === code))
              .filter((country): country is Country => Boolean(country))
              .map((country) => createGeodleGuess(country, restoredTarget))

            setTarget(restoredTarget)
            setGuesses(restoredGuesses)
            setDidGiveUp(false)
            setDidRecordResult(false)

            if (seedMode === 'unlimited' && parsed.seedOverride) {
              setSeedOverride(parsed.seedOverride)
            }

            return
          }
        } catch {
          // Ignore malformed cache payloads and start fresh below.
        }
      }
    }

    const seed =
      seedMode === 'daily'
        ? `daily:${challengeDate}`
        : seedOverride ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))

    const rng = makeRng('geodle', seed)
    const picked = pickGeodleTarget(countries, rng)
    setTarget(picked)
    setGuesses([])
    setDidGiveUp(false)
    setDidRecordResult(false)
  }, [challengeDate, countries, dailyAlreadyCompleted, seedMode, seedOverride])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const progressKey = getProgressStorageKey(seedMode, challengeDate)

    if (!target || isWon || didGiveUp || dailyAlreadyCompleted) {
      window.localStorage.removeItem(progressKey)
      return
    }

    const payload: GeodleProgressCache = {
      targetCca2: target.cca2,
      guessCodes: guesses.map((entry) => entry.guess.cca2),
      challengeDate,
      seedOverride,
    }

    window.localStorage.setItem(progressKey, JSON.stringify(payload))
  }, [challengeDate, dailyAlreadyCompleted, didGiveUp, guesses, isWon, seedMode, seedOverride, target])

  useEffect(() => {
    if (didRecordResult) return
    if (!isWon) return

    recordResult('geodle', true)
    setDidRecordResult(true)

    if (typeof window !== 'undefined') {
      const progressKey = getProgressStorageKey(seedMode, challengeDate)
      window.localStorage.removeItem(progressKey)
    }

    if (seedMode === 'daily' && typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_LOCK_KEY, challengeDate)
      setDailyCompletedDate(challengeDate)

      const result: DailyGeodleResult = {
        date: challengeDate,
        targetName: target?.name ?? 'Unknown',
        targetFlagEmoji: target?.flagEmoji ?? '',
        guessCount: Math.max(1, guesses.length),
        guesses: guesses.length > 0 ? guesses.map((item) => item.guess.name) : [target?.name ?? 'Unknown'],
        outcome: 'win',
      }
      window.localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result))
      setDailyResult(result)
    }
  }, [challengeDate, didRecordResult, guesses, isWon, recordResult, seedMode, target])

  useEffect(() => {
    if (didRecordResult) return
    if (!didGiveUp) return

    recordResult('geodle', false)
    setDidRecordResult(true)
  }, [didGiveUp, didRecordResult, recordResult])

  const handleGuess = (country: Country) => {
    if (!target || inputLocked) return
    if (guessedCodes.includes(country.cca2)) return

    const entry = createGeodleGuess(country, target)
    setGuesses((prev) => {
      const next = [...prev, entry]

      if (typeof window !== 'undefined') {
        const progressKey = getProgressStorageKey(seedMode, challengeDate)
        const payload: GeodleProgressCache = {
          targetCca2: target.cca2,
          guessCodes: next.map((item) => item.guess.cca2),
          challengeDate,
          seedOverride,
        }
        window.localStorage.setItem(progressKey, JSON.stringify(payload))
      }

      return next
    })
  }

  const playAgain = () => {
    if (typeof window !== 'undefined') {
      const progressKey = getProgressStorageKey(seedMode, challengeDate)
      window.localStorage.removeItem(progressKey)
    }

    if (seedMode === 'daily') {
      if (dailyAlreadyCompleted) return
      setGuesses([])
      setDidGiveUp(false)
      setDidRecordResult(false)
      return
    }

    const nextSeed = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    setDidGiveUp(false)
    setSeedOverride(nextSeed)
  }

  const giveUp = () => {
    if (!target || inputLocked) return

    if (typeof window !== 'undefined') {
      const progressKey = getProgressStorageKey(seedMode, challengeDate)
      window.localStorage.removeItem(progressKey)
    }

    setDidGiveUp(true)

    if (seedMode === 'daily' && typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_LOCK_KEY, challengeDate)
      setDailyCompletedDate(challengeDate)

      const result: DailyGeodleResult = {
        date: challengeDate,
        targetName: target.name,
        targetFlagEmoji: target.flagEmoji,
        guessCount: guesses.length,
        guesses: guesses.map((item) => item.guess.name),
        outcome: 'give-up',
      }
      window.localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result))
      setDailyResult(result)
    }
  }

  const resetDailyProgressForTesting = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DAILY_LOCK_KEY)
      window.localStorage.removeItem(DAILY_RESULT_KEY)
      window.localStorage.removeItem(getProgressStorageKey('daily', challengeDate))
      window.localStorage.removeItem(getProgressStorageKey('unlimited', challengeDate))
    }

    setDailyCompletedDate(null)
    setDailyResult(null)
    setGuesses([])
    setDidGiveUp(false)
    setDidRecordResult(false)
  }

  return (
    <GameShell
      title="Geodle"
      accent="var(--gv-geodle)"
      accentLight="var(--bg-base)"
      launchKey={`geodle-${seedMode}`}
      challengeScope="World"
      challengeDate={challengeDate}
      headerRight={
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSeedMode('daily')}
            className={`rounded-md border px-2 py-1 ${seedMode === 'daily' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setSeedMode('unlimited')}
            className={`rounded-md border px-2 py-1 ${seedMode === 'unlimited' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            Unlimited
          </button>
        </div>
      }
    >
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Guess the hidden country</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Data table feedback with directional hints.</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Progress is saved automatically until you press Give up.</p>

      {dailyAlreadyCompleted ? (
        <div className="gv-panel mt-4 p-5">
          <p className="gv-label">Daily challenge completed</p>
          {target?.flagUrl ? (
            <Image
              src={target.flagUrl}
              alt={`${target.name} flag`}
              width={72}
              height={48}
              className="mt-2 rounded-sm border border-[var(--border)]"
              unoptimized
            />
          ) : (
            <p className="mt-2 text-4xl leading-none">{dailyResult?.targetFlagEmoji || target?.flagEmoji || '🌍'}</p>
          )}
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{dailyResult?.targetName || target?.name || 'Solved'}</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Guesses used: {dailyResult?.guessCount ?? Math.max(1, guesses.length)}
          </p>
          {dailyResult?.outcome === 'give-up' ? (
            <p className="mt-1 text-sm text-[var(--accent-danger)]">Result: gave up</p>
          ) : (
            <p className="mt-1 text-sm text-[var(--accent)]">Result: solved</p>
          )}
          {(dailyResult?.guesses?.length ?? 0) > 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Guess path: {dailyResult?.guesses.join(' -> ')}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-[var(--text-muted)]">Switch to Unlimited to keep playing today.</p>
          <button
            type="button"
            onClick={resetDailyProgressForTesting}
            className="gv-btn-outline mt-3 px-3 py-1.5 text-xs"
          >
            Reset daily progress (testing)
          </button>
        </div>
      ) : null}

      <div className="mt-4">
        {isLoading ? <p className="text-sm text-[var(--text-muted)]">Loading countries...</p> : null}
        {error ? <p className="text-sm text-[var(--accent-danger)]">{error}</p> : null}
        {!isLoading && !error && !dailyAlreadyCompleted ? (
          <CountrySearch
            countries={countries}
            onSelect={handleGuess}
            exclude={guessedCodes}
            placeholder="Search by country name"
            accent="var(--gv-geodle)"
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Guesses: {guesses.length}</p>
        <div className="flex flex-wrap items-center gap-2">
          {!(seedMode === 'daily' && dailyAlreadyCompleted) ? (
            <>
              <button
                type="button"
                onClick={playAgain}
                className="gv-btn-outline px-3 py-1.5 text-xs"
              >
                Play again
              </button>
              <button
                type="button"
                onClick={giveUp}
                disabled={inputLocked || !target}
                className="rounded-md border border-[var(--accent-danger)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-danger)] disabled:opacity-50"
              >
                Give up
              </button>
            </>
          ) : null}
        </div>
      </div>

      {guesses.length > 0 ? (
        <div className="mt-4 space-y-2 md:hidden">
          {guesses.map((entry) => (
            <div key={entry.guess.cca2} className="gv-panel p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                <span className="inline-flex items-center gap-2">
                  {entry.guess.flagUrl ? (
                    <Image
                      src={entry.guess.flagUrl}
                      alt={`${entry.guess.name} flag`}
                      width={18}
                      height={12}
                      className="rounded-sm border border-[var(--border)]"
                      unoptimized
                    />
                  ) : (
                    <span>{entry.guess.flagEmoji || '🏳️'}</span>
                  )}
                  <span>{entry.guess.name}</span>
                </span>
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-[var(--border)] px-2 py-1">
                  <p className="text-[var(--text-muted)]">Continent</p>
                  <p className={entry.feedback.continentMatch ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>{geodleContinentLabel(entry.guess)}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] px-2 py-1">
                  <p className="text-[var(--text-muted)]">Neighbor</p>
                  <p className={entry.feedback.isNeighbor ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>{entry.feedback.isNeighbor ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] px-2 py-1">
                  <p className="text-[var(--text-muted)]">Temp</p>
                  <p className="gv-mono text-[var(--text-primary)]">{formatTemperature(entry.guess)} {directionLabel(entry.feedback.temperature)}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] px-2 py-1">
                  <p className="text-[var(--text-muted)]">Population</p>
                  <p className="gv-mono text-[var(--text-primary)]">{formatInteger(entry.guess.population)} {directionLabel(entry.feedback.population)}</p>
                </div>
                <div className="col-span-2 rounded-md border border-[var(--border)] px-2 py-1">
                  <p className="text-[var(--text-muted)]">Area</p>
                  <p className="gv-mono text-[var(--text-primary)]">{formatInteger(entry.guess.area)} km² {directionLabel(entry.feedback.area)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {guesses.length > 0 ? (
        <div className="mt-4 hidden overflow-x-auto rounded-md border border-[var(--border)] md:block">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)]">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Country</th>
                <th className="px-2 py-2 text-left font-medium">Continent</th>
                <th className="px-2 py-2 text-left font-medium">Landlocked</th>
                <th className="px-2 py-2 text-left font-medium">Neighbor</th>
                <th className="px-2 py-2 text-left font-medium">Temp</th>
                <th className="px-2 py-2 text-left font-medium">Population</th>
                <th className="px-2 py-2 text-left font-medium">Area</th>
              </tr>
            </thead>
            <tbody>
              {guesses.map((entry, idx) => (
                <tr key={entry.guess.cca2} className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)' }}>
                  <td className="px-2 py-2 text-[var(--text-primary)]">
                    <span className="inline-flex items-center gap-2">
                      {entry.guess.flagUrl ? (
                        <Image
                          src={entry.guess.flagUrl}
                          alt={`${entry.guess.name} flag`}
                          width={18}
                          height={12}
                          className="rounded-sm border border-[var(--border)]"
                          unoptimized
                        />
                      ) : (
                        <span>{entry.guess.flagEmoji || '🏳️'}</span>
                      )}
                      <span>{entry.guess.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded-md border px-2 py-1 text-xs ${entry.feedback.continentMatch ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border-bright)] text-[var(--text-muted)]'}`}>
                      {geodleContinentLabel(entry.guess)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-md border px-2 py-1 text-xs ${target?.landlocked ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border-bright)] text-[var(--text-muted)]'}`}
                    >
                      {target?.landlocked ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded-md border px-2 py-1 text-xs ${entry.feedback.isNeighbor ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border-bright)] text-[var(--text-muted)]'}`}>
                      {entry.feedback.isNeighbor ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="space-y-1">
                      <p className="gv-mono text-xs text-[var(--text-primary)]">{formatTemperature(entry.guess)}</p>
                      <span className={`gv-mono inline-flex min-w-14 items-center justify-center rounded-md border px-2 py-1 text-xs ${directionCellClass(entry.feedback.temperature, entry.feedback.temperatureClose)}`}>
                        {directionLabel(entry.feedback.temperature)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="space-y-1">
                      <p className="gv-mono text-xs text-[var(--text-primary)]">{formatInteger(entry.guess.population)}</p>
                      <span className={`gv-mono inline-flex min-w-14 items-center justify-center rounded-md border px-2 py-1 text-xs ${directionCellClass(entry.feedback.population, entry.feedback.populationClose)}`}>
                        {directionLabel(entry.feedback.population)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="space-y-1">
                      <p className="gv-mono text-xs text-[var(--text-primary)]">{formatInteger(entry.guess.area)} km²</p>
                      <span className={`gv-mono inline-flex min-w-14 items-center justify-center rounded-md border px-2 py-1 text-xs ${directionCellClass(entry.feedback.area, entry.feedback.areaClose)}`}>
                        {directionLabel(entry.feedback.area)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isWon ? <p className="mt-4 rounded-md border border-[var(--accent)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]">You solved it! The country was {target?.name}.</p> : null}
      {didGiveUp ? <p className="mt-4 rounded-md border border-[var(--accent-danger)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--accent-danger)]">You gave up. The country was {target?.name}.</p> : null}
    </GameShell>
  )
}
