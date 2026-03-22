import Link from 'next/link'

export default function AccountPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[900px] px-6 py-10">
      <section className="gv-panel p-6">
        <p className="gv-label">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Account Features Coming Soon</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Account functionality is currently disabled for the public beta release.
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Continue playing without an account while we finalize authentication and profile features.
        </p>
        <Link href="/" className="mt-5 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-base)]">
          Back to Home
        </Link>
      </section>
    </main>
  )
}
