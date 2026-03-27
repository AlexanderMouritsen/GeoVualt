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
      bg: 'var(--gv-georankle-bg)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      bg: 'var(--gv-geodle-bg)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      bg: 'var(--gv-geoconnections-bg)',
      status: 'Daily',
      icon: (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      bg: 'var(--gv-geogrid-bg)',
      status: 'Bonus',
      icon: (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    <main className="mx-auto min-h-screen w-full max-w-[1400px] overflow-x-hidden px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-[1320px]">
        <h1 className="text-xl font-bold tracking-[-0.01em] text-[var(--text-primary)] md:text-2xl">Daily Games</h1>
        <p className="mt-1 gv-mono text-[11px] text-[var(--text-muted)]">challenge seed :: {today}</p>

        <div className="gv-rule mt-4" />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {modes.map((mode) => (
            <Link
              key={mode.name}
              href={mode.href}
              className="gv-daily-card relative overflow-hidden"
              style={{ backgroundColor: mode.bg }}
            >
              <div className="absolute left-0 top-0 h-full w-2" style={{ backgroundColor: mode.color }} />
              <div className="flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/75" style={{ color: mode.color }}>
                  {mode.icon}
                </div>
                <p className="gv-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{mode.status}</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-[var(--text-primary)]">{mode.name}</p>
                <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">{mode.description}</p>
              </div>
            </Link>
          ))}
        </div>

      </section>

      <section className="mt-5 gv-sticker-card p-4">
        <h2 className="gv-label">Stats summary</h2>
        {!isReady ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Loading stats...</p>
        ) : (
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
            <div className="gv-panel px-3 py-2">
              <p className="text-[11px] text-[var(--text-muted)]">Total games</p>
              <p className="gv-mono text-xl font-semibold text-[var(--accent)]">{summary.totalGamesPlayed}</p>
            </div>
            <div className="gv-panel px-3 py-2">
              <p className="text-[11px] text-[var(--text-muted)]">Best streak</p>
              <p className="gv-mono text-xl font-semibold text-[var(--accent-gold)]">{summary.bestStreak}</p>
            </div>
            <div className="gv-panel px-3 py-2">
              <p className="text-[11px] text-[var(--text-muted)]">Win rate</p>
              <p className="gv-mono text-xl font-semibold text-[var(--accent)]">{summary.winRate.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-3 gv-sticker-card p-4">
        <h2 className="gv-label">Per-mode stats</h2>
        <ul className="mt-2.5 space-y-2">
          {modes.map((mode) => {
            const item = stats[mode.mode]
            const winRate = item.gamesPlayed > 0 ? (item.gamesWon / item.gamesPlayed) * 100 : 0

            return (
              <li
                key={mode.mode}
                className="gv-panel flex items-center justify-between px-3 py-2"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{mode.name}</p>
                <p className="gv-mono text-[13px] text-[var(--text-muted)]">
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
