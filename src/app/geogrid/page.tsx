"use client"

import Image from 'next/image'
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
  const guessedLimitReached = !infiniteMode && guessesUsed >= MAX_GUESSES
  const filledCells = Object.keys(answers).length
  const isComplete = filledCells >= 9
  const isFinished = isComplete || guessedLimitReached
  const currentPoints = useMemo(() => {
    if (!puzzle) return 900
    return totalPointsForGrid(puzzle, answers, countries.length)
  }, [answers, countries.length, puzzle])

  useEffect(() => {
    if (!puzzle || didRecordResult || !isFinished) return

    recordResult('geogrid', isComplete)
    setDidRecordResult(true)
  }, [didRecordResult, isComplete, isFinished, puzzle, recordResult])

  const selectedCellValidCodes = useMemo(() => {
    if (!puzzle || !selectedCell) return []
    return puzzle.validByCell[selectedCell] ?? []
  }, [puzzle, selectedCell])

  const selectCountryForCell = (country: Country) => {
    if (!puzzle || !selectedCell || isFinished) return

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
    if (!selectedCell || isFinished) return
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
    <GameShell
      title="GeoGrid"
      accent="var(--gv-geogrid)"
      accentLight="var(--bg-base)"
      launchKey={`geogrid-${seedMode}`}
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
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Fill each cell with a valid country intersection</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Choose countries that satisfy both row and column criteria.</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Lower valid-pool percentage gives bigger point deduction for that cell.</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
        <p className="gv-mono">
          Guesses: {guessesUsed}
          {infiniteMode ? ' (infinite)' : ` / ${MAX_GUESSES}`}
        </p>
        <p className="gv-mono">Points: {currentPoints}</p>
        <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => setInfiniteMode(false)}
            className={`rounded px-2 py-1 text-xs ${!infiniteMode ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
          >
            10 guesses
          </button>
          <button
            type="button"
            onClick={() => setInfiniteMode(true)}
            className={`rounded px-2 py-1 text-xs ${infiniteMode ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
          >
            Unlimited
          </button>
        </div>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading countries...</p> : null}
      {error ? <p className="mt-4 rounded-md border border-[var(--accent-danger)] bg-transparent px-3 py-2 text-sm text-[var(--accent-danger)]">{error}</p> : null}

      {puzzle ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border bg-[var(--bg-surface)] px-2 py-2" style={{ borderColor: 'var(--border)' }} />
                {puzzle.cols.map((col, index) => (
                  <th
                    key={col.id}
                    className="border bg-[var(--bg-surface)] px-2 py-2 text-left text-sm font-semibold text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[var(--accent)]">C{index + 1}:</span> {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puzzle.rows.map((row, r) => (
                <tr key={row.id}>
                  <th
                    className="border bg-[var(--bg-surface)] px-2 py-2 text-left text-sm font-semibold text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[var(--accent)]">R{r + 1}:</span> {row.label}
                  </th>
                  {puzzle.cols.map((_, c) => {
                    const key = geogridCellKey(r, c)
                    const selected = selectedCell === key
                    const countryCode = answers[key]
                    const country = countryCode ? countryByCode.get(countryCode) : null
                    const validCount = (puzzle.validByCell[key] ?? []).length
                    const percent = cellPercent(validCount, countries.length)
                    const deduction = deductionFromPercent(percent)

                    return (
                      <td key={key} className="border p-1" style={{ borderColor: 'var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCell(key)}
                          className={`min-h-20 w-full rounded-md border px-2 py-2 text-left ${selected ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'}`}
                        >
                          {country ? (
                            <>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                <span className="inline-flex items-center gap-2">
                                  <Image
                                    src={country.flagUrl}
                                    alt={`${country.name} flag`}
                                    width={18}
                                    height={12}
                                    className="rounded-sm border border-[var(--border)]"
                                    unoptimized
                                  />
                                  <span>{country.name}</span>
                                </span>
                              </p>
                              <div className="mt-2 space-y-1">
                                <div className="h-1.5 w-full rounded bg-[var(--border)]">
                                  <div
                                    className="h-1.5 rounded bg-[var(--accent)]"
                                    style={{ width: `${Math.max(4, deduction)}%` }}
                                  />
                                </div>
                                <p className="gv-mono text-[10px] text-[var(--text-muted)]">Pool: {percent}% · Deducted: {deduction} pts</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Select country</p>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedCell && !isFinished ? (
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
        <button
          type="button"
          onClick={restart}
          className="gv-btn-outline px-3 py-1.5 text-xs"
        >
          Play again
        </button>
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
    </GameShell>
  )
}
