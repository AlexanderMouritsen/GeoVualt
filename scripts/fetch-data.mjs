import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'data', 'countries.json')

const REST_COUNTRIES_BASE_FIELDS = [
	'name',
	'cca2',
	'cca3',
	'region',
	'subregion',
	'landlocked',
	'borders',
	'area',
	'latlng',
	'population',
]
const REST_COUNTRIES_FLAG_FIELDS = ['cca2', 'flags', 'flag']
const REST_COUNTRIES_BASE_URL = `https://restcountries.com/v3.1/all?fields=${REST_COUNTRIES_BASE_FIELDS.join(',')}`
const REST_COUNTRIES_FLAG_URL = `https://restcountries.com/v3.1/all?fields=${REST_COUNTRIES_FLAG_FIELDS.join(',')}`
const WORLD_BANK_BASE = 'https://api.worldbank.org/v2/country/all/indicator'
const FETCH_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2

const WORLD_BANK_INDICATORS = {
	gdpUsd: 'NY.GDP.MKTP.CD',
	gdpPerCapitaUsd: 'NY.GDP.PCAP.CD',
	lifeExpectancy: 'SP.DYN.LE00.IN',
	co2EmissionsPerCapita: 'EN.ATM.CO2E.PC',
	renewableEnergyPercent: 'EG.FEC.RNEW.ZS',
	internetUsersPercent: 'IT.NET.USER.ZS',
	forestAreaPercent: 'AG.LND.FRST.ZS',
	literacyRatePercent: 'SE.ADT.LITR.ZS',
	militaryExpenditureGdpPercent: 'MS.MIL.XPND.GD.ZS',
	tourismArrivals: 'ST.INT.ARVL',
} 

const SUPPLEMENTAL_METRICS = {
	avgTemperatureCelsius: {
		NO: 1.5,
		DK: 8.5,
		ES: 14.7,
		IN: 24.0,
		BR: 24.9,
		EG: 22.1,
		AU: 21.8,
		CA: -5.4,
		US: 8.6,
		JP: 11.6,
	},
	happinessScore: {
		FI: 7.8,
		DK: 7.6,
		IS: 7.5,
		SE: 7.3,
		NO: 7.3,
		NL: 7.4,
		CH: 7.1,
		AU: 7.0,
		CA: 6.9,
		US: 6.7,
	},
	incarcerationRatePer100k: {
		US: 531,
		SV: 614,
		BR: 357,
		RU: 329,
		TR: 335,
		NO: 52,
		FI: 51,
		DE: 69,
		JP: 39,
		IN: 35,
	},
}

const RANK_METRICS = [
	'population',
	'area',
	'gdpUsd',
	'gdpPerCapitaUsd',
	'lifeExpectancy',
	'humanDevelopmentIndex',
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

const COVERAGE_WARNING_THRESHOLD = 120
const COVERAGE_TRACKED_METRICS = [
	'avgTemperatureCelsius',
	'happinessScore',
	'incarcerationRatePer100k',
	'gdpUsd',
	'gdpPerCapitaUsd',
	'lifeExpectancy',
	'forestAreaPercent',
	'co2EmissionsPerCapita',
	'renewableEnergyPercent',
	'internetUsersPercent',
	'literacyRatePercent',
	'tourismArrivals',
	'militaryExpenditureGdpPercent',
]

function safeNumber(value) {
	if (value === null || value === undefined) return null
	const n = Number(value)
	return Number.isFinite(n) ? n : null
}

function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : ''
}

function pickLatestNonNullValue(rows) {
	for (const row of rows) {
		const parsed = safeNumber(row?.value)
		if (parsed !== null) return parsed
	}
	return null
}

async function fetchJson(url, label) {
	let lastError = null

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

		try {
			const response = await fetch(url, { signal: controller.signal })
			if (!response.ok) {
				throw new Error(`${label} failed with status ${response.status}`)
			}

			return await response.json()
		} catch (error) {
			lastError = error
			if (attempt < MAX_RETRIES) {
				console.warn(`Retrying ${label} (${attempt + 1}/${MAX_RETRIES})...`)
			}
		} finally {
			clearTimeout(timeout)
		}
	}

	throw lastError
}

function toCountryBase(entry) {
	const latlng = Array.isArray(entry?.latlng) ? entry.latlng : []
	const lat = safeNumber(latlng[0]) ?? 0
	const lng = safeNumber(latlng[1]) ?? 0
	const name = normalizeString(entry?.name?.common)
	const officialName = normalizeString(entry?.name?.official)

	return {
		cca2: normalizeString(entry?.cca2),
		cca3: normalizeString(entry?.cca3),
		name,
		officialName: officialName || name,
		region: normalizeString(entry?.region),
		subregion: normalizeString(entry?.subregion),
		landlocked: Boolean(entry?.landlocked),
		borders: Array.isArray(entry?.borders) ? entry.borders.filter(Boolean) : [],
		area: safeNumber(entry?.area) ?? 0,
		lat,
		lng,
		population: safeNumber(entry?.population) ?? 0,
		gdpUsd: null,
		gdpPerCapitaUsd: null,
		lifeExpectancy: null,
		humanDevelopmentIndex: null,
		avgTemperatureCelsius: null,
		forestAreaPercent: null,
		co2EmissionsPerCapita: null,
		renewableEnergyPercent: null,
		internetUsersPercent: null,
		literacyRatePercent: null,
		incarcerationRatePer100k: null,
		happinessScore: null,
		tourismArrivals: null,
		oilProductionBarrelsPerDay: null,
		goldReservesTonnes: null,
		militaryExpenditureGdpPercent: null,
		flagUrl: normalizeString(entry?.flags?.png),
		flagEmoji: normalizeString(entry?.flag),
		rankings: {},
	}
}

function applySupplementalMetrics(countryMap) {
	for (const [metric, byCountry] of Object.entries(SUPPLEMENTAL_METRICS)) {
		for (const [cca2, raw] of Object.entries(byCountry)) {
			const country = countryMap.get(cca2)
			if (!country) continue
			country[metric] = safeNumber(raw)
		}
	}
}

function computeRankings(countries) {
	for (const metric of RANK_METRICS) {
		const ranked = countries
			.filter((country) => safeNumber(country[metric]) !== null)
			.sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))

		ranked.forEach((country, index) => {
			country.rankings[metric] = index + 1
		})
	}
}

async function applyWorldBankIndicators(countryMap) {
	for (const [fieldName, indicatorCode] of Object.entries(WORLD_BANK_INDICATORS)) {
		const url = `${WORLD_BANK_BASE}/${indicatorCode}?format=json&per_page=300&mrv=5`
		const label = `World Bank indicator ${indicatorCode}`

		try {
			const payload = await fetchJson(url, label)
			const rows = Array.isArray(payload?.[1]) ? payload[1] : []
			const byCountry = new Map()

			for (const row of rows) {
				const iso2 = normalizeString(row?.countryiso2code)
				if (!iso2 || iso2.length !== 2) continue

				const bucket = byCountry.get(iso2) ?? []
				bucket.push(row)
				byCountry.set(iso2, bucket)
			}

			for (const [iso2, metricRows] of byCountry.entries()) {
				const country = countryMap.get(iso2)
				if (!country) continue

				const value = pickLatestNonNullValue(metricRows)
				if (value !== null) {
					country[fieldName] = value
				}
			}

			console.log(`Applied ${fieldName} from ${indicatorCode}`)
		} catch (error) {
			console.warn(`Skipping ${fieldName}: ${error.message}`)
		}
	}
}

function validateCountries(countries) {
	const requiredFields = [
		'cca2',
		'cca3',
		'name',
		'officialName',
		'region',
		'landlocked',
		'borders',
		'area',
		'population',
		'flagUrl',
		'flagEmoji',
		'rankings',
	]

	for (const country of countries) {
		for (const field of requiredFields) {
			if (country[field] === undefined) {
				throw new Error(`Missing required field ${field} for ${country?.name ?? 'unknown'}`)
			}
		}
	}
}

async function writeOutput(countries) {
	await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
	await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(countries, null, 2)}\n`, 'utf8')
}

function printSummary(countries) {
	const countWith = (metric) => countries.filter((country) => safeNumber(country[metric]) !== null).length
	console.log(`Countries written: ${countries.length}`)
	console.log(`With GDP: ${countWith('gdpUsd')}`)
	console.log(`With life expectancy: ${countWith('lifeExpectancy')}`)
	console.log(`With internet usage: ${countWith('internetUsersPercent')}`)
	console.log(`With forest area: ${countWith('forestAreaPercent')}`)
	console.log(`With CO2 per capita: ${countWith('co2EmissionsPerCapita')}`)
	console.log(`With renewable energy: ${countWith('renewableEnergyPercent')}`)
	console.log(`With literacy: ${countWith('literacyRatePercent')}`)
	console.log(`Output file: ${OUTPUT_PATH}`)
}

function warnOnLowCoverageMetrics(countries) {
	const countWith = (metric) => countries.filter((country) => safeNumber(country[metric]) !== null).length
	const lowCoverage = COVERAGE_TRACKED_METRICS
		.map((metric) => ({ metric, count: countWith(metric) }))
		.filter((item) => item.count < COVERAGE_WARNING_THRESHOLD)

	if (lowCoverage.length === 0) {
		console.log(`Coverage check passed: tracked metrics have at least ${COVERAGE_WARNING_THRESHOLD} countries`)
		return
	}

	console.warn('Coverage check warning: some metrics are under-populated and should be improved post-MVP')
	for (const item of lowCoverage) {
		console.warn(`- ${item.metric}: ${item.count} countries populated (target >= ${COVERAGE_WARNING_THRESHOLD})`)
	}
	console.warn('Tracking file: docs/data-quality-checklist.md')
}

async function main() {
	console.log('Fetching base country data from REST Countries...')
	const restCountries = await fetchJson(REST_COUNTRIES_BASE_URL, 'REST Countries base fields')
	const restCountryFlags = await fetchJson(REST_COUNTRIES_FLAG_URL, 'REST Countries flag fields')

	if (!Array.isArray(restCountries) || restCountries.length === 0) {
		throw new Error('REST Countries returned an empty payload')
	}

	const flagByCca2 = new Map()
	if (Array.isArray(restCountryFlags)) {
		for (const item of restCountryFlags) {
			const cca2 = normalizeString(item?.cca2)
			if (!cca2) continue
			flagByCca2.set(cca2, {
				flags: item?.flags,
				flag: item?.flag,
			})
		}
	}

	const countryMap = new Map()
	for (const entry of restCountries) {
		const cca2 = normalizeString(entry?.cca2)
		const flagsPayload = flagByCca2.get(cca2)
		const mergedEntry = {
			...entry,
			flags: flagsPayload?.flags,
			flag: flagsPayload?.flag,
		}
		const country = toCountryBase(mergedEntry)
		if (!country.cca2 || !country.cca3 || !country.name) continue
		countryMap.set(country.cca2, country)
	}

	console.log(`Loaded ${countryMap.size} base countries`)
	console.log('Applying World Bank indicators...')
	await applyWorldBankIndicators(countryMap)
	console.log('Applying supplemental hardcoded metrics...')
	applySupplementalMetrics(countryMap)

	const countries = Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
	computeRankings(countries)
	validateCountries(countries)
	await writeOutput(countries)
	printSummary(countries)
	warnOnLowCoverageMetrics(countries)
}

main().catch((error) => {
	console.error('Failed to build countries dataset')
	console.error(error)
	process.exitCode = 1
})
