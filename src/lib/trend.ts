import { meta } from './program'
import { daysBetween } from './dates'
import type { DayLog, Tier } from './store'

/**
 * 7-day exponentially weighted trend over the logged weigh-ins.
 * Gaps between weigh-ins are respected: the smoothing constant is applied
 * once per elapsed day, so a week-long gap moves the trend the full way.
 */
export function weightTrend(
  logs: Record<string, DayLog>,
): { date: string; weightKg: number; trend: number }[] {
  const points = Object.values(logs)
    .filter((l): l is DayLog & { weightKg: number } => typeof l.weightKg === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))

  const alpha = 2 / (7 + 1)
  const out: { date: string; weightKg: number; trend: number }[] = []
  let trend: number | null = null
  let prevDate: string | null = null

  for (const p of points) {
    if (trend == null) {
      trend = p.weightKg
    } else {
      const gap = Math.max(1, daysBetween(prevDate as string, p.date))
      const a = 1 - Math.pow(1 - alpha, gap)
      trend = trend + a * (p.weightKg - trend)
    }
    prevDate = p.date
    out.push({ date: p.date, weightKg: p.weightKg, trend: round1(trend) })
  }
  return out
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/** The planned weight on a given date: a straight line from start to target. */
export function targetWeightOn(date: string): number {
  const span = daysBetween(meta.startWeightDate, meta.endDate)
  const elapsed = Math.min(Math.max(daysBetween(meta.startWeightDate, date), 0), span)
  const drop = meta.startWeightKg - meta.targetWeightKgByEnd
  return meta.startWeightKg - (drop * elapsed) / span
}

export type WeightSummary = {
  trendNow: number | null
  changeSinceStart: number | null
  projectedEnd: number | null
  slopePerWeek: number | null
  points: number
}

export function weightSummary(logs: Record<string, DayLog>): WeightSummary {
  const series = weightTrend(logs)
  if (series.length === 0) {
    return { trendNow: null, changeSinceStart: null, projectedEnd: null, slopePerWeek: null, points: 0 }
  }
  const last = series[series.length - 1]
  const changeSinceStart = round1(last.trend - meta.startWeightKg)

  // A projection off two adjacent mornings is noise wearing a number's
  // clothes, so it stays hidden until the trend has a week to stand on.
  const span = daysBetween(series[0].date, last.date)
  if (series.length < 3 || span < 7) {
    return {
      trendNow: last.trend,
      changeSinceStart,
      projectedEnd: null,
      slopePerWeek: null,
      points: series.length,
    }
  }

  // Least squares on the trend line against elapsed days, so the projection
  // leans on the whole run rather than the last two mornings.
  const xs = series.map((p) => daysBetween(series[0].date, p.date))
  const ys = series.map((p) => p.trend)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = den === 0 ? 0 : num / den // kg per day
  const daysToEnd = daysBetween(last.date, meta.endDate)
  const projectedEnd = round1(last.trend + slope * Math.max(daysToEnd, 0))

  return {
    trendNow: last.trend,
    changeSinceStart,
    projectedEnd,
    slopePerWeek: Math.round(slope * 7 * 100) / 100,
    points: series.length,
  }
}

const DONE: Tier[] = ['best', 'must']

export function isDone(tier?: Tier): boolean {
  return tier != null && DONE.includes(tier)
}

/** Consecutive completed sessions counting back from the most recent logged tier. */
export function currentStreak(logs: Record<string, DayLog>, orderedDates: string[]): number {
  let streak = 0
  for (let i = orderedDates.length - 1; i >= 0; i--) {
    const tier = logs[orderedDates[i]]?.tier
    if (tier == null) continue // a day with no verdict yet neither breaks nor extends
    if (isDone(tier)) streak++
    else break
  }
  return streak
}
