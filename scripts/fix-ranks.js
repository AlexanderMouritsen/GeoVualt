const fs = require('node:fs/promises')
const path = require('node:path')

const ROOT_DIR = path.resolve(__dirname, '..')
const COUNTRIES_PATH = path.join(ROOT_DIR, 'public', 'data', 'countries.json')

const RANK_METRICS = [
  'population',
  'area',
  'gdpUsd',
  'gdpPerCapitaUsd',
  'lifeExpectancy',
  'avgTemperatureCelsius',
  'forestAreaPercent',
  'co2EmissionsPerCapita',
  'renewableEnergyPercent',
  'internetUsersPercent',
  'literacyRatePercent',
  'incarcerationRatePer100k',
  'happinessScore',
  'tourismArrivals',
  'oilProductionBarrelsPerDay',
  'goldReservesTonnes',
  'militaryExpenditureGdpPercent',
]

const INVERSE_RANK_METRICS = new Set([
  'co2EmissionsPerCapita',
  'incarcerationRatePer100k',
])

const EXCLUDED_GLOBAL_RANKING_CCA2 = new Set([
  'AQ', 'AS', 'AI', 'AW', 'AX', 'BL', 'BM', 'BQ', 'BV', 'CC', 'CK', 'CW', 'CX', 'FK', 'FO',
  'GF', 'GG', 'GI', 'GL', 'GP', 'GU', 'HK', 'HM', 'IM', 'IO', 'JE', 'KY', 'MF', 'MO', 'MP',
  'MQ', 'MS', 'NC', 'NF', 'NU', 'PF', 'PM', 'PN', 'PR', 'RE', 'SH', 'SJ', 'SX', 'TC', 'TF',
  'TK', 'UM', 'VG', 'VI', 'WF', 'YT',
])

const CHECKS = [
  { cca2: 'CA', metric: 'area', label: 'Canada area' },
  { cca2: 'GR', metric: 'tourismArrivals', label: 'Greece tourism' },
  { cca2: 'AU', metric: 'lifeExpectancy', label: 'Australia life expectancy' },
  { cca2: 'MV', metric: 'tourismArrivals', label: 'Maldives tourism' },
]

function safeNumber(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function isRankEligibleCountry(country) {
  return !EXCLUDED_GLOBAL_RANKING_CCA2.has(country.cca2)
}

function snapshotRanks(countries) {
  const byCca2 = new Map(countries.map((country) => [country.cca2, country]))
  return CHECKS.map((check) => {
    const country = byCca2.get(check.cca2)
    return {
      ...check,
      value: country ? safeNumber(country[check.metric]) : null,
      rank: country?.rankings?.[check.metric] ?? null,
    }
  })
}

function computeRankings(countries) {
  for (const country of countries) {
    country.rankings = {}
  }

  const rankedUniverse = countries.filter(isRankEligibleCountry)

  for (const metric of RANK_METRICS) {
    const ranked = rankedUniverse
      .filter((country) => safeNumber(country[metric]) !== null)
      .sort((a, b) => {
        const aVal = safeNumber(a[metric]) ?? 0
        const bVal = safeNumber(b[metric]) ?? 0
        if (INVERSE_RANK_METRICS.has(metric)) {
          return aVal - bVal
        }
        return bVal - aVal
      })

    ranked.forEach((country, index) => {
      country.rankings[metric] = index + 1
    })
  }
}

async function main() {
  const raw = await fs.readFile(COUNTRIES_PATH, 'utf8')
  const countries = JSON.parse(raw)

  const before = snapshotRanks(countries)
  computeRankings(countries)
  const after = snapshotRanks(countries)

  await fs.writeFile(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`, 'utf8')

  console.log('Recomputed global rankings and overwrote public/data/countries.json')
  console.log('')
  console.log('Verification of reported cases:')
  for (const check of CHECKS) {
    const prev = before.find((item) => item.label === check.label)
    const next = after.find((item) => item.label === check.label)
    console.log(
      `- ${check.label}: value=${next?.value ?? 'n/a'}, rank ${prev?.rank ?? 'n/a'} -> ${next?.rank ?? 'n/a'}`,
    )
  }
}

main().catch((error) => {
  console.error('Failed to recompute ranks:', error)
  process.exitCode = 1
})
