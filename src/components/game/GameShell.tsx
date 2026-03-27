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
  autoStart?: boolean
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
  autoStart = false,
}: GameShellProps) {
  const [hasStarted, setHasStarted] = useState(() => Boolean(autoStart))
  const effectiveChallengeDate = useMemo(
    () => normalizeChallengeDate(challengeDate ?? getTodayIso()),
    [challengeDate],
  )
  const challengeNumber = useMemo(() => getChallengeNumber(effectiveChallengeDate), [effectiveChallengeDate])

  useEffect(() => {
    setHasStarted(Boolean(autoStart))
  }, [autoStart, launchKey])

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-4 sm:px-6 py-4 sm:py-6 bg-[var(--bg-base)]">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />

      <header className="border-b border-[var(--border)] flex items-center justify-between gap-4 px-0 py-4 mb-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="gv-btn-outline inline-flex size-9 items-center justify-center text-sm font-bold"
            aria-label="Back to home"
          >
            {'<'}
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text-primary)]">{title}</h1>
            <p className="gv-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: accent }}>
              Daily and unlimited replay enabled
            </p>
          </div>
        </div>
      </header>

      {headerRight ? (
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-0 py-3 mb-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {headerRight}
          </div>
        </div>
      ) : null}

      <div className="bg-[var(--bg-surface)] rounded-lg">
        {!hasStarted ? (
          <section className="px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-[560px] rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center">
              <p className="gv-label">{challengeScope} daily challenge</p>
              <h2 className="mt-2 text-xl font-extrabold text-[var(--text-primary)]">{title}</h2>
              <p className="gv-mono mt-2.5 text-[13px] text-[var(--text-muted)]">
                Challenge #{challengeNumber} · {effectiveChallengeDate}
              </p>
              <button
                type="button"
                onClick={() => setHasStarted(true)}
                className="mt-5 rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[var(--bg-base)]"
              >
                Play challenge
              </button>
            </div>
          </section>
        ) : (
          <div className="px-4 sm:px-6 py-6">
            {children}
          </div>
        )}
      </div>
    </main>
  )
}
