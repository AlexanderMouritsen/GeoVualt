"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { CountrySearch } from '@/components/game/CountrySearch'
import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { normalizeChallengeDate } from '@/lib/challenge'
import { loadCountries } from '@/lib/countries'
import { makeRng } from '@/lib/game'
import { generateValidGeoGrid, geogridCellKey, type GeoGridPuzzle } from '@/lib/gridCategories'
import type { Country } from '@/types'

const MAX_GUESSES = 10
const DAILY_LOCK_KEY = 'geovault-geogrid-daily-completed'

function randomSessionSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return String(Date.now())
}

function cellPercent(validCount: number, totalCountries: number): number {
  if (totalCountries <= 0) return 100
  const percent = (validCount / totalCountries) * 100
  return Math.max(1, Math.min(100, Math.round(percent)))
}

function deductionFromPercent(percent: number): number {
  return Math.max(0, Math.min(99, 100 - percent))
}

function totalPointsForGrid(
  puzzle: GeoGridPuzzle,
  answers: Record<string, string>,
  totalCountries: number,
): number {
  let total = 0
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const key = geogridCellKey(r, c)
      const answer = answers[key]
      if (!answer) {
        total += 100
        continue
      }

      const validCount = (puzzle.validByCell[key] ?? []).length
      total += cellPercent(validCount, totalCountries)
    }
  }
  return total
}

export default function GeoGridPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [puzzle, setPuzzle] = useState<GeoGridPuzzle | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [seedMode, setSeedMode] = useState<'daily' | 'unlimited'>('daily')
  const [seedOverride, setSeedOverride] = useState<string | null>(null)
  const [infiniteMode, setInfiniteMode] = useState(false)
  const [guessesUsed, setGuessesUsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [didRecordResult, setDidRecordResult] = useState(false)
  const [dailyCompletedDate, setDailyCompletedDate] = useState<string | null>(null)
  const [showDailyLockModal, setShowDailyLockModal] = useState(false)
  const [suppressDailyLockModal, setSuppressDailyLockModal] = useState(false)
  const [challengeDate, setChallengeDate] = useState(() => normalizeChallengeDate(null))

  const { recordResult } = useStats()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setChallengeDate(normalizeChallengeDate(params.get('day')))
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    loadCountries()
      .then((payload) => {
        if (cancelled) return
        setCountries(payload)
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

    try {
      const seed = seedMode === 'daily' ? `daily:${challengeDate}` : seedOverride ?? randomSessionSeed()
      const rng = makeRng('geogrid', seed)
      const nextPuzzle = generateValidGeoGrid(countries, rng, { maxAttempts: 800 })
      setPuzzle(nextPuzzle)
      setAnswers({})
      setSelectedCell(null)
      setGuessesUsed(0)
      setDidRecordResult(false)
      setError(null)
    } catch (puzzleError: unknown) {
      const message = puzzleError instanceof Error ? puzzleError.message : 'Failed to generate GeoGrid puzzle'
      setError(message)
    }
  }, [challengeDate, countries, seedMode, seedOverride])

  const usedCountryCodes = useMemo(() => Object.values(answers), [answers])
  const dailyAlreadyCompleted = seedMode === 'daily' && dailyCompletedDate === challengeDate
  const guessedLimitReached = !infiniteMode && guessesUsed >= MAX_GUESSES
  const filledCells = Object.keys(answers).length
  const isComplete = filledCells >= 9
  const isFinished = isComplete || guessedLimitReached
  const currentPoints = useMemo(() => {
    if (!puzzle) return 900
    return totalPointsForGrid(puzzle, answers, countries.length)
  }, [answers, countries.length, puzzle])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DAILY_LOCK_KEY)
    if (stored) {
      setDailyCompletedDate(stored)
    }
  }, [])

  useEffect(() => {
    setShowDailyLockModal(dailyAlreadyCompleted && !suppressDailyLockModal)
  }, [dailyAlreadyCompleted, suppressDailyLockModal])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!showDailyLockModal) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [showDailyLockModal])

  useEffect(() => {
    if (!puzzle || didRecordResult || !isFinished) return

    recordResult('geogrid', isComplete)
    if (seedMode === 'daily' && typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_LOCK_KEY, challengeDate)
      setDailyCompletedDate(challengeDate)
      setSuppressDailyLockModal(true)
    }
    setDidRecordResult(true)
  }, [challengeDate, didRecordResult, isComplete, isFinished, puzzle, recordResult, seedMode])

  const selectedCellValidCodes = useMemo(() => {
    if (!puzzle || !selectedCell) return []
    return puzzle.validByCell[selectedCell] ?? []
  }, [puzzle, selectedCell])

  const selectCountryForCell = (country: Country) => {
    if (!puzzle || !selectedCell || isFinished || dailyAlreadyCompleted) return

    const existing = answers[selectedCell]
    const isSameAsCurrent = existing === country.cca2
    if (isSameAsCurrent) return

    const alreadyUsedElsewhere = Object.entries(answers).some(
      ([cell, code]) => cell !== selectedCell && code === country.cca2,
    )
    if (alreadyUsedElsewhere) {
      setError(`${country.name} is already used on the grid`)
      return
    }

    const validCodes = puzzle.validByCell[selectedCell] ?? []
    if (!validCodes.includes(country.cca2)) {
      const [row, col] = selectedCell.split('-').map(Number)
      const rowCategory = puzzle.rows[row]
      const colCategory = puzzle.cols[col]
      const matchesRow = rowCategory?.validCountries.includes(country.cca2) ?? false
      const matchesCol = colCategory?.validCountries.includes(country.cca2) ?? false

      setGuessesUsed((prev) => prev + 1)
      if (!matchesRow && !matchesCol) {
        setError(`${country.name} does not match either criteria: ${rowCategory?.label ?? 'row'} + ${colCategory?.label ?? 'column'}`)
      } else if (!matchesRow) {
        setError(`${country.name} matches ${colCategory?.label ?? 'column'} but fails ${rowCategory?.label ?? 'row'}`)
      } else {
        setError(`${country.name} matches ${rowCategory?.label ?? 'row'} but fails ${colCategory?.label ?? 'column'}`)
      }
      return
    }

    setAnswers((prev) => ({ ...prev, [selectedCell]: country.cca2 }))
    setGuessesUsed((prev) => prev + 1)
    setSelectedCell(null)
    setError(null)
  }

  const clearCell = () => {
    if (!selectedCell || isFinished || dailyAlreadyCompleted) return
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[selectedCell]
      return next
    })
  }

  const restart = () => {
    if (seedMode === 'daily') {
      setAnswers({})
      setSelectedCell(null)
      setGuessesUsed(0)
      setDidRecordResult(false)
      setError(null)
      return
    }

    setSeedOverride(randomSessionSeed())
  }

  const countryByCode = useMemo(() => {
    const map = new Map<string, Country>()
    for (const country of countries) {
      map.set(country.cca2, country)
    }
    return map
  }, [countries])

  const selectedCellDetails = useMemo(() => {
    if (!selectedCell || !puzzle) return null
    const [row, col] = selectedCell.split('-').map(Number)
    const rowLabel = puzzle.rows[row]?.label
    const colLabel = puzzle.cols[col]?.label
    if (!rowLabel || !colLabel) return null
    return { rowLabel, colLabel }
  }, [puzzle, selectedCell])

  return (
    <>
      <div className="hidden sm:block">
        <GameShell
          title="Country Matrix"
          accent="var(--gv-geogrid)"
          accentLight="var(--bg-base)"
          launchKey={`geogrid-${seedMode}`}
          challengeScope="World"
          challengeDate={challengeDate}
          autoStart={dailyAlreadyCompleted}
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
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Fill each cell with a valid country intersection</h2>
      <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">Choose countries that satisfy both row and column criteria.</p>
      <p className="mt-1 text-[11px] sm:text-xs text-[var(--text-muted)]">Lower valid-pool percentage gives bigger point deduction for that cell.</p>

      <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[var(--text-muted)]">
        <p className="gv-mono text-[11px] sm:text-sm">
          Guesses: {guessesUsed}{infiniteMode ? ' (∞)' : ` / ${MAX_GUESSES}`}
        </p>
        <p className="gv-mono text-[11px] sm:text-sm">Points: {currentPoints}</p>
        <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] p-0.5">
          <button
            type="button"
            onClick={() => setInfiniteMode(false)}
            className={`rounded px-1.5 py-0.5 text-[11px] sm:text-xs ${!infiniteMode ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
          >
            10
          </button>
          <button
            type="button"
            onClick={() => setInfiniteMode(true)}
            className={`rounded px-1.5 py-0.5 text-[11px] sm:text-xs ${infiniteMode ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
          >
            ∞
          </button>
        </div>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading countries...</p> : null}
      {error ? <p className="mt-4 rounded-md border border-[var(--accent-danger)] bg-transparent px-3 py-2 text-sm text-[var(--accent-danger)]">{error}</p> : null}

      {puzzle ? (
        <div className="mt-4">
          {/* Layout with row labels on left, headers above, grid on right */}
          <div className="flex gap-2 sm:gap-3">
            {/* Left: Row labels - compact */}
            <div className="flex flex-col gap-2 sm:gap-3 flex-shrink-0">
              {/* Empty space for column headers */}
              <div className="h-10 sm:h-12" />
              {/* Row labels */}
              {puzzle.rows.map((row, r) => (
                <div
                  key={row.id}
                  className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-1.5 sm:px-2 py-1 sm:py-1.5 text-center min-w-[80px] sm:min-w-[100px]"
                >
                  <p className="text-[9px] sm:text-xs font-medium text-[var(--text-primary)]">
                    <span className="text-[var(--accent)] font-semibold text-[8px] sm:text-[10px] block">R{r + 1}</span>
                    <span className="text-[7px] sm:text-[9px] leading-tight line-clamp-3">{row.label}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Right: Column headers and grid */}
            <div className="flex-1 min-w-0">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
                {puzzle.cols.map((col, index) => (
                  <div
                    key={col.id}
                    className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 sm:px-3 py-1.5 sm:py-2 text-center"
                  >
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                      <span className="text-[var(--accent)] font-semibold text-[10px] sm:text-xs block">C{index + 1}</span>
                      <span className="text-[9px] sm:text-xs leading-tight line-clamp-2">
                        {col.label}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Grid of cells */}
              <div className="space-y-2 sm:space-y-3">
                {puzzle.rows.map((row, r) => (
                  <div key={row.id} className="grid grid-cols-3 gap-2 sm:gap-3">
                    {puzzle.cols.map((_, c) => {
                      const key = geogridCellKey(r, c)
                      const selected = selectedCell === key
                      const countryCode = answers[key]
                      const country = countryCode ? countryByCode.get(countryCode) : null
                      const validCount = (puzzle.validByCell[key] ?? []).length
                      const percent = cellPercent(validCount, countries.length)
                      const deduction = deductionFromPercent(percent)

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (dailyAlreadyCompleted || isFinished) return
                            setSelectedCell(key)
                          }}
                          className={`rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-3 text-left transition-all ${
                            selected
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50'
                          } ${isFinished || dailyAlreadyCompleted ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {country ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Image
                                  src={country.flagUrl}
                                  alt={`${country.name} flag`}
                                  width={14}
                                  height={10}
                                  className="rounded-sm border border-[var(--border)]"
                                  unoptimized
                                />
                                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-primary)] truncate flex-1">
                                  {country.name}
                                </p>
                              </div>
                              <div className="space-y-0.5">
                                <div className="h-1 w-full rounded-full bg-[var(--border)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[var(--accent)]"
                                    style={{ width: `${Math.max(4, deduction)}%` }}
                                  />
                                </div>
                                <p className="gv-mono text-[6px] sm:text-[9px] text-[var(--text-muted)]">
                                  {percent}%·{deduction}pts
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] text-center py-2">
                              Select
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCell && !isFinished && !dailyAlreadyCompleted ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="gv-panel w-full max-w-[720px] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Select country for cell {selectedCell}</p>
            {selectedCellDetails ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedCellDetails.rowLabel} + {selectedCellDetails.colLabel}</p>
            ) : null}
            <p className="mt-1 text-xs text-[var(--text-muted)]">Each country can only be used once.</p>

            <div className="mt-3">
              <CountrySearch
                countries={countries}
                onSelect={selectCountryForCell}
                exclude={usedCountryCodes}
                placeholder="Search countries"
                accent="var(--gv-geogrid)"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearCell}
                className="gv-btn-outline px-3 py-1.5 text-xs"
              >
                Clear selected cell
              </button>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <p className="gv-mono text-sm font-medium text-[var(--accent)]">Current points: {currentPoints}</p>
        {seedMode === 'unlimited' ? (
          <button
            type="button"
            onClick={restart}
            className="gv-btn-outline px-3 py-1.5 text-xs"
          >
            Play again
          </button>
        ) : null}
      </div>

      {isFinished ? (
        <div className="gv-panel mt-4 p-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Game finished</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">All cells submitted or guesses exhausted.</p>
          <p className="gv-mono mt-1 text-sm text-[var(--accent)]">Final points: {currentPoints}</p>
          {!infiniteMode && guessedLimitReached && !isComplete ? (
            <p className="mt-1 text-sm text-[var(--accent-danger)]">Guess limit reached before filling all 9 cells.</p>
          ) : null}
        </div>
      ) : null}

      {showDailyLockModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4">
          <div className="gv-panel relative w-full max-w-[520px] p-5 text-center">
            <button
              type="button"
              onClick={() => setShowDailyLockModal(false)}
              className="absolute right-3 top-3 rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
              aria-label="Close"
            >
              x
            </button>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Daily puzzle already solved</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">You already completed today&apos;s Country Matrix challenge.</p>
            <button
              type="button"
              onClick={() => {
                setSeedMode('unlimited')
                setShowDailyLockModal(false)
              }}
              className="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-base)]"
            >
              Switch to Unlimited
            </button>
          </div>
        </div>
      ) : null}
        </GameShell>
      </div>

      <div className="sm:hidden flex items-center justify-center min-h-screen px-4">
        <div className="gv-panel max-w-md p-6 text-center">
          <p className="gv-label">Country Matrix</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Not available on mobile</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Country Matrix requires a screen width of at least 640px (tablet or larger). Please visit on a tablet or desktop to play.</p>
          <p className="mt-4 text-xs text-[var(--text-muted)] italic">We&apos;re working on optimizing this for mobile and plan to roll out a fix as soon as possible.</p>
          <Link href="/" className="mt-5 inline-block w-full gv-btn-outline px-4 py-2 rounded-md text-sm font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    </>
  )
}
