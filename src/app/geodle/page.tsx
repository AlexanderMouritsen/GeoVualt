"use client"

import { useEffect, useMemo, useState } from 'react'

import { CountrySearch } from '@/components/game/CountrySearch'
import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { loadCountries } from '@/lib/countries'
import { createGeodleGuess, makeRng, pickGeodleTarget } from '@/lib/game'
import type { Country, GeodleDirection, GeodleGuess } from '@/types'

const MAX_GUESSES = 6

function directionLabel(direction: GeodleDirection): string {
  if (direction === 'higher') return '↑'
  if (direction === 'lower') return '↓'
  if (direction === 'exact') return '✓'
  return '?'
}

function directionCellClass(direction: GeodleDirection, isClose: boolean): string {
  if (direction === 'exact') return 'bg-emerald-100 text-emerald-700'
  if (isClose) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
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

  const { recordResult } = useStats()

  const isWon = useMemo(() => {
    if (!target) return false
    return guesses.some((entry) => entry.guess.cca2 === target.cca2)
  }, [guesses, target])

  const isLost = !isWon && guesses.length >= MAX_GUESSES
  const guessedCodes = guesses.map((entry) => entry.guess.cca2)

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

    const seed =
      seedMode === 'daily'
        ? undefined
        : seedOverride ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))

    const rng = makeRng('geodle', seed)
    const picked = pickGeodleTarget(countries, rng)
    setTarget(picked)
    setGuesses([])
    setDidRecordResult(false)
  }, [countries, seedMode, seedOverride])

  useEffect(() => {
    if (didRecordResult) return
    if (!isWon && !isLost) return

    recordResult('geodle', isWon)
    setDidRecordResult(true)
  }, [didRecordResult, isLost, isWon, recordResult])

  const handleGuess = (country: Country) => {
    if (!target || isWon || isLost) return
    if (guessedCodes.includes(country.cca2)) return

    const entry = createGeodleGuess(country, target)
    setGuesses((prev) => [...prev, entry])
  }

  const playAgain = () => {
    if (seedMode === 'daily') {
      setGuesses([])
      return
    }

    const nextSeed = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    setSeedOverride(nextSeed)
  }

  return (
    <GameShell
      title="Geodle"
      accent="var(--gv-geodle)"
      accentLight="#E1F5EE"
      headerRight={
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSeedMode('daily')}
            className={`rounded-full border px-2 py-1 ${seedMode === 'daily' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600'}`}
            style={{ borderColor: 'var(--gv-border)' }}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setSeedMode('unlimited')}
            className={`rounded-full border px-2 py-1 ${seedMode === 'unlimited' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600'}`}
            style={{ borderColor: 'var(--gv-border)' }}
          >
            Unlimited
          </button>
        </div>
      }
    >
      <h2 className="text-lg font-semibold text-stone-800">Guess the hidden country in 6 tries</h2>
      <p className="mt-1 text-sm text-stone-600">Feedback uses region, landlocked status, borders, temperature, population, and area.</p>

      <div className="mt-4">
        {isLoading ? <p className="text-sm text-stone-500">Loading countries...</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {!isLoading && !error ? (
          <CountrySearch
            countries={countries}
            onSelect={handleGuess}
            exclude={guessedCodes}
            placeholder="Search by country name"
            accent="var(--gv-geodle)"
          />
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-700">
        <p>
          Guesses: {guesses.length} / {MAX_GUESSES}
        </p>
        <button
          type="button"
          onClick={playAgain}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: 'var(--gv-border)' }}
        >
          Play again
        </button>
      </div>

      {guesses.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--gv-border)' }}>
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-stone-50 text-stone-600">
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
              {guesses.map((entry) => (
                <tr key={entry.guess.cca2} className="border-t" style={{ borderColor: 'var(--gv-border)' }}>
                  <td className="px-2 py-2 text-stone-800">
                    {entry.guess.flagEmoji ? `${entry.guess.flagEmoji} ` : ''}
                    {entry.guess.name}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${entry.feedback.continentMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {entry.feedback.continentMatch ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${entry.feedback.landlockedMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {entry.feedback.landlockedMatch ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${entry.feedback.isNeighbor ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {entry.feedback.isNeighbor ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${directionCellClass(entry.feedback.temperature, entry.feedback.temperatureClose)}`}>
                      {directionLabel(entry.feedback.temperature)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${directionCellClass(entry.feedback.population, entry.feedback.populationClose)}`}>
                      {directionLabel(entry.feedback.population)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-2 py-1 text-xs ${directionCellClass(entry.feedback.area, entry.feedback.areaClose)}`}>
                      {directionLabel(entry.feedback.area)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isWon ? <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">You solved it! The country was {target?.name}.</p> : null}
      {isLost && target ? (
        <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">No guesses left. The target country was {target.name}.</p>
      ) : null}
    </GameShell>
  )
}
