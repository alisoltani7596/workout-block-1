import { firstDate, lastDate } from './program'

export function todayISO(): string {
  const d = new Date()
  return isoOf(d)
}

export function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD as a local date, not UTC. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

export type BlockPosition = 'before' | 'inside' | 'after'

export function positionInBlock(iso: string): BlockPosition {
  if (iso < firstDate) return 'before'
  if (iso > lastDate) return 'after'
  return 'inside'
}

/** Clamp any date to the nearest day inside the block. */
export function clampToBlock(iso: string): string {
  if (iso < firstDate) return firstDate
  if (iso > lastDate) return lastDate
  return iso
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function weekdayOf(iso: string): string {
  return WEEKDAY[parseISO(iso).getDay()]
}

export function isFriday(iso: string): boolean {
  return parseISO(iso).getDay() === 5
}

/** "Mon 14 Sep" */
export function shortDate(iso: string): string {
  const d = parseISO(iso)
  return `${WEEKDAY[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTH[d.getMonth()]}`
}

/** "14 Sep" */
export function dayMonth(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTH[d.getMonth()]}`
}
