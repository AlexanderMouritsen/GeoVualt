import seedrandom from 'seedrandom'

import type { Country, GeodleFeedback, GeodleDirection, GeodleGuess, GameMode } from '@/types'

export const DAILY_DATE_SEED = new Date().toISOString().slice(0, 10)

export function makeRng(mode: GameMode, seed?: string): () => number {
  const s = seed ?? `${mode}-${DAILY_DATE_SEED}`
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

export function isClose(guessVal: number | null, targetVal: number | null): boolean {
  if (guessVal === null || targetVal === null) return false
  const denominator = Math.max(Math.abs(targetVal), 1)
  return Math.abs(guessVal - targetVal) / denominator <= 0.2
}

export function evaluateGeodleGuess(guess: Country, target: Country): GeodleFeedback {
  return {
    continentMatch: guess.region === target.region,
    landlockedMatch: guess.landlocked === target.landlocked,
    isNeighbor: target.borders.includes(guess.cca3),
    temperature: directionHint(guess.avgTemperatureCelsius, target.avgTemperatureCelsius),
    population: directionHint(guess.population, target.population),
    area: directionHint(guess.area, target.area),
    temperatureClose: isClose(guess.avgTemperatureCelsius, target.avgTemperatureCelsius),
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
