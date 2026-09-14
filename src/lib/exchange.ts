import { METRIC, library, metricsFor } from './program'
import type { DayLog, Store } from './store'
import { FEEL_SCALE } from '../components/FeelPicker'

const KEY = 'workout-block-1/v1'

export function toJson(): string {
  const raw = localStorage.getItem(KEY)
  const store: Store | null = raw ? JSON.parse(raw) : null
  return JSON.stringify(
    { app: 'workout-block-1', exportedAt: new Date().toISOString(), ...(store ?? {}) },
    null,
    2,
  )
}

const COLUMNS = [
  'date',
  'weightKg',
  'steps',
  'activeKcal',
  'totalKcal',
  'sleepScore',
  'bodyBattery',
  'restingHr',
  'intensityMin',
  'tier',
  'rpe',
  'footballLast20',
  'notes',
] as const

/**
 * One row per day, with the set-by-set work flattened into a single column so
 * a spreadsheet stays readable. The JSON export is the lossless one.
 */
export function toCsv(logs: Record<string, DayLog>): string {
  const header = [...COLUMNS, 'morningStretchMin', 'exercises', 'exerciseFeedback']
  const rows = Object.keys(logs)
    .sort()
    .map((date) => {
      const log = logs[date]
      const cells = COLUMNS.map((c) => cell(log[c]))
      cells.push(cell(log.morningStretch?.done ? (log.morningStretch.minutes ?? 'done') : ''))
      cells.push(cell(flattenExercises(log)))
      cells.push(cell(flattenFeedback(log)))
      return cells.join(',')
    })
  return [header.join(','), ...rows].join('\r\n')
}

function flattenExercises(log: DayLog): string {
  return Object.entries(log.exercises)
    .map(([key, sets]) => {
      const name = library[key]?.name ?? key
      const metrics = metricsFor(key)
      const parts = sets
        .filter((s) => s.done || metrics.some((m) => s[m] != null))
        .map((s) => {
          const measured = metrics
            .filter((m) => s[m] != null)
            .map((m) => `${s[m]}${METRIC[m].suffix}`)
            .join('/')
          const mark = s.done ? '' : '(not done)'
          return `${measured || (s.done ? 'done' : '')}${mark}`
        })
        .filter(Boolean)
      return parts.length ? `${name}: ${parts.join(' ')}` : ''
    })
    .filter(Boolean)
    .join(' | ')
}

/** The month-2 material: how each exercise felt, in the athlete's words. */
function flattenFeedback(log: DayLog): string {
  return Object.entries(log.feedback ?? {})
    .map(([key, fb]) => {
      const name = library[key]?.name ?? key
      const feel = FEEL_SCALE.find((f) => f.value === fb.feel)?.short
      const bits = [feel, fb.note].filter(Boolean).join(' — ')
      return bits ? `${name}: ${bits}` : ''
    })
    .filter(Boolean)
    .join(' | ')
}

function cell(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
