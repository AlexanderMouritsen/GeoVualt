export type GameMode = 'geodle' | 'georankle' | 'geoconnections' | 'geogrid'

export type MetricKey =
  | 'population'
  | 'area'
  | 'gdpUsd'
  | 'gdpPerCapitaUsd'
  | 'lifeExpectancy'
  | 'humanDevelopmentIndex'
  | 'avgTemperatureCelsius'
  | 'forestAreaPercent'
  | 'co2EmissionsPerCapita'
  | 'renewableEnergyPercent'
  | 'internetUsersPercent'
  | 'literacyRatePercent'
  | 'incarcerationRatePer100k'
  | 'happinessScore'
  | 'tourismArrivals'
  | 'oilProductionBarrelsPerDay'
  | 'goldReservesTonnes'
  | 'militaryExpenditureGdpPercent'

export interface Country {
  cca2: string
  cca3: string
  name: string
  officialName: string

  region: string
  subregion: string
  landlocked: boolean
  borders: string[]
  area: number
  lat: number
  lng: number

  population: number
  gdpUsd: number | null
  gdpPerCapitaUsd: number | null
  lifeExpectancy: number | null
  humanDevelopmentIndex: number | null

  avgTemperatureCelsius: number | null
  forestAreaPercent: number | null
  co2EmissionsPerCapita: number | null
  renewableEnergyPercent: number | null

  internetUsersPercent: number | null
  literacyRatePercent: number | null
  incarcerationRatePer100k: number | null
  happinessScore: number | null

  tourismArrivals: number | null
  oilProductionBarrelsPerDay: number | null
  goldReservesTonnes: number | null
  militaryExpenditureGdpPercent: number | null

  flagUrl: string
  flagEmoji: string

  rankings: Partial<Record<MetricKey, number>>
}

export type GeodleDirection = 'higher' | 'lower' | 'exact' | 'unknown'

export interface GeodleFeedback {
  continentMatch: boolean
  landlockedMatch: boolean
  isNeighbor: boolean
  temperature: GeodleDirection
  population: GeodleDirection
  area: GeodleDirection
  temperatureClose: boolean
  populationClose: boolean
  areaClose: boolean
}

export interface GeodleGuess {
  guess: Country
  feedback: GeodleFeedback
}

export interface GameStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestStreak: number
  lastPlayedDate: string | null
}

export type AllStats = Record<GameMode, GameStats>
