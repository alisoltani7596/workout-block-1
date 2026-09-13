import { library } from './program'
import type { DayLog, Store } from './store'

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
  const header = [...COLUMNS, 'exercises']
  const rows = Object.keys(logs)
    .sort()
    .map((date) => {
      const log = logs[date]
      const cells = COLUMNS.map((c) => cell(log[c]))
      cells.push(cell(flattenExercises(log)))
      return cells.join(',')
    })
  return [header.join(','), ...rows].join('\r\n')
}

function flattenExercises(log: DayLog): string {
  return Object.entries(log.exercises)
    .map(([key, sets]) => {
      const name = library[key]?.name ?? key
      const parts = sets
        .filter((s) => s.done || s.weightKg != null || s.reps != null)
        .map((s) => {
          const w = s.weightKg != null ? `${s.weightKg}kg` : ''
          const r = s.reps != null ? `x${s.reps}` : ''
          const mark = s.done ? '' : '(not done)'
          return `${w}${r}${mark}` || (s.done ? 'done' : '')
        })
        .filter(Boolean)
      return parts.length ? `${name}: ${parts.join(' ')}` : ''
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
