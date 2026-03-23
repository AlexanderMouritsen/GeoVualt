"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { normalizeChallengeDate } from '@/lib/challenge'
import { loadCountries } from '@/lib/countries'
import { comparableTemperature, makeRng, shuffle } from '@/lib/game'
import {
  getMetricDefinition,
  METRIC_DEFINITIONS,
} from '@/lib/metrics'
import type { Country, MetricKey } from '@/types'

const TOTAL_ROUNDS = 8
const MIN_ROUNDS = 4
const AUTO_ADVANCE_MS = 800

// Metrics with insufficient coverage for reliable gameplay
const LOW_COVERAGE_METRICS: MetricKey[] = [
	'co2EmissionsPerCapita',
	'incarcerationRatePer100k',
	'happinessScore',
	'literacyRatePercent',
	'oilProductionBarrelsPerDay',
	'goldReservesTonnes',
	'avgTemperatureCelsius',
]

function dailyLockKey(scope: 'world' | 'europe'): string {
  return `geovault-georankle-daily-completed:${scope}`
}

function gameStateKey(scope: 'world' | 'europe', challengeDate: string): string {
  return `geovault-georankle-game-state:${scope}:${challengeDate}`
}

interface SavedGeoRankleState {
  metricPool: MetricKey[]
  selections: RoundSelection[]
}

function saveGameState(scope: 'world' | 'europe', challengeDate: string, state: SavedGeoRankleState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(gameStateKey(scope, challengeDate), JSON.stringify(state))
}

function loadGameState(scope: 'world' | 'europe', challengeDate: string): SavedGeoRankleState | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(gameStateKey(scope, challengeDate))
  if (!raw) return null

  try {
    return JSON.parse(raw) as SavedGeoRankleState
  } catch {
    return null
  }
}

interface GeoRankleRound {
  country: Country
}

interface RoundSelection {
  metric: MetricKey
  rank: number
  points: number
}

interface GeoRankleGameProps {
  scope: 'world' | 'europe'
}

const METRIC_ICON: Partial<Record<MetricKey, string>> = {
  population: '👥',
  area: '🗺️',
  gdpUsd: '💵',
  gdpPerCapitaUsd: '🧾',
  lifeExpectancy: '🩺',
  humanDevelopmentIndex: '📈',
  avgTemperatureCelsius: '🌡️',
  forestAreaPercent: '🌲',
  co2EmissionsPerCapita: '🌫️',
  renewableEnergyPercent: '⚡',
  internetUsersPercent: '📱',
  literacyRatePercent: '📚',
  incarcerationRatePer100k: '🔒',
  happinessScore: '🙂',
  tourismArrivals: '✈️',
  oilProductionBarrelsPerDay: '🛢️',
  goldReservesTonnes: '🪙',
  militaryExpenditureGdpPercent: '🪖',
}

function randomSessionSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return String(Date.now())
}

function rankToPoints(rank: number): number {
  if (rank < 1 || rank > 100) return 0
  return 101 - rank
}

function formatRank(rank: number | null | undefined): string {
  if (!rank || rank > 100) return '#100+'
  return `#${rank}`
}

function rankForMetric(
  country: Country,
  metric: MetricKey,
  temperatureRanksByCca2: Map<string, number>,
  scopeRankingsByCca2: Map<string, Partial<Record<MetricKey, number>>>,
): number {
  // Use scope-specific ranking if available
  const scopeRanks = scopeRankingsByCca2.get(country.cca2)
  if (scopeRanks && typeof scopeRanks[metric] === 'number') {
    return scopeRanks[metric]
  }
  
  // Temperature uses the pre-computed temperature ranks
  if (metric === 'avgTemperatureCelsius') {
    return temperatureRanksByCca2.get(country.cca2) ?? 999
  }
  
  return 999
}

function pickMetricPool(countries: Country[], rng: () => number): MetricKey[] {
  const candidates = METRIC_DEFINITIONS
    .map((definition) => ({
      key: definition.key,
      coverage: countries.filter((country) => country.rankings[definition.key] !== undefined).length,
      difficulty: definition.difficulty,
    }))
    .filter((item) => item.coverage >= MIN_ROUNDS)
    .filter((item) => !LOW_COVERAGE_METRICS.includes(item.key))

  if (candidates.length < TOTAL_ROUNDS) {
    throw new Error('Not enough metrics with usable coverage to build a full GeoRankle game')
  }

  const easy = shuffle(candidates.filter((item) => item.difficulty === 'easy'), rng)
  const medium = shuffle(candidates.filter((item) => item.difficulty === 'medium'), rng)
  const rest = shuffle(
    candidates
      .slice()
      .sort((a, b) => b.coverage - a.coverage)
      .map((item) => item.key),
    rng,
  )

  const selected: MetricKey[] = []
  if (easy.length > 0) selected.push(easy[0].key)
  if (medium.length > 0 && !selected.includes(medium[0].key)) selected.push(medium[0].key)

  for (const key of rest) {
    if (selected.length >= TOTAL_ROUNDS) break
    if (selected.includes(key)) continue
    selected.push(key)
  }

  if (selected.length < TOTAL_ROUNDS) {
    throw new Error('Unable to build an 8-metric GeoRankle pool')
  }

  return selected.slice(0, TOTAL_ROUNDS)
}

function bestMetricForCountry(
  country: Country,
  metrics: MetricKey[],
  scopeRankingsByCca2: Map<string, Partial<Record<MetricKey, number>>>,
): MetricKey | null {
  const scopeRanks = scopeRankingsByCca2.get(country.cca2) ?? {}
  const ranked = metrics
    .map((metric) => ({ metric, rank: scopeRanks[metric] ?? country.rankings[metric] ?? 999 }))
    .sort((a, b) => a.rank - b.rank)

  if (ranked.length === 0 || ranked[0].rank === 999) {
    return null
  }

  return ranked[0].metric
}

function createRounds(countries: Country[], metricPool: MetricKey[], rng: () => number): GeoRankleRound[] {
  const pool = shuffle(
    countries.filter((country) => {
      if (country.population <= 100_000) return false
      const covered = metricPool.reduce((count, metric) => count + (country.rankings[metric] !== undefined ? 1 : 0), 0)
      return covered >= 4
    }),
    rng,
  )

  const rounds: GeoRankleRound[] = []

  for (const country of pool) {
    if (rounds.length >= TOTAL_ROUNDS) break
    rounds.push({ country })
  }

  if (rounds.length < MIN_ROUNDS) {
    throw new Error('Unable to generate enough GeoRankle rounds with current dataset')
  }

  return rounds
}

export function GeoRankleGame({ scope }: GeoRankleGameProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [metricPool, setMetricPool] = useState<MetricKey[]>([])
  const [rounds, setRounds] = useState<GeoRankleRound[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [selections, setSelections] = useState<RoundSelection[]>([])
  const [seedMode, setSeedMode] = useState<'daily' | 'unlimited'>('daily')
  const [seedOverride, setSeedOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [didRecordResult, setDidRecordResult] = useState(false)
  const [dailyCompletedDate, setDailyCompletedDate] = useState<string | null>(null)
  const [showDailyLockModal, setShowDailyLockModal] = useState(false)
  const [challengeDate, setChallengeDate] = useState(() => normalizeChallengeDate(null))

  const { recordResult } = useStats()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setChallengeDate(normalizeChallengeDate(params.get('day')))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(dailyLockKey(scope))
    setDailyCompletedDate(stored)
  }, [scope])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    loadCountries()
      .then((payload) => {
        if (cancelled) return
        const filtered = scope === 'europe' ? payload.filter((country) => country.region === 'Europe') : payload
        setCountries(filtered)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load countries data'
        setError(message)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scope])

  useEffect(() => {
    if (countries.length === 0) return

    try {
      const seed = seedMode === 'daily' ? `daily:${challengeDate}` : seedOverride ?? randomSessionSeed()
      const scopedSeed = scope === 'europe' ? `europe:${seed}` : seed
      const rng = makeRng('georankle', scopedSeed)
      const nextMetricPool = pickMetricPool(countries, rng)
      const nextRounds = createRounds(countries, nextMetricPool, rng)
      setMetricPool(nextMetricPool)
      setRounds(nextRounds)
      setRoundIndex(0)
      setSelections([])
      setDidRecordResult(false)
      setError(null)
    } catch (roundError: unknown) {
      const message = roundError instanceof Error ? roundError.message : 'Failed to create rounds'
      setError(message)
    }
  }, [challengeDate, countries, scope, seedMode, seedOverride])

  const currentRound = rounds[roundIndex]
  const currentSelection = selections[roundIndex]
  const dailyAlreadyCompleted = seedMode === 'daily' && dailyCompletedDate === challengeDate
  const isFinished = rounds.length > 0 && roundIndex >= rounds.length
  const answeredRounds = selections.length
  const totalScore = selections.reduce((sum, selection) => sum + selection.points, 0)
  const temperatureRanksByCca2 = useMemo(() => {
    const sorted = countries
      .map((country) => ({ country, temp: comparableTemperature(country) }))
      .filter((item) => item.temp !== null)
      .sort((a, b) => (b.temp as number) - (a.temp as number))

    return new Map(sorted.map((item, index) => [item.country.cca2, index + 1]))
  }, [countries])

  // Compute scope-specific rankings for all metrics
  const scopeRankingsByCca2 = useMemo(() => {
    const rankMap = new Map<string, Partial<Record<MetricKey, number>>>()

    // For each metric in the metric definitions, compute scope-specific ranks
    for (const definition of METRIC_DEFINITIONS) {
      const metricKey = definition.key as MetricKey
      
      // Filter countries that have non-null values for this metric
      const withValues = countries
        .filter((country) => {
          const value = country[metricKey]
          return value !== null && value !== undefined
        })
        .sort((a, b) => {
          // Sort descending (highest value = best rank = #1)
          const aVal = (a[metricKey] ?? 0) as number
          const bVal = (b[metricKey] ?? 0) as number
          return bVal - aVal
        })

      // Assign 1-based ranks
      for (let i = 0; i < withValues.length; i++) {
        const country = withValues[i]
        const existing = rankMap.get(country.cca2) ?? {}
        existing[metricKey] = i + 1
        rankMap.set(country.cca2, existing)
      }
    }

    return rankMap
  }, [countries])
  const usedMetrics = new Set(selections.map((selection) => selection.metric))
  const previousSelectionsByMetric = new Map<MetricKey, { roundIndex: number; rank: number }>()
  selections.slice(0, roundIndex).forEach((selection, idx) => {
    previousSelectionsByMetric.set(selection.metric, { roundIndex: idx, rank: selection.rank })
  })

  useEffect(() => {
    if (!currentSelection || isFinished) return
    const timer = setTimeout(() => {
      setRoundIndex((prev) => prev + 1)
    }, AUTO_ADVANCE_MS)

    return () => clearTimeout(timer)
  }, [currentSelection, isFinished])

  useEffect(() => {
    if (!isFinished || didRecordResult) return

    recordResult('georankle', true)
    if (seedMode === 'daily' && typeof window !== 'undefined') {
      window.localStorage.setItem(dailyLockKey(scope), challengeDate)
      saveGameState(scope, challengeDate, {
        metricPool,
        selections,
      })
      setDailyCompletedDate(challengeDate)
    }
    setDidRecordResult(true)
  }, [challengeDate, didRecordResult, isFinished, metricPool, recordResult, scope, seedMode, selections])

  useEffect(() => {
    if (!dailyAlreadyCompleted || rounds.length === 0) return

    const saved = loadGameState(scope, challengeDate)
    if (saved?.selections?.length) {
      setSelections(saved.selections)
    }

    if (saved?.metricPool?.length === metricPool.length && saved.metricPool.length > 0) {
      setMetricPool(saved.metricPool)
    }

    setRoundIndex(rounds.length)
  }, [challengeDate, dailyAlreadyCompleted, metricPool.length, rounds.length, scope])

  useEffect(() => {
    setShowDailyLockModal(dailyAlreadyCompleted)
  }, [dailyAlreadyCompleted])

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

  const pickMetric = (metric: MetricKey) => {
    if (dailyAlreadyCompleted || !currentRound || currentSelection || isFinished) return
    if (usedMetrics.has(metric)) return

    const rank = rankForMetric(currentRound.country, metric, temperatureRanksByCca2, scopeRankingsByCca2)
    const points = rankToPoints(rank)
    setSelections((prev) => {
      const next = [...prev]
      next[roundIndex] = { metric, rank, points }
      return next
    })
  }

  const restartGame = () => {
    if (seedMode === 'daily') {
      setRoundIndex(0)
      setSelections([])
      return
    }

    setSeedOverride(randomSessionSeed())
  }

  const isEurope = scope === 'europe'
  const scopeLabel = isEurope ? 'Europe' : 'World'

  const finishedSummary = useMemo(() => {
    const usedBeforeRound = new Set<MetricKey>()

    return rounds.map((round, idx) => {
      const availableAtRound = metricPool.filter((metric) => !usedBeforeRound.has(metric))
      const bestMetric = bestMetricForCountry(round.country, availableAtRound, scopeRankingsByCca2)
      const picked = selections[idx]

      if (picked?.metric) {
        usedBeforeRound.add(picked.metric)
      }

      // Use scope-specific rank if available, otherwise use global rank
      let bestRank: number | null = null
      if (bestMetric) {
        const scopeRanks = scopeRankingsByCca2.get(round.country.cca2)
        bestRank = scopeRanks?.[bestMetric] ?? round.country.rankings[bestMetric] ?? 999
      }

      return {
        key: `${round.country.cca2}-${idx}`,
        country: round.country,
        pickedMetric: picked?.metric,
        pickedRank: picked?.rank,
        pickedPoints: picked?.points,
        bestMetric,
        bestRank,
      }
    })
  }, [metricPool, rounds, selections, scopeRankingsByCca2])

  return (
    <GameShell
      title={isEurope ? 'Country Rank Europe' : 'Country Rank'}
      accent="var(--gv-georankle)"
      accentLight="var(--bg-base)"
      launchKey={`${scope}-${seedMode}-${challengeDate}`}
      challengeScope={scopeLabel}
      challengeDate={challengeDate}
      autoStart={dailyAlreadyCompleted}
      headerRight={
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5">
            <p className="gv-label">Region</p>
            <div className="mt-1 flex items-center gap-1">
              <Link
                href="/country-rank"
                className={`rounded-md border px-2 py-1 ${!isEurope ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
              >
                World
              </Link>
              <Link
                href="/country-rank-europe"
                className={`rounded-md border px-2 py-1 ${isEurope ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
              >
                Europe
              </Link>
            </div>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5">
            <p className="gv-label">Mode</p>
            <div className="mt-1 flex items-center gap-1">
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
          </div>
        </div>
      }
    >
      {isLoading ? <p className="text-sm text-[var(--text-muted)]">Loading countries...</p> : null}
      {error ? <p className="rounded-md border border-[var(--accent-danger)] bg-transparent px-3 py-2 text-sm text-[var(--accent-danger)]">{error}</p> : null}

      {!isLoading && !error && !isFinished && currentRound ? (
        <section className="space-y-4">
          <div className="gv-panel gv-mono mx-auto inline-flex items-center gap-4 px-5 py-2 text-sm text-[var(--text-primary)]">
            <span>{roundIndex + 1} / {rounds.length}</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span>{answeredRounds} answered</span>
            <span className="text-[var(--accent)]">{totalScore} pts</span>
          </div>

          <div className="mx-auto max-w-[560px] rounded-md bg-[var(--bg-surface)] p-2 text-center">
            <div className="relative mx-auto h-[180px] w-full max-w-[420px] overflow-hidden rounded-md border border-[var(--accent)]">
              <Image
                src={currentRound.country.flagUrl}
                alt={`${currentRound.country.name} flag`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.01em] text-[var(--text-primary)]">{currentRound.country.name}</h2>
          </div>

          <div className="mx-auto w-full max-w-[760px] space-y-2">
            {metricPool.map((metricKey) => {
              const definition = getMetricDefinition(metricKey)
              const isChosen = currentSelection?.metric === metricKey
              const previousPick = previousSelectionsByMetric.get(metricKey)
              const rank = rankForMetric(currentRound.country, metricKey, temperatureRanksByCca2, scopeRankingsByCca2)
              const icon = METRIC_ICON[metricKey] ?? '📌'
              const isLocked = Boolean(previousPick)
              const isDisabled = Boolean(currentSelection) || isLocked

              return (
                <button
                  key={metricKey}
                  type="button"
                  onClick={() => pickMetric(metricKey)}
                  disabled={isDisabled}
                  className={`w-full rounded-md border px-4 py-3 text-left transition ${isChosen ? 'bg-[var(--bg-elevated)]' : isLocked ? 'bg-[var(--bg-base)]' : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'} disabled:cursor-default`}
                  style={{ borderColor: isChosen ? 'var(--accent)' : 'var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-3 text-xl font-semibold text-[var(--text-primary)]">
                      <span className="text-lg">{icon}</span>
                      <span>{definition.label}</span>
                    </p>
                    {isChosen ? (
                      <p className="gv-mono text-lg font-semibold text-[var(--accent)]">
                        <span className="inline-flex items-center gap-2">
                          <Image
                            src={currentRound.country.flagUrl}
                            alt={`${currentRound.country.name} flag`}
                            width={18}
                            height={12}
                            className="rounded-sm border border-[var(--border)]"
                            unoptimized
                          />
                          <span>{formatRank(rank)}</span>
                        </span>
                      </p>
                    ) : previousPick ? (
                      <p className="gv-mono text-lg font-semibold text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-2">
                          <Image
                            src={rounds[previousPick.roundIndex]?.country.flagUrl ?? currentRound.country.flagUrl}
                            alt="Flag"
                            width={18}
                            height={12}
                            className="rounded-sm border border-[var(--border)]"
                            unoptimized
                          />
                          <span>{formatRank(previousPick.rank)}</span>
                        </span>
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {!isLoading && !error && isFinished ? (
        <section className="space-y-5 text-center">
          <p className="gv-label">GeoRankle results</p>
          <h3 className="text-4xl font-bold text-[var(--text-primary)]">Challenge complete</h3>

          <div className="gv-panel mx-auto p-4">
            <p className="gv-label">Total points</p>
            <p className="gv-mono mt-1 text-4xl font-bold text-[var(--accent)]">{totalScore}</p>
          </div>

          <div className="mx-auto w-full max-w-[760px] space-y-2 text-left">
            {finishedSummary.map((item) => (
              <div
                key={item.key}
                className="gv-panel px-3 py-2"
              >
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  <span className="inline-flex items-center gap-2">
                    <Image
                      src={item.country.flagUrl}
                      alt={`${item.country.name} flag`}
                      width={18}
                      height={12}
                      className="rounded-sm border border-[var(--border)]"
                      unoptimized
                    />
                    <span>{item.country.name}</span>
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Picked: {item.pickedMetric ? getMetricDefinition(item.pickedMetric).label : 'N/A'} ({formatRank(item.pickedRank)} · {item.pickedPoints ?? 0} pts) · Best: {item.bestMetric ? getMetricDefinition(item.bestMetric).label : 'N/A'} ({formatRank(item.bestRank)})
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center px-4">
            {seedMode === 'unlimited' ? (
              <button
                type="button"
                onClick={restartGame}
                className="w-full max-w-[520px] rounded-md bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg-base)]"
              >
                Play again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSeedMode('unlimited')}
                className="w-full max-w-[520px] rounded-md bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg-base)]"
              >
                Switch to Unlimited
              </button>
            )}
          </div>
        </section>
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
            <p className="mt-1 text-sm text-[var(--text-muted)]">You already completed today&apos;s {isEurope ? 'GeoRankle Europe' : 'GeoRankle'} challenge.</p>
            <button
              type="button"
              onClick={() => {
                setSeedMode('unlimited')
                setShowDailyLockModal(false)
              }}
              className="mt-4 w-full rounded-md bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg-base)]"
            >
              Switch to Unlimited
            </button>
          </div>
        </div>
      ) : null}
    </GameShell>
  )
}
