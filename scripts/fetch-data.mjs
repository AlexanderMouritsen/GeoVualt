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
		NO: 1.5, DK: 8.5, ES: 14.7, IN: 24.0, BR: 24.9, EG: 22.1, AU: 21.8, CA: -5.4, US: 8.6, JP: 11.6,
		GB: 8.9, FR: 11.3, DE: 8.6, IT: 14.4, SE: 1.9, NZ: 12.9, MX: 17.4, ZA: 17.5, RU: -8.3, KR: 10.7,
		TH: 27.5, ID: 26.7, PH: 26.6, VN: 23.8, MY: 27.1, SG: 26.8, TW: 22.6, CN: 8.2, PK: 25.6, BD: 25.8,
		CL: 12.0, AR: 16.5, PE: 18.2, CO: 24.3, EC: 25.0, VE: 26.8, TR: 11.0, IR: 16.4, SA: 26.1, AE: 28.0,
		KW: 26.5, QA: 28.6, OM: 28.2, JO: 18.1, LB: 17.0, IL: 18.5, GR: 15.4, PT: 13.7, PL: 7.7, UA: 6.8,
		RO: 8.4, BG: 9.6, HU: 9.5, CZ: 7.9, SK: 8.3, HR: 9.9, SB: 26.0,
		// Europe
		FI: 2.5, IE: 9.0, NL: 9.5, BE: 9.3, AT: 8.2, CH: 9.0, LU: 9.2, MT: 18.5, CY: 18.0, AL: 12.0,
		ME: 11.0, RS: 10.5, BA: 8.5, MK: 9.5, BY: 5.5, MD: 9.0,
		// Asia
		KZ: 10.0, UZ: 17.0, TJ: 14.0, KG: 12.0, TM: 18.0, AZ: 15.0, GE: 12.0, AM: 11.0,
		NP: 19.0, LK: 27.0, MM: 27.0, KH: 27.0, LA: 25.5, BN: 27.0, TL: 26.0,
		// Africa
		NG: 26.0, GH: 26.0, KE: 21.0, TZ: 21.0, UG: 21.0, ZM: 21.0, ZW: 19.0, MW: 21.0, MZ: 22.0,
		DZ: 20.0, MA: 18.0, TN: 19.0, SD: 27.0, ET: 17.0, CM: 25.0, AO: 20.0, CG: 23.0, CD: 24.0,
		RW: 19.0, BI: 20.0, BJ: 27.0, BF: 28.0, ML: 28.5, NE: 29.0, LR: 26.0, SL: 26.5, SN: 28.0,
		MR: 26.0, DJ: 28.0, KM: 25.0, MG: 20.0, MU: 23.5,
		// Americas
		CR: 26.0, PA: 27.0, JM: 26.5, DO: 25.5, HT: 24.5, CU: 25.5, BZ: 26.0, SV: 26.0, HN: 26.0,
		GT: 22.0, NI: 26.0, PY: 24.0, UY: 16.5, BO: 22.0, SR: 26.5, GY: 26.0, BS: 25.0, TT: 25.5,
		// Caribbean & Small Islands
		FJ: 25.0, WS: 25.5, KI: 27.0, MH: 27.0, NR: 27.5, PW: 27.0, TO: 25.0, VU: 25.5,
	},
	happinessScore: {
		FI: 7.8, DK: 7.6, IS: 7.5, SE: 7.3, NO: 7.3, NL: 7.4, CH: 7.1, AU: 7.0, CA: 6.9, US: 6.7,
		GB: 6.9, DE: 7.2, AT: 7.1, LU: 7.2, NZ: 7.2, ES: 6.5, FR: 6.7, IT: 6.5, CZ: 6.9, BE: 6.9,
		JP: 5.9, KR: 5.9, SG: 6.4, MY: 6.2, TH: 6.0, BR: 6.3, MX: 6.1, RU: 5.4, IN: 3.8, CN: 5.1,
		CL: 6.0, AR: 6.1, PE: 5.8, CO: 6.0, VE: 4.9, TR: 5.2, IR: 4.3, PK: 4.7, BD: 4.5, EG: 4.3,
		ZA: 5.3, KE: 5.1, NG: 5.3, GH: 5.7, AE: 6.9, KW: 6.2, SA: 5.4, JO: 5.2, IL: 6.2, GR: 5.9,
		PT: 6.1, PL: 6.0, UA: 5.3, RO: 5.9, BG: 5.5, HU: 5.7,
	},
	incarcerationRatePer100k: {
		US: 531, SV: 614, BR: 357, RU: 329, TR: 335, NO: 52, FI: 51, DE: 69, JP: 39, IN: 35,
		GB: 95, FR: 90, ES: 128, IT: 86, NL: 52, SE: 56, DK: 60, AU: 185, CA: 83, ZA: 276,
		MX: 211, KR: 68, TW: 111, TH: 283, MY: 211, SG: 381, NZ: 145, PK: 47, BD: 35, CN: 121,
		CL: 238, AR: 102, PE: 148, CO: 128, VE: 124, TR: 335, IR: 261, SA: 161, AE: 95, KW: 89,
		QA: 69, OM: 82, JO: 104, LB: 45, IL: 178, GR: 91, PT: 114, PL: 84, UA: 58, RO: 79,
		BG: 71, HU: 142, CZ: 81, SK: 85, HR: 73, SB: 107,
	},
	oilProductionBarrelsPerDay: {
		US: 11_000_000, RU: 10_500_000, SA: 12_000_000, CA: 5_000_000, IR: 2_600_000, IQ: 4_300_000, AE: 3_000_000,
		KW: 2_900_000, BR: 3_700_000, NO: 1_700_000, MX: 1_600_000, KZ: 1_200_000, NG: 1_400_000, AZ: 600_000,
		GB: 1_000_000, DO: 470_000, CG: 270_000, EC: 490_000, EQ: 200_000, SY: 100_000, VE: 800_000, TN: 75_000,
		DZ: 1_100_000, OM: 950_000, QA: 680_000, YE: 100_000, AR: 680_000, PE: 98_000, CO: 780_000, IN: 800_000,
		TH: 400_000, ID: 750_000, MY: 630_000, VN: 350_000, AU: 370_000, CN: 3_900_000, JA: 30_000,
	},
	goldReservesTonnes: {
		US: 8_133, DE: 3_710, IT: 2_452, FR: 2_436, RU: 2_299, CH: 1_040, JP: 765, NL: 612, UA: 457, SG: 455,
		SP: 457, CN: 1_948, TR: 564, IN: 707, SA: 323, KZ: 443, AU: 305, CA: 185, MX: 143, BR: 113,
		ES: 281, SE: 125, AT: 280, BE: 227, PT: 383, IR: 600, ID: 166, PH: 7, ZA: 125, PE: 151,
		PL: 119, RO: 105, UA: 457, CZ: 65, FI: 50, NO: 5, GR: 112, PT: 383, SE: 125, KR: 26,
		TH: 25, AR: 177, MY: 36, NG: 1, EG: 80, PK: 64, BD: 1, VN: 1,
	},
	gdpUsd: {
		US: 27_360_000_000_000, CN: 17_920_000_000_000, JP: 4_230_000_000_000, DE: 4_310_000_000_000, GB: 3_280_000_000_000,
		FR: 3_030_000_000_000, IT: 2_010_000_000_000, CA: 2_140_000_000_000, KR: 1_780_000_000_000, RU: 1_860_000_000_000,
		BR: 2_050_000_000_000, AU: 1_380_000_000_000, MX: 1_290_000_000_000, ES: 1_390_000_000_000, IN: 3_730_000_000_000,
		NL: 1_080_000_000_000, SA: 1_050_000_000_000, CH: 920_000_000_000, SE: 605_000_000_000, NO: 405_000_000_000,
		TR: 720_000_000_000, PL: 688_000_000_000, BE: 594_000_000_000, AT: 517_000_000_000, NO: 405_000_000_000,
		FI: 297_000_000_000, DK: 405_000_000_000, IE: 529_000_000_000, PT: 251_000_000_000, GR: 219_000_000_000,
		CZ: 281_000_000_000, RO: 301_000_000_000, HU: 177_000_000_000, SK: 115_000_000_000, BG: 84_000_000_000,
		CL: 305_000_000_000, AR: 387_000_000_000, CO: 323_000_000_000, PE: 223_000_000_000, VE: 300_000_000_000,
		JO: 38_000_000_000, LB: 50_000_000_000, EG: 406_000_000_000, NG: 504_000_000_000, ZA: 406_000_000_000,
	},
	gdpPerCapitaUsd: {
		US: 82_000, SW: 92_000, NO: 96_000, AU: 66_000, CA: 64_000, NL: 64_000, DE: 52_000, JP: 32_000, GB: 50_000, FR: 45_000,
		IT: 34_000, ES: 31_000, KR: 34_000, CH: 110_000, SG: 85_000, AE: 51_000, SA: 35_000, BR: 10_000, MX: 10_000, RU: 12_000,
		IN: 2_700, CN: 13_000, TH: 8_000, MY: 12_000, ID: 5_000, PH: 4_000, VN: 4_000, PK: 1_700, BD: 2_500, ZA: 6_500,
		SE: 78_000, DK: 68_000, FI: 58_000, AT: 62_000, BE: 61_000, CZ: 27_000, PL: 18_000, RO: 14_000, HU: 17_000, BG: 12_000,
		CL: 16_000, AR: 10_500, PE: 7_500, CO: 6_500, TR: 9_500, IR: 4_500, EG: 4_500, NG: 2_500, KE: 2_300, GH: 2_500,
	},
	lifeExpectancy: {
		JP: 84, CH: 84, IT: 83, ES: 83, SG: 83, KR: 82, AU: 82, NO: 82, FR: 82, CA: 82, NZ: 81, GB: 81, DE: 81, SE: 81, IS: 82,
		US: 78, BR: 76, RU: 72, MX: 72, TR: 77, CN: 77, IN: 68, PK: 67, BD: 72, TH: 75, MY: 75, VN: 73, ID: 72, PH: 72, ZA: 60,
		CL: 80, AR: 76, PE: 74, CO: 75, VE: 71, CZ: 79, PL: 78, RO: 76, HR: 77, BG: 75, AT: 81, FI: 81, DK: 81, GR: 81, PT: 80,
		EG: 71, NG: 54, KE: 66, GH: 63, UA: 71, IR: 74, SA: 75, AE: 78, JO: 74, IL: 82, KW: 75, NL: 82,
	},
	literacyRatePercent: {
		US: 99, CA: 99, AU: 99, GB: 99, DE: 99, FR: 99, JP: 99, SG: 99, KR: 99, NZ: 99,
		BR: 93, RU: 99, MX: 95, CN: 97, TH: 94, MY: 94, VN: 97, TW: 98, PH: 94, ID: 95,
		IN: 74, PK: 59, BD: 75, EG: 71, NG: 64, ZA: 87, TR: 96, IR: 88, SA: 94, AE: 98,
		CL: 97, AR: 98, PE: 94, CO: 95, ES: 99, IT: 98, GR: 98, PT: 96, PL: 98, CZ: 99, AT: 99, SE: 99, NO: 99, DK: 99, FI: 99,
		RO: 97, HU: 99, BG: 99, SK: 99, KE: 88, GH: 79, UA: 99, LB: 85, JO: 98, IL: 97,
	},
	forestAreaPercent: {
		BR: 60, RU: 49, CA: 38, US: 33, AU: 19, IN: 24, ID: 50, JP: 67, SE: 69, FI: 72, NO: 37, DE: 32, FR: 31, PL: 30, CH: 42,
		MX: 33, CO: 52, PE: 59, VN: 42, MY: 62, TH: 31, ZA: 9, NG: 10, EG: 0, SA: 1, KZ: 3, CN: 22, TW: 61, SG: 3, PH: 25,
		CL: 22, AR: 10, EC: 48, VE: 53, AT: 48, IT: 34, GR: 59, PT: 35, TR: 12, IR: 11, UZ: 5, TJ: 3, KG: 5, CZ: 34, SK: 40,
		BG: 41, RO: 30, HR: 41, UA: 16, KE: 6, GH: 62, BD: 11, ZA: 30,
	},
	co2EmissionsPerCapita: {
		US: 16, RU: 16, JP: 9, DE: 8, GB: 5, FR: 4, BR: 2, MX: 4, CA: 15, AU: 16, IN: 2, CN: 8, KR: 13, SG: 10, AE: 24, SA: 16,
		TR: 4, IT: 6, ES: 5, PL: 8, NL: 11, SE: 4, NO: 12, CH: 5, CZ: 10, ID: 2, TH: 4, VN: 2, MY: 8, PH: 1, PK: 1,
		CL: 5, AR: 3, PE: 2, CO: 2, AT: 8, BE: 10, DK: 7, FI: 9, GR: 6, PT: 5, RO: 4, BG: 5, HU: 5, CZ: 10, UA: 6, IR: 8, EG: 2, NG: 0.6, VE: 4,
	},
	renewableEnergyPercent: {
		NO: 97, IS: 86, SE: 60, BR: 65, CA: 62, NZ: 68, AU: 28, AT: 50, CH: 63, DK: 52, FI: 51, DE: 44, ES: 36, IT: 35, FR: 50,
		JP: 20, KR: 7, SG: 2, US: 13, MX: 28, IN: 10, CN: 31, RU: 5, TR: 24, PL: 15, CZ: 15, NL: 50, BE: 28, GB: 28, SE: 60,
		PT: 28, GR: 32, RO: 40, BG: 28, UA: 10, CL: 28, AR: 10, CO: 69, PE: 51, VE: 72, EG: 14, NG: 16, ZA: 13, KE: 33, GH: 42,
	},
	internetUsersPercent: {
		US: 90, CA: 91, AU: 90, GB: 95, DE: 93, FR: 91, JP: 83, SG: 92, KR: 95, NZ: 92, SE: 96, NO: 97, CH: 93, NL: 95, DK: 94,
		IT: 88, ES: 89, BR: 71, MX: 66, RU: 87, CN: 73, IN: 43, PK: 30, BD: 45, TH: 60, MY: 86, VN: 70, ID: 68, PH: 74, ZA: 65,
		CL: 88, AR: 83, PE: 62, CO: 65, AT: 89, BE: 91, CZ: 88, FI: 92, GR: 87, PT: 89, RO: 83, BG: 79, HU: 86, SK: 84, PL: 85,
		TR: 64, IR: 81, SA: 81, AE: 99, EG: 51, NG: 35, KE: 45, GH: 52, UA: 80, JO: 76,
	},
	tourismArrivals: {
		FR: 89_000_000, ES: 83_000_000, IT: 65_000_000, US: 78_000_000, GB: 40_000_000, DE: 37_000_000, JP: 25_000_000,
		CA: 33_000_000, AU: 9_800_000, NZ: 3_900_000, TH: 40_000_000, MY: 26_000_000, SG: 19_000_000, VN: 18_000_000,
		MX: 29_000_000, BR: 6_000_000, TR: 51_000_000, SA: 65_000_000, AE: 18_000_000, EG: 14_000_000, ZA: 6_000_000,
		CL: 5_500_000, AR: 2_900_000, PE: 4_400_000, CO: 4_100_000, AT: 2_300_000, CH: 1_200_000, GR: 3_400_000,
		PT: 2_100_000, CZ: 2_000_000, PL: 1_100_000, HU: 1_000_000, RO: 900_000, IR: 5_800_000, IL: 3_600_000, JO: 4_000_000,
	},
	militaryExpenditureGdpPercent: {
		US: 3.4, RU: 5.5, CN: 2.2, IN: 2.4, KR: 2.7, SA: 5.1, FR: 1.7, DE: 1.2, GB: 2.1, JP: 1.3, TR: 1.8, BR: 0.8, MX: 0.7,
		IT: 1.5, ES: 1.3, CA: 1.4, AU: 2.1, NZ: 1.4, SE: 1.5, NO: 1.9, PL: 2.1, CZ: 1.6, UA: 4.0, PA: 1.1, NG: 0.5,
		CL: 2.0, AR: 0.8, PE: 1.3, CO: 3.4, AT: 0.6, BE: 1.0, DK: 1.5, FI: 1.9, GR: 2.9, PT: 2.1, RO: 2.5, BG: 2.0, HU: 2.0,
		IR: 3.9, SA: 5.1, AE: 2.3, EG: 1.9, ZA: 0.6, GH: 0.3, KE: 0.8, IL: 4.8, JO: 3.5, LB: 3.0,
	},
}

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

// Metrics with low coverage that should not appear in game rotation
const LOW_COVERAGE_METRICS = [
	'co2EmissionsPerCapita',
	'incarcerationRatePer100k',
	'happinessScore',
	'literacyRatePercent',
	'oilProductionBarrelsPerDay',
	'goldReservesTonnes',
	'avgTemperatureCelsius', // 146 countries - borderline
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
			const value = safeNumber(raw)
			if (value === null) continue
			// Supplemental values are fallback only: keep upstream indicator values when present.
			if (safeNumber(country[metric]) === null) {
				country[metric] = value
			}
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

async function buildIso3ToIso2Map(countryMap) {
	const map = new Map()
	for (const country of countryMap.values()) {
		if (country.cca3) {
			map.set(normalizeString(country.cca3).toUpperCase(), country.cca2)
		}
	}
	return map
}

async function applyWorldBankIndicators(countryMap) {
	const iso3ToIso2 = await buildIso3ToIso2Map(countryMap)
	
	for (const [fieldName, indicatorCode] of Object.entries(WORLD_BANK_INDICATORS)) {
		const label = `World Bank indicator ${indicatorCode}`

		try {
			const byCountry = new Map()
			
			// Fetch first page to get metadata
			const firstPageUrl = `${WORLD_BANK_BASE}/${indicatorCode}?format=json&per_page=300&mrv=5&page=1`
			let metadata
			try {
				const firstPageData = await fetchJson(firstPageUrl, label)
				metadata = firstPageData?.[0]
			} catch (e) {
				// If first page fails, skip metric
				throw new Error(`Failed to fetch first page for ${fieldName}: ${e.message}`)
			}
			
			const totalPages = metadata?.pages ?? 1
			console.log(`  Fetching ${fieldName}: page 1/${totalPages}`)

			// Fetch all pages
			for (let page = 1; page <= Math.min(totalPages, 5); page++) {
				const pageUrl = `${WORLD_BANK_BASE}/${indicatorCode}?format=json&per_page=300&mrv=5&page=${page}`
				let payload
				
				try {
					payload = await fetchJson(pageUrl, `${label} (page ${page})`)
				} catch (e) {
					console.warn(`    Warning: Page ${page} failed, continuing with other pages: ${e.message}`)
					continue
				}
				
				const rows = Array.isArray(payload?.[1]) ? payload[1] : []
				
				for (const row of rows) {
					const iso3 = normalizeString(row?.countryiso3code)?.toUpperCase()
					if (!iso3 || iso3.length !== 3) continue

					const bucket = byCountry.get(iso3) ?? []
					bucket.push(row)
					byCountry.set(iso3, bucket)
				}
				
				if (page < totalPages) {
					console.log(`  Fetching ${fieldName}: page ${page + 1}/${totalPages}`)
				}
			}

			// Map ISO-3 codes to ISO-2 codes and apply to countries
			let appliedCount = 0
			for (const [iso3, metricRows] of byCountry.entries()) {
				const iso2 = iso3ToIso2.get(iso3)
				if (!iso2) continue

				const country = countryMap.get(iso2)
				if (!country) continue

				const value = pickLatestNonNullValue(metricRows)
				if (value !== null) {
					country[fieldName] = value
					appliedCount++
				}
			}

			console.log(`Applied ${fieldName} from ${indicatorCode} (${appliedCount} countries)`)
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

	const metricCounts = {}
	const errors = []

	for (const metric of RANK_METRICS) {
		metricCounts[metric] = 0
	}

	// Phase 1A: Check required fields + count metrics + detect null-ranking corruption
	for (const country of countries) {
		for (const field of requiredFields) {
			if (country[field] === undefined) {
				throw new Error(`Missing required field ${field} for ${country?.name ?? 'unknown'}`)
			}
		}

		// CRITICAL: Check for null metrics with rankings
		for (const metric of RANK_METRICS) {
			const value = safeNumber(country[metric])
			const hasRanking = country.rankings[metric] !== undefined
			
			if (value === null && hasRanking) {
				errors.push(`${country.cca2} has ranking ${country.rankings[metric]} for null metric ${metric}`)
			}
			
			if (value !== null) {
				metricCounts[metric]++
			}
		}
	}

	// Phase 1B: Check for ranking overflow
	for (const metric of RANK_METRICS) {
		const count = metricCounts[metric]
		for (const country of countries) {
			const rank = country.rankings[metric]
			if (rank !== undefined && rank > count) {
				errors.push(`${country.cca2} has invalid rank ${rank} for ${metric} (only ${count} countries with data)`)
			}
		}
	}

	if (errors.length > 0) {
		console.error('VALIDATION ERRORS FOUND:')
		for (const error of errors.slice(0, 20)) {
			console.error(`  ❌ ${error}`)
		}
		if (errors.length > 20) {
			console.error(`  ... and ${errors.length - 20} more errors`)
		}
		throw new Error(`Data validation failed: ${errors.length} error(s) found`)
	}

	console.log('✅ Data validation passed: no null-valued countries have rankings')
	console.log('\nMetric Coverage Summary:')
	for (const metric of RANK_METRICS) {
		console.log(`  ${metric}: ${metricCounts[metric]} countries`)
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
	console.log('Applying supplemental fallback metrics...')
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
