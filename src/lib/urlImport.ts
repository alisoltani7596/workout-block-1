import type { DayLog, Tier } from './store'
import { todayISO } from './dates'

/**
 * Two ways for something outside the page to hand it numbers:
 *
 *   #log?date=2026-09-14&steps=4812&activeKcal=396     one day, plain fields
 *   #import=<base64url JSON of { logs: { date: {...} } }>  many days at once
 *
 * The first is what an iOS Shortcut can build from Apple Health in a Text
 * action. The second is what the Garmin puller opens after a run. Both merge
 * field by field into the existing day and never touch sets or feedback.
 */

const NUMERIC = [
  'weightKg',
  'steps',
  'activeKcal',
  'totalKcal',
  'sleepScore',
  'bodyBattery',
  'restingHr',
  'intensityMin',
  'rpe',
  'footballLast20',
] as const satisfies readonly (keyof DayLog)[]

type NumericField = (typeof NUMERIC)[number]

export type Incoming = Partial<Pick<DayLog, NumericField | 'tier' | 'notes'>>

export type ParsedImport = {
  days: Record<string, Incoming>
  source: 'log' | 'import'
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function isTier(v: string): v is Tier {
  return v === 'best' || v === 'must' || v === 'missed' || v === 'skipped'
}

function fromParams(params: URLSearchParams): Incoming {
  const out: Incoming = {}
  for (const f of NUMERIC) {
    const raw = params.get(f)
    if (raw == null || raw === '') continue
    const n = Number(raw)
    if (Number.isFinite(n)) out[f] = n
  }
  const tier = params.get('tier')
  if (tier && isTier(tier)) out.tier = tier
  const notes = params.get('notes')
  if (notes) out.notes = notes
  return out
}

function decodeBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Parse the hash without side effects; null when it carries nothing for us. */
export function parseImportHash(hash: string): ParsedImport | null {
  if (!hash || hash.length < 2) return null
  const body = hash.slice(1)

  if (body.startsWith('log?') || body.startsWith('log&')) {
    const params = new URLSearchParams(body.slice(4))
    const date = params.get('date') ?? todayISO()
    if (!DATE.test(date)) return null
    const fields = fromParams(params)
    if (!Object.keys(fields).length) return null
    return { days: { [date]: fields }, source: 'log' }
  }

  if (body.startsWith('import=')) {
    try {
      // Read the payload directly rather than through normalize(), which
      // would re-add the seed weigh-in and count it as imported.
      const raw: unknown = JSON.parse(decodeBase64Url(body.slice(7)))
      const logs =
        typeof raw === 'object' && raw !== null && 'logs' in raw
          ? (raw as { logs: unknown }).logs
          : raw
      if (typeof logs !== 'object' || logs === null) return null
      const days: Record<string, Incoming> = {}
      for (const [date, value] of Object.entries(logs as Record<string, unknown>)) {
        if (!DATE.test(date) || typeof value !== 'object' || value === null) continue
        const log = value as Record<string, unknown>
        const fields: Incoming = {}
        for (const f of NUMERIC) {
          const v = log[f]
          if (typeof v === 'number' && Number.isFinite(v)) fields[f] = v
        }
        if (typeof log.tier === 'string' && isTier(log.tier)) fields.tier = log.tier
        if (typeof log.notes === 'string' && log.notes) fields.notes = log.notes
        if (Object.keys(fields).length) days[date] = fields
      }
      if (!Object.keys(days).length) return null
      return { days, source: 'import' }
    } catch {
      return null
    }
  }

  return null
}

export function countFields(p: ParsedImport): number {
  return Object.values(p.days).reduce((n, d) => n + Object.keys(d).length, 0)
}

/** Encode many days for the #import= form, for scripts and tests. */
export function encodeImport(logs: Record<string, Incoming & { date?: string }>): string {
  const json = JSON.stringify({ logs })
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
