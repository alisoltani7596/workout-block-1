// Exercises the shaping logic with a fake Garmin client — the real API needs
// the user's account, so this proves the JSON the app receives is right.
import { pull, pullDay, toKg, intensityMinutes, importUrl, dateRange } from './garmin-pull.mjs'
import assert from 'node:assert/strict'

const days = {
  '2026-09-14': {
    summary: { activeKilocalories: 396.4, totalKilocalories: 2210, moderateIntensityMinutes: 12, vigorousIntensityMinutes: 7, bodyBatteryHighestValue: 71, restingHeartRate: 54, totalSteps: 4812 },
    sleep: { dailySleepDTO: { sleepScores: { overall: { value: 74 } } } },
    weight: { dateWeightList: [{ weight: 93600 }, { weight: 93400 }] },
  },
  // a day with no sleep recorded and no weigh-in: must still yield steps
  '2026-09-15': {
    summary: { activeKilocalories: 120, totalKilocalories: 1900, moderateIntensityMinutes: 0, vigorousIntensityMinutes: 0, bodyBatteryHighestValue: 40, restingHeartRate: 56, totalSteps: 3105 },
    sleep: null, weight: { dateWeightList: [] },
  },
}
const iso = (d) => d.toISOString().slice(0, 10) // the fake runs in UTC-safe territory for these dates
const client = {
  get: async (url) => { const date = url.match(/calendarDate=(\S+)/)[1]; return days[date].summary },
  getSteps: async () => { throw new Error('unused') },
  getSleepData: async (d) => { const s = days[iso(d)].sleep; if (!s) throw new Error('no sleep'); return s },
  getHeartRate: async () => { throw new Error('unused') },
  getDailyWeightData: async (d) => days[iso(d)].weight,
}

assert.equal(toKg(93400), 93.4)
assert.equal(toKg(93.44), 93.4)
assert.equal(toKg(undefined), undefined)
assert.equal(intensityMinutes({ moderateIntensityMinutes: 12, vigorousIntensityMinutes: 7 }), 26)
assert.equal(intensityMinutes({ moderateIntensityMinutes: 0, vigorousIntensityMinutes: 0 }), undefined)
assert.deepEqual(dateRange('2026-09-14', '2026-09-16'), ['2026-09-14', '2026-09-15', '2026-09-16'])

const one = await pullDay(client, 'abc', '2026-09-14')
assert.deepEqual(one.log, { date: '2026-09-14', exercises: {}, activeKcal: 396, totalKcal: 2210, intensityMin: 26, bodyBattery: 71, restingHr: 54, steps: 4812, sleepScore: 74, weightKg: 93.4 })
assert.deepEqual(one.missing, [])

const two = await pullDay(client, 'abc', '2026-09-15')
assert.deepEqual(two.log, { date: '2026-09-15', exercises: {}, activeKcal: 120, totalKcal: 1900, bodyBattery: 40, restingHr: 56, steps: 3105 })
assert.deepEqual(two.missing, ['sleep'])

const payload = await pull(client, 'abc', '2026-09-14', '2026-09-15')
assert.deepEqual(Object.keys(payload.logs), ['2026-09-14', '2026-09-15'])

const url = importUrl('https://example.test/app/', payload)
assert.ok(url.startsWith('https://example.test/app/#import='))
const decoded = JSON.parse(Buffer.from(url.split('#import=')[1], 'base64url').toString())
assert.deepEqual(decoded, payload)
console.log(`PASS — url is ${url.length} chars for 2 days (${Math.round(url.length / 2)} per day)`)
