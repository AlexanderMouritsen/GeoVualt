import type { Metadata } from 'next'
import { Lora } from 'next/font/google'
import Link from 'next/link'
import { BetaNoticeModal } from '@/components/BetaNoticeModal'
import './globals.css'

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
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
    <html lang="en" className={lora.variable}>
      <body>
        <BetaNoticeModal />
        <header className="border-b border-[var(--border)] bg-[var(--bg-base)]">
          <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-6 px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-[26px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">
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

            <div className="flex items-center gap-3 text-sm font-semibold">
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
