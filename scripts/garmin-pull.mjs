#!/usr/bin/env node
/**
 * Pull daily numbers straight from Garmin Connect and write them in the
 * app's import format — the same shape the Log tab's Import button reads,
 * and the same payload the page accepts as #import=… in the URL.
 *
 *   node scripts/garmin-pull.mjs                      last 7 days → garmin/pull-*.json
 *   node scripts/garmin-pull.mjs --from 2026-09-14    from a date through today
 *   node scripts/garmin-pull.mjs --open               …and open the app with it loaded
 *
 * Login: the first run reads your Garmin password from the macOS Keychain
 * (see README) and stores Garmin's OAuth tokens under ~/.workout-block-1/.
 * Later runs use the tokens and never touch the password again.
 *
 * This uses Garmin's own web API through the unofficial garmin-connect
 * package. Garmin's official Health API is partner-only. If Garmin changes
 * something, the fix is `npm update garmin-connect`.
 */
import { GarminConnect } from 'garmin-connect'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEYCHAIN_SERVICE = 'workout-block-1-garmin'
const TOKEN_DIR = join(homedir(), '.workout-block-1', 'garmin-tokens')
const DEFAULT_APP_URL = process.env.APP_URL ?? 'https://alisoltani7596.github.io/workout-block-1/'
const GC_API = 'https://connectapi.garmin.com'

// ---------- dates ----------

export function isoOf(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dateRange(from, to) {
  const out = []
  for (let d = parseISO(from); isoOf(d) <= to; d.setDate(d.getDate() + 1)) out.push(isoOf(d))
  return out
}

// ---------- shaping one day ----------

/** Garmin reports weight in grams; the app wants kilograms to one decimal. */
export function toKg(weight) {
  if (weight == null || !Number.isFinite(weight)) return undefined
  const kg = weight > 500 ? weight / 1000 : weight
  return Math.round(kg * 10) / 10
}

/**
 * The watch's daily intensity-minutes figure counts vigorous minutes
 * double, matching how Garmin scores the weekly goal.
 */
export function intensityMinutes(summary) {
  const mod = summary?.moderateIntensityMinutes ?? 0
  const vig = summary?.vigorousIntensityMinutes ?? 0
  const n = mod + vig * 2
  return n > 0 ? n : undefined
}

function whole(n) {
  return n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

/**
 * Every source is fetched independently and tolerated when missing —
 * a night with no sleep recorded must not lose the day's steps.
 */
export async function pullDay(client, displayName, date) {
  const d = parseISO(date)
  const log = { date, exercises: {} }
  const missing = []

  const attempt = async (label, fn) => {
    try {
      return await fn()
    } catch {
      missing.push(label)
      return undefined
    }
  }

  const summary = await attempt('summary', () =>
    client.get(`${GC_API}/usersummary-service/usersummary/daily/${displayName}?calendarDate=${date}`),
  )
  if (summary) {
    log.activeKcal = whole(summary.activeKilocalories)
    log.totalKcal = whole(summary.totalKilocalories)
    log.intensityMin = intensityMinutes(summary)
    // Highest value of the day is normally the wake-up reading, which is
    // what the plan means by "morning value".
    log.bodyBattery = whole(summary.bodyBatteryHighestValue)
    log.restingHr = whole(summary.restingHeartRate)
    log.steps = whole(summary.totalSteps)
  }

  if (log.steps == null) log.steps = whole(await attempt('steps', () => client.getSteps(d)))

  const sleep = await attempt('sleep', () => client.getSleepData(d))
  log.sleepScore = whole(sleep?.dailySleepDTO?.sleepScores?.overall?.value)

  if (log.restingHr == null) {
    const hr = await attempt('heart rate', () => client.getHeartRate(d))
    log.restingHr = whole(hr?.restingHeartRate)
  }

  const weight = await attempt('weight', () => client.getDailyWeightData(d))
  const entries = weight?.dateWeightList ?? []
  const latest = entries.length ? entries[entries.length - 1] : undefined
  log.weightKg = toKg(latest?.weight)

  // Drop undefined keys so the JSON stays clean.
  for (const k of Object.keys(log)) if (log[k] === undefined) delete log[k]
  return { log, missing }
}

export async function pull(client, displayName, from, to, { onDay } = {}) {
  const logs = {}
  for (const date of dateRange(from, to)) {
    const { log, missing } = await pullDay(client, displayName, date)
    logs[date] = log
    onDay?.(date, log, missing)
    await new Promise((r) => setTimeout(r, 250)) // be polite to Garmin
  }
  return { logs }
}

// ---------- URL for the app ----------

export function importUrl(baseUrl, payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${baseUrl}#import=${b64}`
}

// ---------- login ----------

function keychainPassword(email) {
  try {
    return execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', email, '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

async function connect(email) {
  const client = new GarminConnect({ username: email, password: '' })
  if (existsSync(join(TOKEN_DIR, 'oauth2_token.json'))) {
    client.loadTokenByFile(TOKEN_DIR)
    return client
  }
  const password = keychainPassword(email)
  if (!password) {
    console.error(
      `No Garmin password in the Keychain. Add it once (you will be prompted, nothing is echoed):\n\n` +
        `  security add-generic-password -s ${KEYCHAIN_SERVICE} -a "${email}" -w\n`,
    )
    process.exit(2)
  }
  await client.login(email, password)
  mkdirSync(TOKEN_DIR, { recursive: true })
  client.exportTokenToFile(TOKEN_DIR)
  console.log(`Logged in. Tokens saved to ${TOKEN_DIR}; the password is not needed again.`)
  return client
}

// ---------- cli ----------

function args() {
  const a = process.argv.slice(2)
  const get = (flag) => {
    const i = a.indexOf(flag)
    return i >= 0 ? a[i + 1] : undefined
  }
  const today = isoOf(new Date())
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  return {
    email: get('--email') ?? process.env.GARMIN_EMAIL,
    from: get('--from') ?? isoOf(weekAgo),
    to: get('--to') ?? today,
    open: a.includes('--open'),
    appUrl: get('--url') ?? DEFAULT_APP_URL,
    out: get('--out'),
  }
}

async function main() {
  const opt = args()
  if (!opt.email) {
    console.error('Which Garmin account? Pass --email you@example.com or set GARMIN_EMAIL.')
    process.exit(2)
  }
  const client = await connect(opt.email)
  const profile = await client.getUserProfile()

  console.log(`\n${'date'.padEnd(11)} ${'kg'.padStart(6)} ${'steps'.padStart(6)} ${'kcal'.padStart(5)} ${'sleep'.padStart(5)} ${'batt'.padStart(4)} ${'rhr'.padStart(4)} ${'int'.padStart(4)}`)
  const payload = await pull(client, profile.displayName, opt.from, opt.to, {
    onDay: (date, l, missing) => {
      const c = (v, w) => String(v ?? '—').padStart(w)
      console.log(
        `${date}  ${c(l.weightKg, 6)} ${c(l.steps, 6)} ${c(l.activeKcal, 5)} ${c(l.sleepScore, 5)} ${c(l.bodyBattery, 4)} ${c(l.restingHr, 4)} ${c(l.intensityMin, 4)}` +
          (missing.length ? `   (no ${missing.join(', ')})` : ''),
      )
    },
  })

  mkdirSync('garmin', { recursive: true })
  const out = opt.out ?? join('garmin', `pull-${opt.from}_${opt.to}.json`)
  writeFileSync(out, JSON.stringify(payload, null, 2) + '\n')
  console.log(`\nWrote ${out} — import it from the Log tab, or:`)

  const url = importUrl(opt.appUrl, payload)
  if (opt.open) {
    execFileSync('open', [url])
    console.log(`Opened the app with ${Object.keys(payload.logs).length} days loaded.`)
  } else {
    console.log(`  node scripts/garmin-pull.mjs --from ${opt.from} --open      (opens the app with it loaded)`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`\nGarmin pull failed: ${e?.message ?? e}`)
    console.error('If this started after it used to work, try: npm update garmin-connect')
    process.exit(1)
  })
}
