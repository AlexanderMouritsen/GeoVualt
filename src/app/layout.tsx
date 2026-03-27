import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import Link from 'next/link'
import { BetaNoticeModal } from '@/components/BetaNoticeModal'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-ui',
})

export const metadata: Metadata = {
  title: 'GeoVault',
  description: 'Unlock the world, one game at a time.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} overflow-x-hidden`}>
      <body className="overflow-x-hidden">
        <BetaNoticeModal />
        <Analytics />
        <header className="border-b border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-sm">
          <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-lg sm:text-[20px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                GEOVAULT
              </Link>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              <Link href="/country-rank" className="gv-nav-link">Country Rank</Link>
              <Link href="/hidden-country" className="gv-nav-link">Border Hunt</Link>
              <Link href="/nation-match" className="gv-nav-link">Nation Links</Link>
              <Link href="/country-matrix" className="gv-nav-link">Country Matrix</Link>
              <Link href="/history" className="gv-nav-link">History</Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
              <span className="hidden md:inline text-[var(--text-muted)]">English</span>
              <span className="hidden md:inline text-[var(--text-muted)]">|</span>
              <Link href="/report-bug" className="gv-nav-link text-xs">
                Report Bug
              </Link>
              <Link href="/account" className="gv-btn-outline px-4 py-2 text-sm">
                Account
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
