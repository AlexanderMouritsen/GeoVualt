import seedrandom from 'seedrandom'

import type { Country, GeodleFeedback, GeodleDirection, GeodleGuess, GameMode } from '@/types'

export function makeRng(mode: GameMode, seed?: string, dailyDateSeed?: string): () => number {
  const currentDateSeed = dailyDateSeed ?? new Date().toISOString().slice(0, 10)
  const s = seed ?? `${mode}-${currentDateSeed}`
  return seedrandom(s)
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function directionHint(guessVal: number | null, targetVal: number | null): GeodleDirection {
  if (guessVal === null || targetVal === null) return 'unknown'

  const denominator = Math.max(Math.abs(targetVal), 1)
  if (Math.abs(guessVal - targetVal) / denominator < 0.02) return 'exact'

  return guessVal < targetVal ? 'higher' : 'lower'
}

function estimateTemperatureFromLatitude(lat: number): number {
  // Simple heuristic to avoid null-only gameplay: warmer near equator, colder near poles.
  const estimated = 28 - Math.abs(lat) * 0.45
  return Math.max(-20, Math.min(30, estimated))
}

export function comparableTemperature(country: Country): number | null {
  if (country.avgTemperatureCelsius !== null) return country.avgTemperatureCelsius
  if (!Number.isFinite(country.lat)) return null
  return estimateTemperatureFromLatitude(country.lat)
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString()
}

export function formatTemperature(country: Country): string {
  const temp = comparableTemperature(country)
  if (temp === null) return 'N/A'
  const rounded = temp.toFixed(1)
  return country.avgTemperatureCelsius === null ? `~${rounded}°C` : `${rounded}°C`
}

export function isClose(guessVal: number | null, targetVal: number | null): boolean {
  if (guessVal === null || targetVal === null) return false
  const denominator = Math.max(Math.abs(targetVal), 1)
  return Math.abs(guessVal - targetVal) / denominator <= 0.2
}

export function geodleContinentLabel(country: Country): string {
  const region = (country.region || '').trim()
  const subregion = (country.subregion || '').toLowerCase()

  if (region !== 'Americas') {
    return region || 'Unknown'
  }

  if (subregion.includes('south')) {
    return 'South America'
  }

  // Central America and Caribbean are grouped under North America for gameplay labels.
  return 'North America'
}

export function evaluateGeodleGuess(guess: Country, target: Country): GeodleFeedback {
  const isExactMatch = guess.cca2 === target.cca2
  const guessTemp = comparableTemperature(guess)
  const targetTemp = comparableTemperature(target)

  return {
    continentMatch: geodleContinentLabel(guess) === geodleContinentLabel(target),
    landlockedMatch: guess.landlocked === target.landlocked,
    isNeighbor: isExactMatch || target.borders.includes(guess.cca3),
    temperature: directionHint(guessTemp, targetTemp),
    population: directionHint(guess.population, target.population),
    area: directionHint(guess.area, target.area),
    temperatureClose: isClose(guessTemp, targetTemp),
    populationClose: isClose(guess.population, target.population),
    areaClose: isClose(guess.area, target.area),
  }
}

export function geodleTargetPool(countries: Country[]): Country[] {
  return countries.filter((country) => country.population > 50_000 && country.area > 100)
}

export function pickGeodleTarget(countries: Country[], rng: () => number): Country {
  const pool = geodleTargetPool(countries)
  if (pool.length === 0) {
    throw new Error('No valid Geodle target countries available')
  }

  return pool[Math.floor(rng() * pool.length)]
}

export function createGeodleGuess(guess: Country, target: Country): GeodleGuess {
  return {
    guess,
    feedback: evaluateGeodleGuess(guess, target),
  }
}
