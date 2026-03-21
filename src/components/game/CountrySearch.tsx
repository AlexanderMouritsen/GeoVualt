'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import { searchCountries } from '@/lib/countries'
import type { Country } from '@/types'

interface CountrySearchProps {
  countries: Country[]
  onSelect: (country: Country) => void
  exclude?: string[]
  placeholder?: string
  accent?: string
}

export function CountrySearch({
  countries,
  onSelect,
  exclude,
  placeholder = 'Search countries',
  accent = 'var(--gv-primary)',
}: CountrySearchProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const trimmed = query.trim()
    if (trimmed.length < 1) return []

    const safeQuery = trimmed.slice(0, 64)
    return searchCountries(countries, safeQuery, { excludeCca2: exclude, limit: 8 })
  }, [countries, exclude, query])

  const submitByQuery = () => {
    if (results.length === 0) return
    const first = results[0]
    onSelect(first)
    setQuery('')
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor="country-search-input">
        Search country
      </label>
      <div className="flex items-center gap-2">
        <input
          id="country-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submitByQuery()
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        />
        <button
          type="button"
          onClick={submitByQuery}
          className="gv-btn-outline px-3 py-2 text-sm"
          style={{ borderColor: accent, color: accent }}
          disabled={results.length === 0}
        >
          Guess
        </button>
      </div>

      {query.trim() ? (
        <ul className="max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-base)]">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No matches found</li>
          ) : (
            results.map((country) => (
              <li key={country.cca2}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(country)
                    setQuery('')
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--bg-elevated)]"
                >
                  <span className="min-w-0 truncate text-sm text-[var(--text-primary)]">
                    <span className="inline-flex items-center gap-2">
                      {country.flagUrl ? (
                        <Image
                          src={country.flagUrl}
                          alt={`${country.name} flag`}
                          width={16}
                          height={11}
                          className="rounded-sm border border-[var(--border)]"
                          unoptimized
                        />
                      ) : (
                        <span>{country.flagEmoji || '🏳️'}</span>
                      )}
                      <span>{country.name}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">{country.region || 'Unknown'}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
