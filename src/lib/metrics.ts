import type { Country, MetricKey } from '@/types'

export type MetricDifficulty = 'easy' | 'medium' | 'hard'
export type MetricCategory = 'size' | 'economy' | 'health' | 'environment' | 'social' | 'military' | 'technology' | 'culture'

export interface MetricDefinition {
  key: MetricKey
  label: string
  category: MetricCategory
  difficulty: MetricDifficulty
  suffix?: string
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: 'population', label: 'Population', category: 'size', difficulty: 'easy' },
  { key: 'area', label: 'Area', category: 'size', difficulty: 'easy', suffix: ' km²' },
  { key: 'gdpUsd', label: 'GDP', category: 'economy', difficulty: 'medium' },
  { key: 'gdpPerCapitaUsd', label: 'GDP per Capita', category: 'economy', difficulty: 'medium' },
  { key: 'tourismArrivals', label: 'Tourism Arrivals', category: 'culture', difficulty: 'medium' },
  { key: 'lifeExpectancy', label: 'Life Expectancy', category: 'health', difficulty: 'medium', suffix: ' years' },
  { key: 'humanDevelopmentIndex', label: 'Human Development Index', category: 'health', difficulty: 'hard' },
  { key: 'avgTemperatureCelsius', label: 'Average Temperature', category: 'environment', difficulty: 'medium', suffix: ' °C' },
  { key: 'forestAreaPercent', label: 'Forest Area', category: 'environment', difficulty: 'medium', suffix: '%' },
  { key: 'co2EmissionsPerCapita', label: 'CO2 Emissions per Capita', category: 'environment', difficulty: 'hard', suffix: ' t' },
  { key: 'renewableEnergyPercent', label: 'Renewable Energy Share', category: 'technology', difficulty: 'medium', suffix: '%' },
  { key: 'internetUsersPercent', label: 'Internet Users', category: 'technology', difficulty: 'medium', suffix: '%' },
  { key: 'literacyRatePercent', label: 'Literacy Rate', category: 'social', difficulty: 'medium', suffix: '%' },
  { key: 'incarcerationRatePer100k', label: 'Incarceration Rate', category: 'social', difficulty: 'hard', suffix: ' /100k' },
  { key: 'happinessScore', label: 'Happiness Score', category: 'culture', difficulty: 'hard' },
  { key: 'oilProductionBarrelsPerDay', label: 'Oil Production', category: 'economy', difficulty: 'hard', suffix: ' bbl/day' },
  { key: 'goldReservesTonnes', label: 'Gold Reserves', category: 'economy', difficulty: 'hard', suffix: ' tonnes' },
  { key: 'militaryExpenditureGdpPercent', label: 'Military Expenditure / GDP', category: 'military', difficulty: 'hard', suffix: '%' },
]

const METRIC_MAP = new Map<MetricKey, MetricDefinition>(
  METRIC_DEFINITIONS.map((definition) => [definition.key, definition]),
)

export function getMetricDefinition(key: MetricKey): MetricDefinition {
  const definition = METRIC_MAP.get(key)
  if (!definition) {
    throw new Error(`Unknown metric key: ${key}`)
  }

  return definition
}

export function metricValue(country: Country, key: MetricKey): number | null {
  const value = country[key]
  return typeof value === 'number' ? value : null
}

export function formatMetricValue(country: Country, key: MetricKey): string {
  const definition = getMetricDefinition(key)
  const value = metricValue(country, key)
  if (value === null) return 'N/A'

  if (key === 'population' || key === 'tourismArrivals' || key === 'oilProductionBarrelsPerDay') {
    return `${Math.round(value).toLocaleString()}${definition.suffix ?? ''}`
  }

  if (key === 'gdpUsd' || key === 'gdpPerCapitaUsd') {
    return `$${Math.round(value).toLocaleString()}`
  }

  if (key === 'area' || key === 'goldReservesTonnes') {
    return `${Math.round(value).toLocaleString()}${definition.suffix ?? ''}`
  }

  if (Math.abs(value) >= 100) {
    return `${Math.round(value).toLocaleString()}${definition.suffix ?? ''}`
  }

  return `${value.toFixed(2)}${definition.suffix ?? ''}`
}
