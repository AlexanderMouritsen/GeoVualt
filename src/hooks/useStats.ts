'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { AllStats, GameMode, GameStats } from '@/types'

export const STORAGE_KEY = 'geovault-stats'

const MODES: GameMode[] = ['geodle', 'georankle', 'geoconnections', 'geogrid']

function makeDefaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
  }
}

function buildDefaultAllStats(): AllStats {
  return {
    geodle: makeDefaultStats(),
    georankle: makeDefaultStats(),
    geoconnections: makeDefaultStats(),
    geogrid: makeDefaultStats(),
  }
}

function asIsoDate(date?: string): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return new Date().toISOString().slice(0, 10)
}

function isYesterday(previous: string, current: string): boolean {
  const prev = new Date(`${previous}T00:00:00.000Z`)
  const curr = new Date(`${current}T00:00:00.000Z`)
  const diffMs = curr.getTime() - prev.getTime()
  return diffMs === 24 * 60 * 60 * 1000
}

function safeParse(raw: string | null): AllStats {
  if (!raw) return buildDefaultAllStats()

  try {
    const parsed = JSON.parse(raw) as Partial<AllStats>
    const defaults = buildDefaultAllStats()

    for (const mode of MODES) {
      const item = parsed?.[mode]
      if (!item) continue

      defaults[mode] = {
        gamesPlayed: Number.isFinite(item.gamesPlayed) ? item.gamesPlayed : 0,
        gamesWon: Number.isFinite(item.gamesWon) ? item.gamesWon : 0,
        currentStreak: Number.isFinite(item.currentStreak) ? item.currentStreak : 0,
        bestStreak: Number.isFinite(item.bestStreak) ? item.bestStreak : 0,
        lastPlayedDate: typeof item.lastPlayedDate === 'string' ? item.lastPlayedDate : null,
      }
    }

    return defaults
  } catch {
    return buildDefaultAllStats()
  }
}

export function updateStatsForResult(prev: GameStats, won: boolean, playDate: string): GameStats {
  const normalizedDate = asIsoDate(playDate)
  const nextPlayed = prev.gamesPlayed + 1

  if (!won) {
    return {
      ...prev,
      gamesPlayed: nextPlayed,
      currentStreak: 0,
      lastPlayedDate: normalizedDate,
    }
  }

  let nextStreak = prev.currentStreak

  if (prev.lastPlayedDate === normalizedDate) {
    nextStreak = Math.max(prev.currentStreak, 1)
  } else if (prev.lastPlayedDate && isYesterday(prev.lastPlayedDate, normalizedDate)) {
    nextStreak = prev.currentStreak + 1
  } else {
    nextStreak = 1
  }

  return {
    ...prev,
    gamesPlayed: nextPlayed,
    gamesWon: prev.gamesWon + 1,
    currentStreak: nextStreak,
    bestStreak: Math.max(prev.bestStreak, nextStreak),
    lastPlayedDate: normalizedDate,
  }
}

export function summarizeStats(stats: AllStats): {
  totalGamesPlayed: number
  totalGamesWon: number
  bestStreak: number
  winRate: number
} {
  const totalGamesPlayed = MODES.reduce((sum, mode) => sum + stats[mode].gamesPlayed, 0)
  const totalGamesWon = MODES.reduce((sum, mode) => sum + stats[mode].gamesWon, 0)
  const bestStreak = MODES.reduce((best, mode) => Math.max(best, stats[mode].bestStreak), 0)
  const winRate = totalGamesPlayed > 0 ? (totalGamesWon / totalGamesPlayed) * 100 : 0

  return { totalGamesPlayed, totalGamesWon, bestStreak, winRate }
}

export function useStats() {
  const [stats, setStats] = useState<AllStats>(() => buildDefaultAllStats())
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const nextStats = safeParse(window.localStorage.getItem(STORAGE_KEY))
    setStats(nextStats)
    setIsReady(true)
  }, [])

  const persist = useCallback((nextStats: AllStats) => {
    setStats(nextStats)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats))
    }
  }, [])

  const recordResult = useCallback(
    (mode: GameMode, won: boolean, date?: string) => {
      const playDate = asIsoDate(date)
      const current = typeof window !== 'undefined' ? safeParse(window.localStorage.getItem(STORAGE_KEY)) : stats
      const next = {
        ...current,
        [mode]: updateStatsForResult(current[mode], won, playDate),
      }
      persist(next)
    },
    [persist, stats],
  )

  const summary = useMemo(() => summarizeStats(stats), [stats])

  return {
    stats,
    summary,
    isReady,
    recordResult,
  }
}
