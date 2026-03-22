"use client"

import Link from 'next/link'

import { useStats } from '@/hooks/useStats'
import type { GameMode } from '@/types'

export default function Home() {
  const { stats, summary, isReady } = useStats()

  const modes = [
    {
      href: '/country-rank',
      mode: 'georankle' as GameMode,
      name: 'Country Rank',
      description: 'Pick the metric where a country ranks highest globally.',
      color: 'var(--gv-georankle)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 18h16" />
          <path d="M7 15l3-3 3 2 4-5" />
          <circle cx="7" cy="15" r="1" />
          <circle cx="10" cy="12" r="1" />
          <circle cx="13" cy="14" r="1" />
          <circle cx="17" cy="9" r="1" />
        </svg>
      ),
    },
    {
      href: '/hidden-country',
      mode: 'geodle' as GameMode,
      name: 'Border Hunt',
      description: 'Find the hidden country with unlimited tries and structured feedback.',
      color: 'var(--gv-geodle)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 6v12" />
          <path d="M6 12h12" />
        </svg>
      ),
    },
    {
      href: '/nation-match',
      mode: 'geoconnections' as GameMode,
      name: 'Nation Links',
      description: 'Solve sets of tiles that belong to the same country.',
      color: 'var(--gv-geoconnections)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M7 7h4v4H7z" />
          <path d="M13 7h4v4h-4z" />
          <path d="M7 13h4v4H7z" />
          <path d="M13 13h4v4h-4z" />
        </svg>
      ),
    },
    {
      href: '/country-matrix',
      mode: 'geogrid' as GameMode,
      name: 'Country Matrix',
      description: 'Fill a 3x3 category matrix with rare and valid countries.',
      color: 'var(--gv-geogrid)',
      status: 'Bonus',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4h16v16H4z" />
          <path d="M4 10h16" />
          <path d="M4 16h16" />
          <path d="M10 4v16" />
          <path d="M16 4v16" />
        </svg>
      ),
    },
  ]

  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-6 py-8">
      <section className="mx-auto max-w-[1320px]">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)] md:text-3xl">Daily Games</h1>
        <p className="mt-2 gv-mono text-xs text-[var(--text-muted)]">challenge seed :: {today}</p>

        <div className="gv-rule mt-5" />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {modes.map((mode) => (
            <Link
              key={mode.name}
              href={mode.href}
              className="gv-daily-card relative overflow-hidden"
            >
              <div className="absolute ml-[-20px] mt-[-20px] h-full w-1" style={{ backgroundColor: mode.color }} />
              <div className="flex items-start justify-between">
                <div className="text-[var(--text-muted)]">{mode.icon}</div>
                <p className="gv-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent-gold)]">{mode.status}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{mode.name}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{mode.description}</p>
              </div>
            </Link>
          ))}
        </div>

      </section>

      <section className="mt-6 gv-sticker-card p-5">
        <h2 className="gv-label">Stats summary</h2>
        {!isReady ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Loading stats...</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="gv-panel px-3 py-2">
              <p className="text-xs text-[var(--text-muted)]">Total games</p>
              <p className="gv-mono text-2xl font-semibold text-[var(--accent)]">{summary.totalGamesPlayed}</p>
            </div>
            <div className="gv-panel px-3 py-2">
              <p className="text-xs text-[var(--text-muted)]">Best streak</p>
              <p className="gv-mono text-2xl font-semibold text-[var(--accent-gold)]">{summary.bestStreak}</p>
            </div>
            <div className="gv-panel px-3 py-2">
              <p className="text-xs text-[var(--text-muted)]">Win rate</p>
              <p className="gv-mono text-2xl font-semibold text-[var(--accent)]">{summary.winRate.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 gv-sticker-card p-5">
        <h2 className="gv-label">Per-mode stats</h2>
        <ul className="mt-3 space-y-2">
          {modes.map((mode) => {
            const item = stats[mode.mode]
            const winRate = item.gamesPlayed > 0 ? (item.gamesWon / item.gamesPlayed) * 100 : 0

            return (
              <li
                key={mode.mode}
                className="gv-panel flex items-center justify-between px-3 py-2"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">{mode.name}</p>
                <p className="gv-mono text-sm text-[var(--text-muted)]">
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
