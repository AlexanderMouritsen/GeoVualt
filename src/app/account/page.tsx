export default function AccountPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[900px] px-6 py-10">
      <section className="rounded-3xl border-2 bg-white p-6" style={{ borderColor: 'var(--gv-border)' }}>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Account</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.03em] text-stone-900">Login, Profiles, and Settings</h1>
        <p className="mt-3 text-sm text-stone-600">
          This is the account hub for authentication and cloud-synced settings. It is ready for Supabase integration in the next step.
        </p>

        <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--gv-border)' }}>
          <p className="text-sm font-bold text-stone-900">Planned features</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-stone-700">
            <li>Email/password sign up and login</li>
            <li>Saved profile and gameplay preferences</li>
            <li>Cloud challenge history and per-day stats</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
