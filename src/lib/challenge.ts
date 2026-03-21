export const APP_LAUNCH_DATE = '2026-03-21'

function toUtcMidnightMs(dateIso: string): number {
  const [year, month, day] = dateIso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeChallengeDate(input?: string | null): string {
  const today = getTodayIso()
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return today
  }

  const launchMs = toUtcMidnightMs(APP_LAUNCH_DATE)
  const requestedMs = toUtcMidnightMs(input)
  const todayMs = toUtcMidnightMs(today)

  if (Number.isNaN(requestedMs)) return today
  if (requestedMs < launchMs) return APP_LAUNCH_DATE
  if (requestedMs > todayMs) return today

  return input
}

export function getChallengeNumber(dateIso: string): number {
  const launchMs = toUtcMidnightMs(APP_LAUNCH_DATE)
  const currentMs = toUtcMidnightMs(normalizeChallengeDate(dateIso))
  const diffDays = Math.floor((currentMs - launchMs) / 86_400_000)
  return Math.max(1, diffDays + 1)
}

export function challengeDateFromNumber(challengeNumber: number): string {
  const safeNumber = Math.max(1, Math.floor(challengeNumber))
  const launchMs = toUtcMidnightMs(APP_LAUNCH_DATE)
  const challengeMs = launchMs + (safeNumber - 1) * 86_400_000
  const date = new Date(challengeMs)
  return date.toISOString().slice(0, 10)
}
