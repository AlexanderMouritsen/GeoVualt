"use client"

import Link from 'next/link'

import { useStats } from '@/hooks/useStats'
import type { GameMode } from '@/types'

export default function Home() {
  const { stats, summary, isReady } = useStats()

  const modes = [
    {
      href: '/geodle',
      mode: 'geodle' as GameMode,
      name: 'Geodle',
      description: 'Guess the mystery country in 6 tries with structured feedback.',
      accent: 'var(--gv-geodle)',
      status: 'Polished',
    },
    {
      href: '/georankle',
      mode: 'georankle' as GameMode,
      name: 'GeoRankle',
      description: 'Pick the metric where a country ranks highest globally.',
      accent: 'var(--gv-georankle)',
      status: 'Polished',
    },
    {
      href: '/geoconnections',
      mode: 'geoconnections' as GameMode,
      name: 'GeoConnections',
      description: 'Solve groups of tiles that belong to the same country.',
      accent: 'var(--gv-geoconnections)',
      status: 'Beta',
    },
    {
      href: '/geogrid',
      mode: 'geogrid' as GameMode,
      name: 'GeoGrid',
      description: 'Fill a 3x3 category grid with rare and valid countries.',
      accent: 'var(--gv-geogrid)',
      status: 'Beta',
    },
  ]

  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="mx-auto min-h-screen w-full max-w-[880px] px-6 py-10">
      <section className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--gv-border)' }}>
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="size-9 rounded-full border"
            style={{ borderColor: 'var(--gv-primary)', backgroundColor: '#e1f5ee' }}
          />
          <h1 className="text-2xl font-semibold text-stone-800">GeoVault</h1>
        </div>
        <p className="mt-2 text-stone-600">Unlock the world, one game at a time.</p>
        <p className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs text-stone-700" style={{ borderColor: 'var(--gv-border)' }}>
          Daily challenge active · {today}
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => (
          <Link
            key={mode.name}
            href={mode.href}
            className="rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5"
            style={{ borderColor: 'var(--gv-border)' }}
          >
            <div className="mb-3 h-[3px] w-full rounded" style={{ backgroundColor: mode.accent }} />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-800">{mode.name}</h2>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">{mode.status}</span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{mode.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--gv-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Stats summary</h2>
        {!isReady ? (
          <p className="mt-2 text-sm text-stone-500">Loading stats...</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-stone-50 px-3 py-2">
              <p className="text-xs text-stone-500">Total games</p>
              <p className="text-lg font-semibold text-stone-800">{summary.totalGamesPlayed}</p>
            </div>
            <div className="rounded-lg bg-stone-50 px-3 py-2">
              <p className="text-xs text-stone-500">Best streak</p>
              <p className="text-lg font-semibold text-stone-800">{summary.bestStreak}</p>
            </div>
            <div className="rounded-lg bg-stone-50 px-3 py-2">
              <p className="text-xs text-stone-500">Win rate</p>
              <p className="text-lg font-semibold text-stone-800">{summary.winRate.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--gv-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Per-mode stats</h2>
        <ul className="mt-3 space-y-2">
          {modes.map((mode) => {
            const item = stats[mode.mode]
            const winRate = item.gamesPlayed > 0 ? (item.gamesWon / item.gamesPlayed) * 100 : 0

            return (
              <li
                key={mode.mode}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--gv-border)' }}
              >
                <p className="text-sm font-medium text-stone-700">{mode.name}</p>
                <p className="text-sm text-stone-600">
                  {item.gamesPlayed} played · {winRate.toFixed(1)}% win
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
