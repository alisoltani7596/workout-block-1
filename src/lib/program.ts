import raw from '../data/plan.json'

export type DayType = 'strength' | 'cardio' | 'sport' | 'recovery' | 'admin'
export type TierName = 'must' | 'best'

export interface LibraryEntry {
  name: string
  dbId: string | null
  equipment: string
  cue: string
}

export interface PlanItem {
  ex: string
  sets: number
  reps: string
  rest?: string
  superset?: string
}

export interface TierBlock {
  durationMin: number
  items: PlanItem[]
}

export interface TargetPair {
  must: number
  best: number
}

export interface ProgramDay {
  date: string
  weekday: string
  week: number
  title: string
  type: DayType
  focus: string
  must: TierBlock
  best: TierBlock
  missed: string
  targets: { steps: TargetPair; walkMin: TargetPair; activeKcal: TargetPair }
  coachNote: string
}

export interface Program {
  meta: {
    athlete: string
    blockName: string
    startDate: string
    endDate: string
    reviewDate: string
    startWeightKg: number
    startWeightDate: string
    targetWeightKgByEnd: number
    targetRateKgPerWeek: number
    goal: string
    equipment: string[]
    sessionCapMin: number
    fixed: Record<string, string>
    tierLogic: Record<string, string>
    imageSource: {
      dataset: string
      jsonUrl: string
      imageBaseUrl: string
      note: string
    }
  }
  exerciseLibrary: Record<string, LibraryEntry>
  days: ProgramDay[]
  habits: { must: string[]; best: string[] }
  rules: string[]
}

/** Read-only program data, bundled at build time. Never mutated. */
export const program = raw as unknown as Program

export const meta = program.meta
export const days = program.days
export const library = program.exerciseLibrary
export const habits = program.habits
export const rules = program.rules

export const firstDate = days[0].date
export const lastDate = days[days.length - 1].date

export function dayFor(date: string): ProgramDay | undefined {
  return days.find((d) => d.date === date)
}

export function exercise(key: string): LibraryEntry {
  return (
    library[key] ?? { name: key, dbId: null, equipment: '', cue: '' }
  )
}

/** Parse a rest string like "90 s" or "2 min" into seconds. */
export function restSeconds(rest?: string): number | null {
  if (!rest) return null
  const m = rest.match(/([\d.]+)\s*(s|sec|min|m)\b/i)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  return Math.round(unit.startsWith('m') && unit !== 's' ? n * 60 : n)
}

export const weeks = [...new Set(days.map((d) => d.week))].sort((a, b) => a - b)

/* ------------------------------------------------------------------ *
 * What each exercise is actually measured in.
 * A plank is seconds, a bike ride is minutes and kilometres, and a
 * push-up is just reps — asking for kilograms on any of them is noise.
 * ------------------------------------------------------------------ */

export type MetricKey = 'weightKg' | 'reps' | 'seconds' | 'minutes' | 'km'

export const METRIC: Record<MetricKey, { suffix: string; step: number; label: string }> = {
  weightKg: { suffix: 'kg', step: 0.5, label: 'weight in kilograms' },
  reps: { suffix: 'reps', step: 1, label: 'reps' },
  seconds: { suffix: 's', step: 5, label: 'seconds held' },
  minutes: { suffix: 'min', step: 1, label: 'minutes' },
  km: { suffix: 'km', step: 0.1, label: 'kilometres' },
}

const LOADED: MetricKey[] = ['weightKg', 'reps']
const BODYWEIGHT: MetricKey[] = ['reps']
const HOLD: MetricKey[] = ['seconds']
const CARDIO: MetricKey[] = ['minutes', 'km']
const DURATION: MetricKey[] = ['minutes']

const METRICS: Record<string, MetricKey[]> = {
  goblet_squat: LOADED,
  barbell_squat: LOADED,
  db_bench: LOADED,
  bb_bench: LOADED,
  incline_db_press: LOADED,
  rdl: LOADED,
  bb_row: LOADED,
  db_row_two: LOADED,
  db_row_one: LOADED,
  db_shoulder_press: LOADED,
  db_rear_lunge: LOADED,
  kb_swing: LOADED,
  hammer_curl: LOADED,
  db_tri_ext: LOADED,
  pullover: LOADED,
  // Carried weight for a set time, so both halves matter.
  farmers_walk: ['weightKg', 'seconds'],

  pushups: BODYWEIGHT,
  crunches: BODYWEIGHT,
  russian_twist: BODYWEIGHT,
  superman: BODYWEIGHT,
  dead_bug: BODYWEIGHT,
  glute_bridge: BODYWEIGHT,
  mountain_climbers: BODYWEIGHT,

  plank: HOLD,
  side_bridge: HOLD,

  bike_easy: CARDIO,
  bike_intervals: CARDIO,
  treadmill_incline: CARDIO,
  treadmill_intervals: CARDIO,
  walk_outside: CARDIO,

  mobility: DURATION,
  stretch: DURATION,
  foam_roll: DURATION,
  football: DURATION,
  volleyball: DURATION,

  // A weigh-in is a tick; the number belongs on the Log tab.
  weigh_in: [],
  // Benchmarks: max reps and a max hold.
  test_block: ['reps', 'seconds'],
}

export function metricsFor(exKey: string): MetricKey[] {
  return METRICS[exKey] ?? LOADED
}
