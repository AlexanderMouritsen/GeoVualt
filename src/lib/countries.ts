import type { Country } from '@/types'

const COUNTRIES_DATA_PATH = '/data/countries.json'

let countriesCache: Country[] | null = null
let countriesPromise: Promise<Country[]> | null = null

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function normalizeCodeSet(codes?: string[]): Set<string> {
  return new Set((codes ?? []).map((code) => code.toUpperCase()))
}

export async function loadCountries(): Promise<Country[]> {
  if (countriesCache) {
    return countriesCache
  }

  if (!countriesPromise) {
    countriesPromise = fetch(COUNTRIES_DATA_PATH)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load countries data: ${response.status}`)
        }

        const payload = (await response.json()) as Country[]
        countriesCache = payload
        return payload
      })
      .catch((error) => {
        countriesPromise = null
        throw error
      })
  }

  return countriesPromise
}

export function clearCountriesCache(): void {
  countriesCache = null
  countriesPromise = null
}

export function findCountryByCode(countries: Country[], cca2: string): Country | undefined {
  const code = cca2.trim().toUpperCase()
  return countries.find((country) => country.cca2.toUpperCase() === code)
}

export function searchCountries(
  countries: Country[],
  query: string,
  options?: {
    excludeCca2?: string[]
    limit?: number
  },
): Country[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  const limit = options?.limit ?? 8
  const excludeSet = normalizeCodeSet(options?.excludeCca2)

  const pool = countries.filter((country) => !excludeSet.has(country.cca2.toUpperCase()))

  const prefixMatches = pool.filter((country) => country.name.toLowerCase().startsWith(normalized))
  const substringMatches = pool.filter(
    (country) =>
      !country.name.toLowerCase().startsWith(normalized) &&
      country.name.toLowerCase().includes(normalized),
  )

  return [...prefixMatches, ...substringMatches].slice(0, limit)
}
