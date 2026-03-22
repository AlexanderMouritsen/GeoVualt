import Link from 'next/link'

import { challengeDateFromNumber, getChallengeNumber, getTodayIso } from '@/lib/challenge'

const MAX_ROWS = 30

const gameLinks = [
  { href: '/hidden-country', name: 'Border Hunt' },
  { href: '/country-rank', name: 'Country Rank (World)' },
  { href: '/country-rank-europe', name: 'Country Rank (Europe)' },
  { href: '/nation-match', name: 'Nation Links' },
  { href: '/country-matrix', name: 'Country Matrix' },
]

export default function HistoryPage() {
  const today = getTodayIso()
  const latestChallenge = getChallengeNumber(today)
  const rows = Array.from({ length: Math.min(MAX_ROWS, latestChallenge) }, (_, index) => {
    const challengeNumber = latestChallenge - index
    const day = challengeDateFromNumber(challengeNumber)
    return { challengeNumber, day }
  })

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1100px] px-6 py-8">
      <section className="gv-sticker-card p-6">
        <p className="gv-label">Challenge archive</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Play Previous Daily Challenges</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Pick any past challenge date and replay the same deterministic puzzle for each game.</p>

        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.challengeNumber}
              className="gv-panel p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="gv-mono text-base font-semibold text-[var(--accent)]">Challenge #{row.challengeNumber}</p>
                <p className="gv-mono text-sm text-[var(--text-muted)]">{row.day}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {gameLinks.map((game) => (
                  <Link
                    key={`${row.challengeNumber}-${game.href}`}
                    href={`${game.href}?day=${row.day}`}
                    className="gv-btn-outline px-3 py-1.5 text-xs"
                  >
                    {game.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
