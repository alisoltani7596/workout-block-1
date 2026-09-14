import { useCallback, useEffect, useState } from 'react'
import { meta } from './program'

export type Tier = 'best' | 'must' | 'missed' | 'skipped'

export type SetLog = {
  setIndex: number
  weightKg?: number
  reps?: number
  seconds?: number
  minutes?: number
  km?: number
  done: boolean
}

/** 1 = far too easy, 3 = about right, 5 = too hard. Feeds next month's plan. */
export type Feel = 1 | 2 | 3 | 4 | 5

export type ExerciseFeedback = {
  feel?: Feel
  note?: string
}

export type MorningStretch = {
  done: boolean
  minutes?: number
}

export type DayLog = {
  date: string // YYYY-MM-DD
  weightKg?: number
  steps?: number
  activeKcal?: number
  totalKcal?: number
  sleepScore?: number // 0-100 from Garmin
  bodyBattery?: number // morning value
  restingHr?: number
  intensityMin?: number
  tier?: Tier
  rpe?: number // 1-10, how hard the session felt
  footballLast20?: number // 1-10, only shown on Friday
  exercises: Record<string, SetLog[]> // key = exerciseLibrary key
  notes?: string
  /** Index-keyed ticks for habits.must, per day. */
  habits?: Record<number, boolean>
  /** The daily 10-15 minute mobility block, separate from the session. */
  morningStretch?: MorningStretch
  /** How each exercise felt, keyed by exerciseLibrary key. */
  feedback?: Record<string, ExerciseFeedback>
}

export type Settings = {
  theme: 'dark' | 'light'
}

export type Store = {
  version: 1
  settings: Settings
  logs: Record<string, DayLog>
}

const KEY = 'workout-block-1/v1'

export function emptyLog(date: string): DayLog {
  return { date, exercises: {} }
}

function seed(): Store {
  return {
    version: 1,
    settings: { theme: 'dark' },
    logs: {
      [meta.startWeightDate]: {
        ...emptyLog(meta.startWeightDate),
        weightKg: meta.startWeightKg,
      },
    },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Tolerant of hand-edited or older payloads; anything unrecognised is dropped. */
export function normalize(input: unknown): Store {
  const base = seed()
  if (!isRecord(input)) return base
  const logsIn = isRecord(input.logs) ? input.logs : {}
  const logs: Record<string, DayLog> = {}
  for (const [date, value] of Object.entries(logsIn)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRecord(value)) continue
    const ex: Record<string, SetLog[]> = {}
    const exIn = isRecord(value.exercises) ? value.exercises : {}
    for (const [key, sets] of Object.entries(exIn)) {
      if (!Array.isArray(sets)) continue
      ex[key] = sets
        .filter(isRecord)
        .map((s, i) => ({
          setIndex: typeof s.setIndex === 'number' ? s.setIndex : i,
          weightKg: num(s.weightKg),
          reps: num(s.reps),
          seconds: num(s.seconds),
          minutes: num(s.minutes),
          km: num(s.km),
          done: s.done === true,
        }))
    }
    logs[date] = {
      date,
      weightKg: num(value.weightKg),
      steps: num(value.steps),
      activeKcal: num(value.activeKcal),
      totalKcal: num(value.totalKcal),
      sleepScore: num(value.sleepScore),
      bodyBattery: num(value.bodyBattery),
      restingHr: num(value.restingHr),
      intensityMin: num(value.intensityMin),
      tier: isTier(value.tier) ? value.tier : undefined,
      rpe: num(value.rpe),
      footballLast20: num(value.footballLast20),
      notes: typeof value.notes === 'string' ? value.notes : undefined,
      habits: isRecord(value.habits) ? (value.habits as Record<number, boolean>) : undefined,
      morningStretch: isRecord(value.morningStretch)
        ? { done: value.morningStretch.done === true, minutes: num(value.morningStretch.minutes) }
        : undefined,
      feedback: normalizeFeedback(value.feedback),
      exercises: ex,
    }
  }
  // The seed weigh-in is only re-added if the payload has nothing for that date.
  if (!logs[meta.startWeightDate]) {
    logs[meta.startWeightDate] = base.logs[meta.startWeightDate]
  }
  const settings = isRecord(input.settings) ? input.settings : {}
  return {
    version: 1,
    settings: { theme: settings.theme === 'light' ? 'light' : 'dark' },
    logs,
  }
}

function normalizeFeedback(input: unknown): Record<string, ExerciseFeedback> | undefined {
  if (!isRecord(input)) return undefined
  const out: Record<string, ExerciseFeedback> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!isRecord(value)) continue
    const feel = num(value.feel)
    const note = typeof value.note === 'string' && value.note ? value.note : undefined
    const clean: ExerciseFeedback = {
      feel: feel != null && feel >= 1 && feel <= 5 ? (Math.round(feel) as Feel) : undefined,
      note,
    }
    if (clean.feel != null || clean.note != null) out[key] = clean
  }
  return Object.keys(out).length ? out : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function isTier(v: unknown): v is Tier {
  return v === 'best' || v === 'must' || v === 'missed' || v === 'skipped'
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    return normalize(JSON.parse(raw))
  } catch {
    return seed()
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Private mode or a full quota: keep the session usable in memory.
  }
}

/* A tiny external store so every screen sees the same data without a provider. */
let current: Store = read()
const listeners = new Set<() => void>()

function setStore(next: Store) {
  current = next
  write(next)
  listeners.forEach((fn) => fn())
}

export function useStore() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  const updateLog = useCallback((date: string, patch: Partial<DayLog>) => {
    const prev = current.logs[date] ?? emptyLog(date)
    setStore({
      ...current,
      logs: { ...current.logs, [date]: { ...prev, ...patch, date } },
    })
  }, [])

  const setSets = useCallback((date: string, exKey: string, sets: SetLog[]) => {
    const prev = current.logs[date] ?? emptyLog(date)
    setStore({
      ...current,
      logs: {
        ...current.logs,
        [date]: { ...prev, date, exercises: { ...prev.exercises, [exKey]: sets } },
      },
    })
  }, [])

  const setFeedback = useCallback((date: string, exKey: string, patch: Partial<ExerciseFeedback>) => {
    const prev = current.logs[date] ?? emptyLog(date)
    const merged = { ...(prev.feedback?.[exKey] ?? {}), ...patch }
    setStore({
      ...current,
      logs: {
        ...current.logs,
        [date]: { ...prev, date, feedback: { ...(prev.feedback ?? {}), [exKey]: merged } },
      },
    })
  }, [])

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    setStore({ ...current, settings: { ...current.settings, theme } })
  }, [])

  const replaceAll = useCallback((incoming: unknown) => {
    setStore(normalize(incoming))
  }, [])

  return {
    store: current,
    logs: current.logs,
    settings: current.settings,
    logFor: (date: string): DayLog => current.logs[date] ?? emptyLog(date),
    updateLog,
    setSets,
    setFeedback,
    setTheme,
    replaceAll,
  }
}

/** Dates with any logged content, oldest first. */
export function loggedDates(logs: Record<string, DayLog>): string[] {
  return Object.keys(logs).sort()
}

const NUMERIC_FIELDS = ['weightKg', 'reps', 'seconds', 'minutes', 'km'] as const

function hasNumber(s: SetLog): boolean {
  return NUMERIC_FIELDS.some((f) => s[f] != null)
}

/**
 * The most recent recorded set of this exercise before `date`, for the
 * "last: 20 kg x 10" hint. The caller formats it against the exercise's
 * own metrics.
 */
export function lastPerformance(
  logs: Record<string, DayLog>,
  exKey: string,
  before: string,
): { date: string; set: SetLog } | null {
  const dates = Object.keys(logs)
    .filter((d) => d < before)
    .sort()
    .reverse()
  for (const d of dates) {
    const sets = logs[d].exercises[exKey]
    if (!sets?.length) continue
    const useful = sets.filter(hasNumber)
    if (!useful.length) continue
    // The best set of that day: heaviest, then longest, then most reps.
    const best = useful.reduce((a, b) => (score(b) > score(a) ? b : a))
    return { date: d, set: best }
  }
  return null
}

/** Ranks sets within one day so the hint shows the best effort, not the first. */
function score(s: SetLog): number {
  return (
    (s.weightKg ?? 0) * 1000 +
    (s.km ?? 0) * 100 +
    (s.minutes ?? 0) * 10 +
    (s.seconds ?? 0) +
    (s.reps ?? 0)
  )
}
