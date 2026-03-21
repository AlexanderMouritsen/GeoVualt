"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { getChallengeNumber, getTodayIso, normalizeChallengeDate } from '@/lib/challenge'

interface GameShellProps {
  title: string
  accent: string
  accentLight: string
  children: ReactNode
  headerRight?: ReactNode
  launchKey?: string
  challengeScope?: string
  challengeDate?: string
}

export function GameShell({
  title,
  accent,
  accentLight,
  children,
  headerRight,
  launchKey,
  challengeScope = 'World',
  challengeDate,
}: GameShellProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const effectiveChallengeDate = useMemo(
    () => normalizeChallengeDate(challengeDate ?? getTodayIso()),
    [challengeDate],
  )
  const challengeNumber = useMemo(() => getChallengeNumber(effectiveChallengeDate), [effectiveChallengeDate])

  useEffect(() => {
    setHasStarted(false)
  }, [launchKey])

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-6 py-7">
      <section className="gv-panel">
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />

        <header className="gv-rule flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="gv-btn-outline inline-flex size-9 items-center justify-center text-sm font-bold"
              aria-label="Back to home"
            >
              {'<'}
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
              <p className="gv-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: accent }}>
                Daily and unlimited replay enabled
              </p>
            </div>
          </div>

          {headerRight ? <div>{headerRight}</div> : null}
        </header>

        <div className="p-5" style={{ backgroundColor: 'var(--bg-base)' }}>
          <div className="gv-panel p-4">
            {!hasStarted ? (
              <section className="mx-auto max-w-[560px] rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center">
                <p className="gv-label">{challengeScope} daily challenge</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
                <p className="gv-mono mt-3 text-sm text-[var(--text-muted)]">
                  Challenge #{challengeNumber} · {effectiveChallengeDate}
                </p>
                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  className="mt-5 rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[var(--bg-base)]"
                >
                  Play challenge
                </button>
              </section>
            ) : (
              children
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
