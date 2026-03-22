import { comparableTemperature, shuffle } from '@/lib/game'
import type { Country } from '@/types'

export type GridCategoryType =
  | 'region'
  | 'subregion'
  | 'landlocked'
  | 'geo'
  | 'language'
  | 'capital_pop'
  | 'flag_trait'
  | 'metric_gt'
  | 'metric_lt'
  | 'metric_top_n'
  | 'metric_range'

export interface GridCategory {
  id: string
  type: GridCategoryType
  label: string
  validCountries: string[]
}

export interface GeoGridPuzzle {
  rows: GridCategory[]
  cols: GridCategory[]
  validByCell: Record<string, string[]>
}

const MIN_VALID_PER_CELL = 2

function toSet(arr: string[]): Set<string> {
  return new Set(arr)
}

function intersection(a: string[], b: string[]): string[] {
  const bSet = toSet(b)
  return a.filter((item) => bSet.has(item))
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`
}

function topByMetric(countries: Country[], metric: 'population' | 'area', n: number): string[] {
  return countries
    .filter((country) => Number.isFinite(country[metric]))
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, n)
    .map((country) => country.cca2)
}

function addCategory(
  categories: GridCategory[],
  id: string,
  type: GridCategoryType,
  label: string,
  codes: string[],
  min = 8,
): void {
  const unique = Array.from(new Set(codes))
  if (unique.length < min) return
  categories.push({ id, type, label, validCountries: unique })
}

const OFFICIAL_LANGUAGE_BY_CCA2: Record<string, string[]> = {
  US: ['en'], GB: ['en'], CA: ['en', 'fr'], AU: ['en'], NZ: ['en'], IE: ['en'], SG: ['en'], ZA: ['en'], IN: ['en', 'hi'], PK: ['en', 'ur'],
  MX: ['es'], ES: ['es'], AR: ['es'], CL: ['es'], CO: ['es'], PE: ['es'], VE: ['es'], EC: ['es'], UY: ['es'], PY: ['es'], BO: ['es'],
  FR: ['fr'], BE: ['fr', 'nl'], CH: ['fr', 'de', 'it'], LU: ['fr', 'de'], SN: ['fr'], CI: ['fr'], CM: ['fr', 'en'],
  BR: ['pt'], PT: ['pt'], AO: ['pt'], MZ: ['pt'],
  DE: ['de'], AT: ['de'],
  IT: ['it'],
  NL: ['nl'],
  SE: ['sv'],
  NO: ['no'],
  DK: ['da'],
  FI: ['fi', 'sv'],
  PL: ['pl'], CZ: ['cs'], SK: ['sk'], HU: ['hu'], RO: ['ro'], BG: ['bg'], GR: ['el'], HR: ['hr'], RS: ['sr'], UA: ['uk'], RU: ['ru'], BY: ['ru', 'be'],
  TR: ['tr'], IR: ['fa'], SA: ['ar'], AE: ['ar'], QA: ['ar'], KW: ['ar'], OM: ['ar'], JO: ['ar'], LB: ['ar'], EG: ['ar'], TN: ['ar'], DZ: ['ar'], MA: ['ar'],
  IL: ['he', 'ar'],
  CN: ['zh'], TW: ['zh'], HK: ['zh'],
  JP: ['ja'], KR: ['ko'],
  TH: ['th'], VN: ['vi'], ID: ['id'], MY: ['ms'], PH: ['en', 'tl'],
  BD: ['bn'], LK: ['si', 'ta'], NP: ['ne'],
  ET: ['am'], KE: ['en', 'sw'], TZ: ['sw', 'en'], UG: ['en', 'sw'], GH: ['en'], NG: ['en'],
}

const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', ar: 'Arabic', zh: 'Chinese', ru: 'Russian', hi: 'Hindi',
}

const CAPITAL_POPULATION_BY_CCA2: Record<string, number> = {
  JP: 37_000_000, IN: 32_000_000, CN: 22_000_000, BR: 22_000_000, MX: 22_000_000, EG: 20_000_000, US: 6_400_000, RU: 13_000_000,
  GB: 9_600_000, FR: 11_000_000, TR: 5_700_000, IR: 9_500_000, TH: 11_000_000, ID: 10_500_000, KR: 9_900_000, PH: 13_500_000,
  AR: 15_500_000, CL: 6_800_000, CO: 8_000_000, PE: 11_000_000, CA: 1_500_000, AU: 460_000, NZ: 440_000, NO: 1_100_000,
  SE: 1_700_000, DK: 1_300_000, FI: 1_300_000, NL: 2_500_000, PL: 1_900_000, CZ: 1_300_000, HU: 1_700_000, RO: 1_800_000,
  ZA: 2_900_000, KE: 5_300_000, NG: 3_800_000, GH: 2_600_000,
}

const FLAG_TRAITS_BY_CCA2: Record<string, string[]> = {
  US: ['stars', 'horizontal_tricolor'], GB: ['cross'], FR: ['vertical_tricolor'], IT: ['vertical_tricolor'], IE: ['vertical_tricolor'],
  BE: ['vertical_tricolor'], RO: ['vertical_tricolor'], ML: ['vertical_tricolor'], CI: ['vertical_tricolor'],
  DE: ['horizontal_tricolor'], RU: ['horizontal_tricolor'], NL: ['horizontal_tricolor'], AT: ['horizontal_tricolor'],
  HU: ['horizontal_tricolor'], BG: ['horizontal_tricolor'], LT: ['horizontal_tricolor'], EE: ['horizontal_tricolor'],
  HR: ['horizontal_tricolor'], RS: ['horizontal_tricolor'], SI: ['horizontal_tricolor'], SK: ['horizontal_tricolor'],
  AR: ['sun'], UY: ['sun'], JP: ['sun'], KR: ['sun'],
  TR: ['crescent'], PK: ['crescent'], DZ: ['crescent'], TN: ['crescent'], LY: ['crescent'], MA: ['star'],
  CN: ['stars'], AU: ['stars'], NZ: ['stars'], BR: ['stars'], CL: ['stars'],
  CH: ['cross'], DK: ['cross'], SE: ['cross'], NO: ['cross'], FI: ['cross'], IS: ['cross'],
}

const FLAG_TRAIT_LABEL: Record<string, string> = {
  stars: 'Flag has stars',
  crescent: 'Flag has crescent',
  cross: 'Flag has cross',
  vertical_tricolor: 'Flag is vertical tricolor',
  horizontal_tricolor: 'Flag is horizontal tricolor',
  sun: 'Flag has sun symbol',
}

export function buildGridCategories(countries: Country[]): GridCategory[] {
  const categories: GridCategory[] = []

  const byRegion = new Map<string, string[]>()
  for (const country of countries) {
    if (!country.region) continue
    const bucket = byRegion.get(country.region) ?? []
    bucket.push(country.cca2)
    byRegion.set(country.region, bucket)
  }

  for (const [region, codes] of Array.from(byRegion.entries())) {
    addCategory(categories, `region-${region.toLowerCase()}`, 'region', `In ${region}`, codes, 12)
  }

  const bySubregion = new Map<string, string[]>()
  for (const country of countries) {
    if (!country.subregion) continue
    const bucket = bySubregion.get(country.subregion) ?? []
    bucket.push(country.cca2)
    bySubregion.set(country.subregion, bucket)
  }

  for (const [subregion, codes] of Array.from(bySubregion.entries())) {
    addCategory(categories, `subregion-${subregion.toLowerCase().replace(/\s+/g, '-')}`, 'subregion', `In ${subregion}`, codes, 8)
  }

  const landlocked = countries.filter((country) => country.landlocked).map((country) => country.cca2)
  const coast = countries.filter((country) => !country.landlocked).map((country) => country.cca2)

  addCategory(categories, 'landlocked-yes', 'landlocked', 'Is landlocked', landlocked, 12)
  addCategory(categories, 'landlocked-no', 'landlocked', 'Has coastline', coast, 12)

  addCategory(
    categories,
    'geo-island-state',
    'geo',
    'Island or borderless country',
    countries.filter((country) => !country.landlocked && country.borders.length === 0).map((country) => country.cca2),
    8,
  )

  addCategory(categories, 'geo-northern', 'geo', 'In Northern Hemisphere', countries.filter((country) => country.lat >= 0).map((country) => country.cca2), 20)
  addCategory(categories, 'geo-southern', 'geo', 'In Southern Hemisphere', countries.filter((country) => country.lat < 0).map((country) => country.cca2), 10)
  addCategory(
    categories,
    'geo-tropical',
    'geo',
    'In tropical latitude belt (23.5°N to 23.5°S)',
    countries.filter((country) => Math.abs(country.lat) < 23.5).map((country) => country.cca2),
    12,
  )
  addCategory(categories, 'geo-high-lat', 'geo', 'Far from equator (45°+ latitude)', countries.filter((country) => Math.abs(country.lat) > 45).map((country) => country.cca2), 8)
  addCategory(categories, 'geo-many-borders', 'geo', 'Borders 5+ countries', countries.filter((country) => country.borders.length >= 5).map((country) => country.cca2), 8)
  addCategory(categories, 'geo-few-borders', 'geo', 'Borders at most 1 country', countries.filter((country) => country.borders.length <= 1).map((country) => country.cca2), 12)

  const pop50m = countries.filter((country) => country.population > 50_000_000).map((country) => country.cca2)
  const pop100m = countries.filter((country) => country.population > 100_000_000).map((country) => country.cca2)
  const area1m = countries.filter((country) => country.area > 1_000_000).map((country) => country.cca2)

  addCategory(categories, 'metric-gt-pop-50m', 'metric_gt', 'Population > 50M', pop50m, 10)
  addCategory(categories, 'metric-gt-pop-100m', 'metric_gt', 'Population > 100M', pop100m, 8)
  addCategory(categories, 'metric-gt-area-1m', 'metric_gt', 'Area > 1M km²', area1m, 8)
  addCategory(
    categories,
    'metric-range-pop-20-80m',
    'metric_range',
    'Population between 20M and 80M',
    countries.filter((country) => country.population >= 20_000_000 && country.population <= 80_000_000).map((country) => country.cca2),
    8,
  )

  addCategory(
    categories,
    'metric-lt-area-100k',
    'metric_lt',
    'Area < 100k km²',
    countries.filter((country) => country.area < 100_000).map((country) => country.cca2),
    10,
  )

  const metricGtDefinitions: Array<{ id: string; label: string; min: number; getter: (c: Country) => number | null; minCountries: number }> = [
    { id: 'metric-gdp-500b', label: 'GDP > $500B', min: 500_000_000_000, getter: (c) => c.gdpUsd, minCountries: 8 },
    { id: 'metric-lifeexp-80', label: 'Life expectancy > 80', min: 80, getter: (c) => c.lifeExpectancy, minCountries: 8 },
    { id: 'metric-internet-85', label: 'Internet users > 85%', min: 85, getter: (c) => c.internetUsersPercent, minCountries: 8 },
    { id: 'metric-forest-40', label: 'Forest area > 40%', min: 40, getter: (c) => c.forestAreaPercent, minCountries: 8 },
    { id: 'metric-temp-20', label: 'Avg temp > 20°C', min: 20, getter: (c) => comparableTemperature(c), minCountries: 8 },
  ]

  for (const metric of metricGtDefinitions) {
    addCategory(
      categories,
      metric.id,
      'metric_gt',
      metric.label,
      countries
        .filter((country) => {
          const value = metric.getter(country)
          return typeof value === 'number' && value > metric.min
        })
        .map((country) => country.cca2),
      metric.minCountries,
    )
  }

  const topPopulation = topByMetric(countries, 'population', 30)
  const topArea = topByMetric(countries, 'area', 30)

  addCategory(categories, 'metric-top-pop-30', 'metric_top_n', 'Top 30 by population', topPopulation, 20)
  addCategory(categories, 'metric-top-area-30', 'metric_top_n', 'Top 30 by area', topArea, 20)

  const topByNullable = (
    key: keyof Country,
    label: string,
    n: number,
    minCountries = 8,
  ) => {
    const codes = countries
      .filter((country) => typeof country[key] === 'number')
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .slice(0, n)
      .map((country) => country.cca2)

    addCategory(categories, `metric-top-${String(key)}-${n}`, 'metric_top_n', label, codes, minCountries)
  }

  topByNullable('gdpUsd', 'Top 25 by GDP', 25)
  topByNullable('lifeExpectancy', 'Top 25 by life expectancy', 25)
  topByNullable('internetUsersPercent', 'Top 25 by internet use', 25)

  const byLanguage = new Map<string, string[]>()
  for (const country of countries) {
    const langs = OFFICIAL_LANGUAGE_BY_CCA2[country.cca2] ?? []
    for (const lang of langs) {
      const bucket = byLanguage.get(lang) ?? []
      bucket.push(country.cca2)
      byLanguage.set(lang, bucket)
    }
  }

  for (const [lang, codes] of Array.from(byLanguage.entries())) {
    const languageLabel = LANGUAGE_LABEL[lang] ?? lang.toUpperCase()
    addCategory(categories, `lang-${lang}`, 'language', `Official language: ${languageLabel}`, codes, 8)
  }

  const capitalEntries = countries
    .map((country) => ({ country, capitalPopulation: CAPITAL_POPULATION_BY_CCA2[country.cca2] ?? null }))
    .filter((item) => item.capitalPopulation !== null)

  addCategory(
    categories,
    'capital-pop-gt-10m',
    'capital_pop',
    'Capital population > 10M',
    capitalEntries
      .filter((item) => (item.capitalPopulation as number) > 10_000_000)
      .map((item) => item.country.cca2),
    8,
  )

  addCategory(
    categories,
    'capital-pop-lt-2m',
    'capital_pop',
    'Capital population < 2M',
    capitalEntries
      .filter((item) => (item.capitalPopulation as number) < 2_000_000)
      .map((item) => item.country.cca2),
    8,
  )

  const byFlagTrait = new Map<string, string[]>()
  for (const country of countries) {
    const traits = FLAG_TRAITS_BY_CCA2[country.cca2] ?? []
    for (const trait of traits) {
      const bucket = byFlagTrait.get(trait) ?? []
      bucket.push(country.cca2)
      byFlagTrait.set(trait, bucket)
    }
  }

  for (const [trait, codes] of Array.from(byFlagTrait.entries())) {
    const traitLabel = FLAG_TRAIT_LABEL[trait] ?? `Flag trait: ${trait}`
    addCategory(categories, `flag-${trait}`, 'flag_trait', traitLabel, codes, 8)
  }

  return categories
}

export function generateValidGeoGrid(
  countries: Country[],
  rng: () => number,
  options?: { maxAttempts?: number },
): GeoGridPuzzle {
  const maxAttempts = options?.maxAttempts ?? 500
  const categories = buildGridCategories(countries)

  let bestCandidate: GeoGridPuzzle | null = null
  let bestMinCell = -1

  if (categories.length < 6) {
    throw new Error('Not enough categories to generate GeoGrid puzzle')
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const ordered = shuffle(categories, rng)
    const rows = ordered.slice(0, 3)
    const cols = ordered.slice(3, 6)

    const validByCell: Record<string, string[]> = {}
    let isValid = true
    let minCellValid = Number.POSITIVE_INFINITY

    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const valid = intersection(rows[r].validCountries, cols[c].validCountries)
        validByCell[cellKey(r, c)] = valid
        minCellValid = Math.min(minCellValid, valid.length)
        if (valid.length < MIN_VALID_PER_CELL) {
          isValid = false
        }
      }
    }

    if (isValid) {
      return { rows, cols, validByCell }
    }

    if (minCellValid > bestMinCell) {
      bestMinCell = minCellValid
      bestCandidate = { rows, cols, validByCell }
    }
  }

  if (bestCandidate && bestMinCell > 0) {
    return bestCandidate
  }

  throw new Error('Unable to generate valid GeoGrid after max attempts')
}

export function geogridCellKey(row: number, col: number): string {
  return cellKey(row, col)
}
