"use client"

import { useEffect, useMemo, useState } from 'react'

import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { loadCountries } from '@/lib/countries'
import { makeRng, shuffle } from '@/lib/game'
import {
  formatMetricValue,
  getMetricDefinition,
  METRIC_DEFINITIONS,
  type MetricCategory,
  type MetricDifficulty,
} from '@/lib/metrics'
import type { Country, MetricKey } from '@/types'

const TOTAL_ROUNDS = 8

interface GeoRankleRound {
  country: Country
  metrics: MetricKey[]
  bestMetric: MetricKey
}

interface RoundSelection {
  metric: MetricKey
  score: number
}

function randomSessionSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return String(Date.now())
}

function pickMetricsForCountry(country: Country, rng: () => number): MetricKey[] {
  const availableDefinitions = METRIC_DEFINITIONS.filter((definition) => country.rankings[definition.key] !== undefined)
  const easy = shuffle(availableDefinitions.filter((definition) => definition.difficulty === 'easy'), rng)
  const medium = shuffle(availableDefinitions.filter((definition) => definition.difficulty === 'medium'), rng)
  const hard = shuffle(availableDefinitions.filter((definition) => definition.difficulty === 'hard'), rng)

  if (easy.length === 0 || medium.length < 2) {
    return []
  }

  const desiredCount = 6 + Math.floor(rng() * 3)
  const selected: MetricKey[] = [easy[0].key, medium[0].key, medium[1].key]
  const categoryCounts = new Map<MetricCategory, number>()

  const incrementCategory = (key: MetricKey) => {
    const category = getMetricDefinition(key).category
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }

  incrementCategory(easy[0].key)
  incrementCategory(medium[0].key)
  incrementCategory(medium[1].key)

  const pool = shuffle(
    [...easy.slice(1), ...medium.slice(2), ...hard].map((item) => item.key),
    rng,
  )

  for (const key of pool) {
    if (selected.length >= desiredCount) break
    if (selected.includes(key)) continue

    const category = getMetricDefinition(key).category
    const used = categoryCounts.get(category) ?? 0
    if (used >= 2) continue

    selected.push(key)
    categoryCounts.set(category, used + 1)
  }

  if (selected.length < 6) {
    return []
  }

  const difficultyCounts = selected.reduce(
    (acc, key) => {
      const difficulty = getMetricDefinition(key).difficulty
      acc[difficulty] += 1
      return acc
    },
    { easy: 0, medium: 0, hard: 0 } as Record<MetricDifficulty, number>,
  )

  if (difficultyCounts.easy < 1 || difficultyCounts.medium < 2) {
    return []
  }

  return selected
}

function bestMetricForCountry(country: Country, metrics: MetricKey[]): MetricKey | null {
  const ranked = metrics
    .map((metric) => ({ metric, rank: country.rankings[metric] ?? 999 }))
    .sort((a, b) => a.rank - b.rank)

  if (ranked.length === 0 || ranked[0].rank === 999) {
    return null
  }

  return ranked[0].metric
}

function createRounds(countries: Country[], rng: () => number): GeoRankleRound[] {
  const pool = shuffle(
    countries.filter((country) => country.population > 100_000),
    rng,
  )

  const rounds: GeoRankleRound[] = []

  for (const country of pool) {
    if (rounds.length >= TOTAL_ROUNDS) break

    const metrics = pickMetricsForCountry(country, rng)
    if (metrics.length === 0) continue

    const bestMetric = bestMetricForCountry(country, metrics)
    if (!bestMetric) continue

    rounds.push({ country, metrics, bestMetric })
  }

  if (rounds.length < TOTAL_ROUNDS) {
    throw new Error('Unable to generate enough GeoRankle rounds with current dataset')
  }

  return rounds
}

export default function GeoRanklePage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [rounds, setRounds] = useState<GeoRankleRound[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [selections, setSelections] = useState<RoundSelection[]>([])
  const [seedMode, setSeedMode] = useState<'daily' | 'unlimited'>('daily')
  const [seedOverride, setSeedOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [didRecordResult, setDidRecordResult] = useState(false)

  const { recordResult } = useStats()

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
  }, [])

  useEffect(() => {
    if (countries.length === 0) return

    try {
      const seed = seedMode === 'daily' ? undefined : seedOverride ?? randomSessionSeed()
      const rng = makeRng('georankle', seed)
      const nextRounds = createRounds(countries, rng)
      setRounds(nextRounds)
      setRoundIndex(0)
      setSelections([])
      setDidRecordResult(false)
      setError(null)
    } catch (roundError: unknown) {
      const message = roundError instanceof Error ? roundError.message : 'Failed to create rounds'
      setError(message)
    }
  }, [countries, seedMode, seedOverride])

  const currentRound = rounds[roundIndex]
  const currentSelection = selections[roundIndex]
  const isFinished = rounds.length > 0 && roundIndex >= rounds.length
  const totalScore = selections.reduce((sum, selection) => sum + selection.score, 0)

  useEffect(() => {
    if (!isFinished || didRecordResult) return

    recordResult('georankle', true)
    setDidRecordResult(true)
  }, [didRecordResult, isFinished, recordResult])

  const pickMetric = (metric: MetricKey) => {
    if (!currentRound || currentSelection) return

    const score = currentRound.country.rankings[metric] ?? 999
    setSelections((prev) => {
      const next = [...prev]
      next[roundIndex] = { metric, score }
      return next
    })
  }

  const goNextRound = () => {
    if (!currentRound) return
    if (!currentSelection) return
    setRoundIndex((prev) => prev + 1)
  }

  const restartGame = () => {
    if (seedMode === 'daily') {
      setRoundIndex(0)
      setSelections([])
      return
    }

    setSeedOverride(randomSessionSeed())
  }

  return (
    <GameShell
      title="GeoRankle"
      accent="var(--gv-georankle)"
      accentLight="#EEEDFE"
      headerRight={
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSeedMode('daily')}
            className={`rounded-full border px-2 py-1 ${seedMode === 'daily' ? 'bg-violet-100 text-violet-700' : 'text-stone-600'}`}
            style={{ borderColor: 'var(--gv-border)' }}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setSeedMode('unlimited')}
            className={`rounded-full border px-2 py-1 ${seedMode === 'unlimited' ? 'bg-violet-100 text-violet-700' : 'text-stone-600'}`}
            style={{ borderColor: 'var(--gv-border)' }}
          >
            Unlimited
          </button>
        </div>
      }
    >
      <h2 className="text-lg font-semibold text-stone-800">Choose the country metric with the best global rank</h2>
      <p className="mt-1 text-sm text-stone-600">Lower total score is better. Rank 1 means best globally.</p>

      {isLoading ? <p className="mt-4 text-sm text-stone-500">Loading countries...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {!isLoading && !error && !isFinished && currentRound ? (
        <>
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-stone-700">Round {roundIndex + 1} of {rounds.length}</p>
            <p className="font-medium text-stone-800">Total score: {totalScore}</p>
          </div>

          <div className="mt-3 rounded-lg border bg-white px-4 py-3" style={{ borderColor: 'var(--gv-border)' }}>
            <p className="text-sm text-stone-600">Country</p>
            <p className="text-xl font-semibold text-stone-800">
              {currentRound.country.flagEmoji ? `${currentRound.country.flagEmoji} ` : ''}
              {currentRound.country.name}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {currentRound.metrics.map((metricKey) => {
              const definition = getMetricDefinition(metricKey)
              const rank = currentRound.country.rankings[metricKey] ?? 999
              const isChosen = currentSelection?.metric === metricKey
              const isBest = currentRound.bestMetric === metricKey

              let stateClass = 'border-stone-200'
              if (currentSelection) {
                if (isBest) stateClass = 'border-emerald-500 bg-emerald-50'
                else if (isChosen) stateClass = 'border-violet-500 bg-violet-50'
              }

              return (
                <button
                  key={metricKey}
                  type="button"
                  onClick={() => pickMetric(metricKey)}
                  disabled={Boolean(currentSelection)}
                  className={`rounded-lg border p-3 text-left ${stateClass} disabled:cursor-default`}
                >
                  <p className="text-xs uppercase tracking-wide text-stone-500">{definition.category} · {definition.difficulty}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-800">{definition.label}</p>
                  <p className="mt-1 text-sm text-stone-700">{formatMetricValue(currentRound.country, metricKey)}</p>

                  {currentSelection ? (
                    <p className="mt-2 text-xs font-medium text-stone-700">Global rank: #{rank}</p>
                  ) : null}
                </button>
              )
            })}
          </div>

          {currentSelection ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2" style={{ borderColor: 'var(--gv-border)' }}>
              <p className="text-sm text-stone-700">
                You chose <strong>{getMetricDefinition(currentSelection.metric).label}</strong> (rank #{currentSelection.score}).
              </p>
              <button
                type="button"
                onClick={goNextRound}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white"
              >
                {roundIndex + 1 >= rounds.length ? 'Finish' : 'Next round'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {!isLoading && !error && isFinished ? (
        <div className="mt-5 rounded-lg border bg-white p-4" style={{ borderColor: 'var(--gv-border)' }}>
          <h3 className="text-lg font-semibold text-stone-800">Game complete</h3>
          <p className="mt-1 text-sm text-stone-600">Final score: <strong>{totalScore}</strong> (lower is better).</p>
          <button
            type="button"
            onClick={restartGame}
            className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
          >
            Play again
          </button>
        </div>
      ) : null}
    </GameShell>
  )
}
