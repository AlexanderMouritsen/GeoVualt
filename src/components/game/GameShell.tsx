import Link from 'next/link'
import type { ReactNode } from 'react'

interface GameShellProps {
  title: string
  accent: string
  accentLight: string
  children: ReactNode
  headerRight?: ReactNode
}

export function GameShell({ title, accent, accentLight, children, headerRight }: GameShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[880px] px-6 py-8">
      <section className="rounded-2xl border bg-white" style={{ borderColor: 'var(--gv-border)' }}>
        <div className="h-[3px] w-full rounded-t-2xl" style={{ backgroundColor: accent }} />

        <header className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--gv-border)' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex size-8 items-center justify-center rounded-full border text-sm text-stone-600"
              style={{ borderColor: 'var(--gv-border)' }}
              aria-label="Back to home"
            >
              {'<'}
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-stone-800">{title}</h1>
              <p className="text-xs text-stone-600" style={{ color: accent }}>
                Daily and unlimited replay enabled
              </p>
            </div>
          </div>

          {headerRight ? <div>{headerRight}</div> : null}
        </header>

        <div className="p-5" style={{ backgroundColor: accentLight }}>
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--gv-border)' }}>
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
