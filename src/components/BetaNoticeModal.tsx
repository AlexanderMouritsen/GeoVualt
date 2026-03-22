'use client'

import { useEffect, useState } from 'react'

export function BetaNoticeModal() {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="gv-panel relative w-full max-w-[600px] p-6 text-center">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-3 top-3 rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
          aria-label="Close"
        >
          x
        </button>
        <p className="gv-label">Early Beta Notice</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">GeoVault is in early beta</h2>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Some game data and results may be incomplete or incorrect while we validate and improve coverage.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="mt-5 w-full rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--bg-base)]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
