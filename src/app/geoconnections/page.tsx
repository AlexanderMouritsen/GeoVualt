"use client"

import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import countriesIso from 'i18n-iso-countries'
import enIsoLocale from 'i18n-iso-countries/langs/en.json'
import Image from 'next/image'
import worldAtlasCountries110m from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import { useEffect, useMemo, useState } from 'react'

import { GameShell } from '@/components/game/GameShell'
import { useStats } from '@/hooks/useStats'
import { normalizeChallengeDate } from '@/lib/challenge'
import { loadCountries } from '@/lib/countries'
import { makeRng, shuffle } from '@/lib/game'
import type { Country } from '@/types'

type TileKind = 'name' | 'flag' | 'shape' | 'stat'

interface GeoConnectionsTile {
  id: string
  countryCode: string
  countryName: string
  countryFlagUrl: string
  countryFlagEmoji: string
  kind: TileKind
  label: string
}

interface SolvedCardColor {
  bg: string
  text: string
}

const MAX_MISTAKES = 4
// Set to false to instantly disable the new solve animation behavior.
const ENABLE_GROUP_ANIMATION = true
const GROUP_ANIMATION_MS = 1050
const SOLVED_CARD_COLORS: SolvedCardColor[] = [
  { bg: '#f4b5c7', text: '#1f1022' },
  { bg: '#a7d8ff', text: '#0f1c2b' },
  { bg: '#b9e6b3', text: '#142312' },
  { bg: '#f6d7a8', text: '#2c1908' },
]

countriesIso.registerLocale(enIsoLocale)

function hashCountryCode(code: string): number {
  let hash = 0
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  }
  return hash
}

function fallbackOutlinePathForCountry(code: string): string {
  const hash = hashCountryCode(code)
  const points: Array<[number, number]> = []
  const pointCount = 8

  for (let i = 0; i < pointCount; i += 1) {
    const angle = (Math.PI * 2 * i) / pointCount
    const radialNoise = 0.75 + (((hash >> (i * 3)) & 7) / 7) * 0.45
    const x = 23 + Math.cos(angle) * 14 * radialNoise
    const y = 17 + Math.sin(angle) * 10 * radialNoise
    points.push([Number(x.toFixed(1)), Number(y.toFixed(1))])
  }

  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z'
}

function numericCandidatesFromCca2(cca2: string): string[] {
  const alpha2 = cca2.toUpperCase()
  const alpha3 = countriesIso.alpha2ToAlpha3(alpha2)
  const numeric = alpha3 ? countriesIso.alpha3ToNumeric(alpha3) : undefined

  if (!numeric) return []
  const normalized = String(numeric)
  const noLeadingZero = String(Number(normalized))
  return Array.from(new Set([normalized, noLeadingZero]))
}

function buildOutlinePathsByCca2(countries: Country[]): Map<string, string> {
  const worldTopology = worldAtlasCountries110m as any
  const worldFeaturesRaw = feature(worldTopology, worldTopology.objects.countries) as Feature<Geometry, GeoJsonProperties> | FeatureCollection<Geometry, GeoJsonProperties>
  const features = 'features' in worldFeaturesRaw ? worldFeaturesRaw.features : [worldFeaturesRaw]

  const geometryById = new Map<string, unknown>()
  for (const item of features) {
    if (item.id === undefined || item.id === null) continue
    geometryById.set(String(item.id), item.geometry)
  }

  const result = new Map<string, string>()

  for (const country of countries) {
    const numericCandidates = numericCandidatesFromCca2(country.cca2)
    let geometry: unknown | null = null

    for (const candidate of numericCandidates) {
      const found = geometryById.get(candidate)
      if (found) {
        geometry = found
        break
      }
    }

    if (!geometry) continue

    const projection = geoMercator().fitSize([42, 30], geometry as never)
    const pathBuilder = geoPath(projection)
    const path = pathBuilder(geometry as never)
    if (path) {
      result.set(country.cca2, path)
    }
  }

  return result
}

function randomSessionSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return String(Date.now())
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${Math.round(value)}`
}

function statLabelForCountry(country: Country, rng: () => number): string {
  const stats = [
    `Population: ${formatCompact(country.population)}`,
    `Area: ${Math.round(country.area).toLocaleString()} km²`,
    country.gdpUsd !== null ? `GDP: $${Math.round(country.gdpUsd).toLocaleString()}` : null,
    country.lifeExpectancy !== null ? `Life expectancy: ${country.lifeExpectancy.toFixed(1)} years` : null,
  ].filter(Boolean) as string[]

  if (stats.length === 0) {
    return `Region: ${country.region || 'Unknown'}`
  }

  return stats[Math.floor(rng() * stats.length)]
}

function buildPuzzleTiles(countries: Country[], rng: () => number): GeoConnectionsTile[] {
  const eligible = countries.filter((country) => country.population > 500_000 && Boolean(country.flagUrl))
  const selectedCountries = shuffle(eligible, rng).slice(0, 4)

  if (selectedCountries.length < 4) {
    throw new Error('Not enough eligible countries to build GeoConnections puzzle')
  }

  const tiles: GeoConnectionsTile[] = []

  for (const country of selectedCountries) {
    const statText = statLabelForCountry(country, rng)
    const base = {
      countryCode: country.cca2,
      countryName: country.name,
      countryFlagUrl: country.flagUrl,
      countryFlagEmoji: country.flagEmoji,
    }

    tiles.push(
      {
        id: `${country.cca2}-name`,
        kind: 'name',
        label: country.name,
        ...base,
      },
      {
        id: `${country.cca2}-flag`,
        kind: 'flag',
        label: 'Flag',
        ...base,
      },
      {
        id: `${country.cca2}-shape`,
        kind: 'shape',
        label: `${country.flagEmoji || '🌍'} Shape`,
        ...base,
      },
      {
        id: `${country.cca2}-stat`,
        kind: 'stat',
        label: statText,
        ...base,
      },
    )
  }

  return shuffle(tiles, rng)
}

export default function GeoConnectionsPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [tiles, setTiles] = useState<GeoConnectionsTile[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [solvedCodes, setSolvedCodes] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [seedMode, setSeedMode] = useState<'daily' | 'unlimited'>('daily')
  const [seedOverride, setSeedOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [didRecordResult, setDidRecordResult] = useState(false)
  const [challengeDate, setChallengeDate] = useState(() => normalizeChallengeDate(null))
  const [animatingGroupCode, setAnimatingGroupCode] = useState<string | null>(null)
  const [animatingTileIds, setAnimatingTileIds] = useState<string[]>([])
  const [solvedCardColorByCode, setSolvedCardColorByCode] = useState<Record<string, SolvedCardColor>>({})

  const outlinePathByCca2 = useMemo(() => buildOutlinePathsByCca2(countries), [countries])

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
      const rng = makeRng('geoconnections', seed)
      const nextTiles = buildPuzzleTiles(countries, rng)
      const countryCodes = Array.from(new Set(nextTiles.map((tile) => tile.countryCode)))
      const shuffledColors = shuffle(SOLVED_CARD_COLORS, rng)
      const nextColorByCode: Record<string, SolvedCardColor> = {}

      countryCodes.forEach((code, index) => {
        nextColorByCode[code] = shuffledColors[index % shuffledColors.length]
      })

      setTiles(nextTiles)
      setSolvedCardColorByCode(nextColorByCode)
      setSelected([])
      setSolvedCodes([])
      setMistakes(0)
      setDidRecordResult(false)
      setError(null)
    } catch (buildError: unknown) {
      const message = buildError instanceof Error ? buildError.message : 'Failed to build puzzle'
      setError(message)
    }
  }, [challengeDate, countries, seedMode, seedOverride])

  const solvedTiles = useMemo(
    () => tiles.filter((tile) => solvedCodes.includes(tile.countryCode)),
    [solvedCodes, tiles],
  )

  const unsolvedTiles = useMemo(
    () => tiles.filter((tile) => !solvedCodes.includes(tile.countryCode)),
    [solvedCodes, tiles],
  )

  const solvedCountryGroups = useMemo(() => {
    return solvedCodes
      .map((countryCode) => {
        const group = solvedTiles.filter((tile) => tile.countryCode === countryCode)
        return [countryCode, group] as const
      })
      .filter(([, group]) => group.length > 0)
  }, [solvedCodes, solvedTiles])

  const isWon = solvedCodes.length >= 4
  const isLost = mistakes >= MAX_MISTAKES && !isWon
  const isAnimatingSolve = ENABLE_GROUP_ANIMATION && Boolean(animatingGroupCode)

  useEffect(() => {
    if (didRecordResult) return
    if (!isWon && !isLost) return

    recordResult('geoconnections', isWon)
    setDidRecordResult(true)
  }, [didRecordResult, isLost, isWon, recordResult])

  const toggleTile = (tileId: string) => {
    if (isWon || isLost || isAnimatingSolve) return

    setSelected((prev) => {
      if (prev.includes(tileId)) {
        return prev.filter((id) => id !== tileId)
      }

      if (prev.length >= 4) {
        return prev
      }

      return [...prev, tileId]
    })
  }

  const submitSelection = () => {
    if (selected.length !== 4 || isWon || isLost || isAnimatingSolve) return

    const selectedTiles = tiles.filter((tile) => selected.includes(tile.id))
    const codes = new Set(selectedTiles.map((tile) => tile.countryCode))

    if (codes.size === 1) {
      const countryCode = selectedTiles[0]?.countryCode
      if (countryCode) {
        if (ENABLE_GROUP_ANIMATION) {
          setAnimatingGroupCode(countryCode)
          setAnimatingTileIds(selected)
          window.setTimeout(() => {
            setSolvedCodes((prev) => (prev.includes(countryCode) ? prev : [...prev, countryCode]))
            setAnimatingGroupCode(null)
            setAnimatingTileIds([])
            setSelected([])
          }, GROUP_ANIMATION_MS)
          return
        }

        setSolvedCodes((prev) => (prev.includes(countryCode) ? prev : [...prev, countryCode]))
      }
    } else {
      setMistakes((prev) => prev + 1)
    }

    setSelected([])
  }

  const restart = () => {
    if (seedMode === 'daily') {
      setSelected([])
      setSolvedCodes([])
      setMistakes(0)
      setDidRecordResult(false)
      return
    }

    setSeedOverride(randomSessionSeed())
  }

  return (
    <GameShell
      title="GeoConnections"
      accent="var(--gv-geoconnections)"
      accentLight="var(--bg-base)"
      launchKey={`geoconnections-${seedMode}`}
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
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Find groups of 4 tiles from the same country</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Select exactly 4 tiles and submit. You get up to {MAX_MISTAKES} mistakes.</p>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="gv-mono text-[var(--text-muted)]">Solved groups: {solvedCodes.length} / 4</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISTAKES }).map((_, index) => (
            <span
              key={index}
              className={`inline-block size-2 rounded-full ${index < mistakes ? 'bg-[var(--accent-danger)]' : 'bg-[var(--border)]'}`}
            />
          ))}
        </div>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading countries...</p> : null}
      {error ? <p className="mt-4 rounded-md border border-[var(--accent-danger)] bg-transparent px-3 py-2 text-sm text-[var(--accent-danger)]">{error}</p> : null}

      {solvedCountryGroups.length > 0 ? (
        <div className="mt-4 space-y-2">
          {solvedCountryGroups.map(([countryCode, group]) => {
            const first = group[0]
            const cardColor = solvedCardColorByCode[countryCode] ?? SOLVED_CARD_COLORS[0]
            const detailParts = group
              .map((tile) => {
                if (tile.kind === 'flag') return 'Flag'
                if (tile.kind === 'name') return 'Country'
                if (tile.kind === 'shape') return 'Shape'
                return tile.label
              })
              .sort((a, b) => a.localeCompare(b))
            return (
              <div
                key={countryCode}
                className="rounded-[16px] border-[3px] border-black px-4 py-3 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.35)]"
                style={{
                  backgroundColor: cardColor.bg,
                }}
              >
                <p className="text-[32px] leading-none">{first?.countryFlagEmoji || '🏳️'}</p>
                <p className="mt-1 text-[34px] font-extrabold uppercase tracking-[0.03em]" style={{ color: cardColor.text }}>{first?.countryName}</p>
                <p className="mt-1 text-xl italic" style={{ color: cardColor.text }}>{detailParts.join(', ')}</p>
              </div>
            )
          })}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {unsolvedTiles.map((tile) => {
            const isSelected = selected.includes(tile.id)
            const isAnimatingTile = animatingTileIds.includes(tile.id)
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => toggleTile(tile.id)}
                disabled={isAnimatingSolve}
                className={`min-h-20 rounded-md border p-2 text-sm text-[var(--text-primary)] transition ${isSelected ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'} ${isAnimatingTile ? 'gc-tile-fly' : ''}`}
              >
                {tile.kind === 'flag' ? (
                  <div className="flex h-full items-center justify-center">
                    <Image
                      src={tile.countryFlagUrl}
                      alt={`${tile.countryName} flag`}
                      width={44}
                      height={28}
                      className="rounded"
                      unoptimized
                    />
                  </div>
                ) : tile.kind === 'shape' ? (
                  <div className="flex h-full items-center justify-center">
                    <svg width="46" height="34" viewBox="0 0 46 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path
                        d={outlinePathByCca2.get(tile.countryCode) ?? fallbackOutlinePathForCountry(tile.countryCode)}
                        fill="none"
                        stroke="#0FF0B3"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <span>{tile.label}</span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="gv-mono text-sm text-[var(--text-muted)]">Selected: {selected.length} / 4</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected([])}
            className="gv-btn-outline px-3 py-1.5 text-xs"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={submitSelection}
            disabled={selected.length !== 4 || isWon || isLost || isAnimatingSolve}
            className="gv-btn-outline px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={restart}
            className="gv-btn-outline px-3 py-1.5 text-xs"
          >
            Play again
          </button>
        </div>
      </div>

      {isWon ? (
        <p className="mt-4 rounded-md border border-[var(--accent)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]">Puzzle solved. You found all 4 country groups.</p>
      ) : null}
      {isLost ? (
        <p className="mt-4 rounded-md border border-[var(--accent-danger)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--accent-danger)]">Out of mistakes. Try again with a new puzzle.</p>
      ) : null}

      <style jsx global>{`
        .gc-tile-fly {
          animation: gc-pop-fly ${GROUP_ANIMATION_MS}ms cubic-bezier(0.22, 0.8, 0.2, 1) forwards;
          transform-origin: center;
          z-index: 10;
        }

        @keyframes gc-pop-fly {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          18% {
            transform: translateY(-8px) scale(1.02);
            opacity: 1;
          }
          32% {
            transform: translateY(3px) scale(0.99);
            opacity: 1;
          }
          50% {
            transform: translateY(-10px) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateY(-180px) scale(0.92);
            opacity: 0;
          }
        }
      `}</style>
    </GameShell>
  )
}
