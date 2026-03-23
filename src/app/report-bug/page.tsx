'use client';

import { useState } from 'react';

export default function ReportBugPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gameMode: '',
    steps: '',
    email: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit bug report');
      
      setSubmitted(true);
      setFormData({ title: '', description: '', gameMode: '', steps: '', email: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[900px] px-6 py-8">
      <section className="gv-panel p-6">
        <p className="gv-label">Support</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Report a Bug</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Found an issue? Let us know and help make GeoVault better.</p>

        {submitted && (
          <div className="mt-6 rounded-md border border-[var(--accent)] bg-transparent px-4 py-3 text-[var(--accent)]">
            ✅ Thank you! Your bug report has been submitted.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-[var(--accent-danger)] bg-transparent px-4 py-3 text-[var(--accent-danger)]">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Game Mode */}
          <div>
            <label htmlFor="gameMode" className="gv-label block">
              Game Mode <span className="text-[var(--accent-danger)]">(Optional)</span>
            </label>
            <select
              id="gameMode"
              name="gameMode"
              value={formData.gameMode}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Select a game mode...</option>
              <option value="country-rank">Country Rank</option>
              <option value="country-rank-europe">Country Rank Europe</option>
              <option value="hidden-country">Border Hunt</option>
              <option value="nation-match">Nation Links</option>
              <option value="country-matrix">Country Matrix</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Bug Title */}
          <div>
            <label htmlFor="title" className="gv-label block">
              Bug Title <span className="text-[var(--accent-danger)]">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Belgium shows wrong population"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="gv-label block">
              Description <span className="text-[var(--accent-danger)]">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe the bug in detail. What's happening and what should happen instead?"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label htmlFor="steps" className="gv-label block">
              Steps to Reproduce <span className="text-[var(--accent-danger)]">(Optional)</span>
            </label>
            <textarea
              id="steps"
              name="steps"
              value={formData.steps}
              onChange={handleChange}
              rows={3}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. Notice..."
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="gv-label block">
              Email <span className="text-[var(--accent-danger)]">(Optional - if you want a follow-up)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--bg-base)] disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Bug Report'}
            </button>
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            >
              Back to Home
            </a>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Thank you for helping us improve GeoVault! 🌍
        </p>
      </section>
    </main>
  );
}
