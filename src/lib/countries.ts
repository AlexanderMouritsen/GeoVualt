import type { Country } from '@/types'

const COUNTRIES_DATA_PATH = '/data/countries.json'

let countriesCache: Country[] | null = null
let countriesPromise: Promise<Country[]> | null = null

// Common aliases for countries that users might search for
const COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['usa', 'us'],
  'United Kingdom': ['uk', 'gb', 'great britain', 'britain'],
  'Central African Republic': ['car'],
  'United Arab Emirates': ['uae', 'emirates'],
  'Dominican Republic': ['dr'],
  'South Africa': ['sa'],
  'South Korea': ['sk', 'korea'],
  'North Korea': ['nk'],
  'New Zealand': ['nz'],
  'Papua New Guinea': ['png'],
  'Côte d\'Ivoire': ['ci', 'ivory coast', 'cote d\'ivoire'],
  'Democratic Republic of the Congo': ['drc', 'congo'],
  'Republic of the Congo': ['congo'],
  'Czech Republic': ['czechia', 'cz'],
  'Trinidad and Tobago': ['tt'],
  'Saint Lucia': ['lc'],
  'Puerto Rico': ['pr'],
  'Hong Kong': ['hk'],
  'Macao': ['mo'],
  'Vatican City': ['holy see'],
}

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

  // Helper function to check if a country matches the query
  function countryMatches(country: Country): boolean {
    const nameLower = country.name.toLowerCase()
    const officialNameLower = country.officialName.toLowerCase()
    const cca2Lower = country.cca2.toLowerCase()
    const cca3Lower = country.cca3.toLowerCase()

    // Check if query matches name, official name, or country codes
    if (nameLower.includes(normalized) || officialNameLower.includes(normalized)) return true
    if (cca2Lower === normalized || cca3Lower === normalized) return true

    // Check if query matches any aliases for this country
    const aliases = COUNTRY_ALIASES[country.name] || []
    if (aliases.some((alias) => alias.includes(normalized) || normalized.includes(alias))) return true

    return false
  }

  // Helper to get sort priority (prefix matches first, then substring matches)
  function getSortPriority(country: Country): number {
    const nameLower = country.name.toLowerCase()
    const cca2Lower = country.cca2.toLowerCase()
    const cca3Lower = country.cca3.toLowerCase()

    // Exact code match (highest priority)
    if (cca2Lower === normalized || cca3Lower === normalized) return 0
    if (nameLower.startsWith(normalized)) return 1
    const aliases = COUNTRY_ALIASES[country.name] || []
    if (aliases.some((alias) => alias === normalized)) return 2
    if (aliases.some((alias) => alias.startsWith(normalized))) return 3
    return 4 // substring match
  }

  const results = pool.filter(countryMatches).sort((a, b) => getSortPriority(a) - getSortPriority(b))

  return results.slice(0, limit)
}
