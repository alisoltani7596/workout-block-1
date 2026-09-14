import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { days, exercise, meta, metricsFor, weeks } from '../lib/program'
import { addDays, dayMonth, daysBetween, todayISO } from '../lib/dates'
import { useStore, type DayLog } from '../lib/store'
import { currentStreak, isDone, targetWeightOn, weightSummary, weightTrend } from '../lib/trend'
import { Card, Empty, SectionTitle, Stat, TIER_COLOR } from '../components/ui'
import { FEEL_SCALE } from '../components/FeelPicker'
import { formatSet } from '../components/ExerciseRow'

const BAND = 0.35 // kg of slack either side of the planned line

export function Progress() {
  const { logs } = useStore()
  const today = todayISO()

  const trend = useMemo(() => weightTrend(logs), [logs])
  const summary = useMemo(() => weightSummary(logs), [logs])

  const weightData = useMemo(() => {
    const out: {
      date: string
      label: string
      weightKg: number | null
      trend: number | null
      band: [number, number]
      target: number
    }[] = []
    const span = daysBetween(meta.startWeightDate, meta.endDate)
    for (let i = 0; i <= span; i++) {
      const date = addDays(meta.startWeightDate, i)
      const t = trend.find((p) => p.date === date)
      const target = targetWeightOn(date)
      out.push({
        date,
        label: dayMonth(date),
        weightKg: t?.weightKg ?? null,
        trend: t?.trend ?? null,
        band: [target - BAND, target + BAND],
        target: Math.round(target * 10) / 10,
      })
    }
    return out
  }, [trend])

  const sessionData = useMemo(
    () =>
      days.map((d) => {
        const tier = logs[d.date]?.tier
        const status = tier ?? (d.date > today ? 'future' : 'skipped')
        // A uniform bar height keeps this a status strip, not a fake metric.
        return { date: d.date, label: dayMonth(d.date), value: 1, status, title: d.title }
      }),
    [logs, today],
  )
  const completed = days.filter((d) => isDone(logs[d.date]?.tier)).length
  const streak = currentStreak(
    logs,
    days.map((d) => d.date),
  )

  const dailyData = useMemo(
    () =>
      days.map((d) => ({
        date: d.date,
        label: dayMonth(d.date),
        steps: logs[d.date]?.steps ?? null,
        stepsMust: d.targets.steps.must,
        stepsBest: d.targets.steps.best,
        kcal: logs[d.date]?.activeKcal ?? null,
        kcalMust: d.targets.activeKcal.must,
        kcalBest: d.targets.activeKcal.best,
      })),
    [logs],
  )
  const hasSteps = dailyData.some((d) => d.steps != null)
  const hasKcal = dailyData.some((d) => d.kcal != null)

  const sleepData = useMemo(
    () =>
      days.map((d) => ({
        date: d.date,
        label: dayMonth(d.date),
        sleepScore: logs[d.date]?.sleepScore ?? null,
        nextRpe: logs[addDays(d.date, 1)]?.rpe ?? null,
      })),
    [logs],
  )
  const sleepPairs = sleepData.filter((d) => d.sleepScore != null && d.nextRpe != null).length

  const feedbackRows = useMemo(() => collectFeedback(logs), [logs])

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Read the trend line. A single morning tells you nothing.
        </p>
      </header>

      {/* 1. Weight */}
      <section>
        <SectionTitle hint={`${trend.length} weigh-in${trend.length === 1 ? '' : 's'}`}>
          Weight
        </SectionTitle>
        <Card className="p-3 pt-4">
          {trend.length === 0 ? (
            <Empty>Log a weight on the Log tab and the trend line starts here.</Empty>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={weightData} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                    stroke="var(--line)"
                    interval={3}
                    tickMargin={6}
                  />
                  <YAxis
                    domain={[
                      (min: number) => Math.floor(Math.min(min, meta.targetWeightKgByEnd) - 0.6),
                      (max: number) => Math.ceil(Math.max(max, meta.startWeightKg) + 0.6),
                    ]}
                    tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                    stroke="var(--line)"
                    width={54}
                  />
                  <Tooltip content={<ChartTip unit="kg" />} />
                  <Area
                    dataKey="band"
                    name="Target band"
                    stroke="none"
                    fill="var(--color-accent)"
                    fillOpacity={0.13}
                    isAnimationActive={false}
                    activeDot={false}
                  />
                  <Line
                    dataKey="target"
                    name="Plan"
                    stroke="var(--color-accent)"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    strokeOpacity={0.55}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="weightKg"
                    name="Weigh-in"
                    stroke="var(--ink-3)"
                    strokeOpacity={0}
                    dot={{ r: 2.5, fill: 'var(--ink-3)', stroke: 'none' }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    dataKey="trend"
                    name="7-day trend"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              <div
                className="mt-2 grid grid-cols-3 gap-2 border-t pt-3"
                style={{ borderColor: 'var(--line)' }}
              >
                <Stat
                  label="Trend now"
                  value={summary.trendNow != null ? `${summary.trendNow.toFixed(1)}` : '—'}
                  sub="kg"
                  tone="accent"
                />
                <Stat
                  label="Since start"
                  value={
                    summary.changeSinceStart != null
                      ? `${summary.changeSinceStart > 0 ? '+' : ''}${summary.changeSinceStart.toFixed(1)}`
                      : '—'
                  }
                  sub="kg"
                />
                <Stat
                  label="Projected 30 Sep"
                  value={summary.projectedEnd != null ? summary.projectedEnd.toFixed(1) : '—'}
                  sub={
                    summary.projectedEnd == null
                      ? 'needs a week of weigh-ins'
                      : `target ${meta.targetWeightKgByEnd}`
                  }
                />
              </div>
            </>
          )}
        </Card>
      </section>

      {/* 2. Adherence */}
      <section>
        <SectionTitle>Sessions</SectionTitle>
        <Card className="p-3 pt-4">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <Stat label="Completed" value={`${completed} of ${days.length}`} tone="must" />
            <Stat label="Streak" value={streak} sub={streak === 1 ? 'session' : 'sessions'} />
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <ComposedChart data={sessionData} margin={{ top: 0, right: 6, left: -22, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                stroke="var(--line)"
                interval={2}
                tickMargin={6}
              />
              <YAxis hide domain={[0, 1]} />
              <Tooltip content={<SessionTip />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                {sessionData.map((d) => (
                  <Cell
                    key={d.date}
                    fill={TIER_COLOR[d.status as keyof typeof TIER_COLOR]}
                    fillOpacity={d.status === 'future' ? 0.5 : 1}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <Legend />
        </Card>
      </section>

      {/* 3. Steps */}
      <section>
        <SectionTitle>Steps vs goal</SectionTitle>
        <Card className="p-3 pt-4">
          {!hasSteps ? (
            <Empty>Log your step count for a day to see it against the MUST and BEST lines.</Empty>
          ) : (
            <GoalChart
              data={dailyData}
              valueKey="steps"
              mustKey="stepsMust"
              bestKey="stepsBest"
              unit="steps"
            />
          )}
        </Card>
      </section>

      {/* 4. Active calories */}
      <section>
        <SectionTitle>Active calories vs goal</SectionTitle>
        <Card className="p-3 pt-4">
          {!hasKcal ? (
            <Empty>Log active calories for a day to see it against the MUST and BEST lines.</Empty>
          ) : (
            <GoalChart
              data={dailyData}
              valueKey="kcal"
              mustKey="kcalMust"
              bestKey="kcalBest"
              unit="kcal"
            />
          )}
        </Card>
      </section>

      {/* 5. Sleep vs next-day RPE */}
      <section>
        <SectionTitle hint="does bad sleep cost you?">Sleep vs next-day RPE</SectionTitle>
        <Card className="p-3 pt-4">
          {sleepPairs < 2 ? (
            <Empty>
              Log a sleep score, then an RPE the following day. Two matched pairs and this chart
              appears.
            </Empty>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={sleepData} margin={{ top: 4, right: 0, left: -26, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                  stroke="var(--line)"
                  interval={2}
                  tickMargin={6}
                />
                <YAxis
                  yAxisId="sleep"
                  domain={[0, 100]}
                  tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                  stroke="var(--line)"
                  width={48}
                />
                <YAxis
                  yAxisId="rpe"
                  orientation="right"
                  domain={[0, 10]}
                  tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                  stroke="var(--line)"
                  width={26}
                />
                <Tooltip content={<ChartTip />} />
                <Line
                  yAxisId="sleep"
                  dataKey="sleepScore"
                  name="Sleep score"
                  stroke="var(--must)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="rpe"
                  dataKey="nextRpe"
                  name="Next-day RPE"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={{ r: 2.5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {sleepPairs >= 2 && (
            <Legend
              items={[
                { label: 'Sleep score (left)', color: 'var(--must)' },
                { label: 'Next-day RPE (right)', color: 'var(--color-accent)' },
              ]}
            />
          )}
        </Card>
      </section>

      {/* 6. How each exercise felt */}
      <section>
        <SectionTitle hint="what month 2 gets built on">Exercise feedback</SectionTitle>
        <Card>
          {feedbackRows.length === 0 ? (
            <div className="p-3">
              <Empty>
                Rate an exercise on the Today tab — "too easy" through "too hard" — and it lands
                here, hardest first.
              </Empty>
            </div>
          ) : (
            <ul>
              {feedbackRows.map((row) => (
                <li
                  key={row.key}
                  className="border-b px-3.5 py-3 last:border-b-0"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {row.name}
                    </span>
                    <span
                      className="num shrink-0 text-[11px] font-bold"
                      style={{ color: row.color }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div className="num mt-0.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {row.rated} rating{row.rated === 1 ? '' : 's'}
                    {row.best ? ` · best set ${row.best}` : ''}
                  </div>
                  {row.notes.map((n) => (
                    <p
                      key={n.date}
                      className="mt-1.5 text-[13px] leading-snug"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      <span className="num" style={{ color: 'var(--ink-3)' }}>
                        {dayMonth(n.date)}:{' '}
                      </span>
                      {n.note}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* 7. Weekly summary */}
      <section>
        <SectionTitle>By week</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="num w-full text-right text-sm">
            <thead>
              <tr style={{ color: 'var(--ink-3)' }}>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                  Week
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                  Done
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                  Avg kg
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                  Steps
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                  Sleep
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const row = weekSummary(logs, w)
                return (
                  <tr key={w} className="border-t" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-3 py-3 text-left font-semibold">Week {w}</td>
                    <td className="px-2 py-3">
                      {row.done}
                      <span style={{ color: 'var(--ink-3)' }}>/{row.total}</span>
                    </td>
                    <td className="px-2 py-3">{row.avgWeight ?? '—'}</td>
                    <td className="px-2 py-3">{row.totalSteps?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-3">{row.avgSleep ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  )
}

type DailyRow = {
  label: string
  steps: number | null
  stepsMust: number
  stepsBest: number
  kcal: number | null
  kcalMust: number
  kcalBest: number
}

function GoalChart({
  data,
  valueKey,
  mustKey,
  bestKey,
  unit,
}: {
  data: DailyRow[]
  valueKey: 'steps' | 'kcal'
  mustKey: 'stepsMust' | 'kcalMust'
  bestKey: 'stepsBest' | 'kcalBest'
  unit: string
}) {
  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
            stroke="var(--line)"
            interval={2}
            tickMargin={6}
          />
          <YAxis
            tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
            stroke="var(--line)"
            width={46}
            tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
          />
          <Tooltip content={<ChartTip unit={unit} />} cursor={{ fill: 'var(--surface-2)' }} />
          <Bar dataKey={valueKey} name="Logged" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => {
              const v = d[valueKey]
              const fill =
                v == null
                  ? 'transparent'
                  : v >= d[bestKey]
                    ? 'var(--color-accent)'
                    : v >= d[mustKey]
                      ? 'var(--must)'
                      : 'var(--color-missed)'
              return <Cell key={i} fill={fill} />
            })}
          </Bar>
          <Line
            dataKey={mustKey}
            name="MUST"
            stroke="var(--must)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey={bestKey}
            name="BEST"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <Legend
        items={[
          { label: 'over BEST', color: 'var(--color-accent)' },
          { label: 'over MUST', color: 'var(--must)' },
          { label: 'under', color: 'var(--color-missed)' },
        ]}
      />
    </>
  )
}

function Legend({ items }: { items?: { label: string; color: string }[] }) {
  const list =
    items ??
    [
      { label: 'BEST', color: TIER_COLOR.best },
      { label: 'MUST', color: TIER_COLOR.must },
      { label: 'Missed', color: TIER_COLOR.missed },
      { label: 'Skipped', color: TIER_COLOR.skipped },
      { label: 'Ahead', color: TIER_COLOR.future },
    ]
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1">
      {list.map((l) => (
        <span
          key={l.label}
          className="flex items-center gap-1.5 text-[10px]"
          style={{ color: 'var(--ink-3)' }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  )
}

type TipProps = Partial<TooltipContentProps<number, string>>

function ChartTip({ active, payload, label, unit }: TipProps & { unit?: string }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null && !Array.isArray(p.value))
  if (!rows.length) return null
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}
    >
      <div className="mb-1 font-semibold">{label}</div>
      {rows.map((p, i) => (
        <div key={i} className="num flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? 'var(--ink-3)' }} />
          <span style={{ color: 'var(--ink-2)' }}>{p.name}</span>
          <span className="ml-auto font-semibold">
            {typeof p.value === 'number' ? p.value.toLocaleString() : String(p.value)} {unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function SessionTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as { label: string; title: string; status: string }
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}
    >
      <div className="font-semibold">{d.label}</div>
      <div style={{ color: 'var(--ink-2)' }}>{d.title}</div>
      <div className="mt-1 capitalize" style={{ color: TIER_COLOR[d.status as keyof typeof TIER_COLOR] }}>
        {d.status === 'future' ? 'ahead' : d.status}
      </div>
    </div>
  )
}

type FeedbackRow = {
  key: string
  name: string
  rated: number
  label: string
  color: string
  best: string | null
  notes: { date: string; note: string }[]
}

/**
 * Averages each exercise's feel across the block and keeps every note, so the
 * hardest movements sort to the top when it is time to write the next block.
 */
function collectFeedback(logs: Record<string, DayLog>): FeedbackRow[] {
  const acc = new Map<string, { feels: number[]; notes: { date: string; note: string }[] }>()
  for (const date of Object.keys(logs).sort()) {
    for (const [key, fb] of Object.entries(logs[date].feedback ?? {})) {
      const row = acc.get(key) ?? { feels: [], notes: [] }
      if (fb.feel != null) row.feels.push(fb.feel)
      if (fb.note) row.notes.push({ date, note: fb.note })
      acc.set(key, row)
    }
  }

  return [...acc.entries()]
    .map(([key, row]) => {
      const avg = row.feels.length
        ? row.feels.reduce((a, b) => a + b, 0) / row.feels.length
        : null
      const scale = avg != null ? FEEL_SCALE[Math.round(avg) - 1] : undefined
      return {
        key,
        name: exercise(key).name,
        rated: row.feels.length,
        label: scale?.short ?? 'note only',
        color: scale?.color ?? 'var(--ink-3)',
        best: bestSetFor(logs, key),
        notes: row.notes.slice(-3).reverse(),
        avg: avg ?? 0,
      }
    })
    .sort((a, b) => b.avg - a.avg)
}

function bestSetFor(logs: Record<string, DayLog>, key: string): string | null {
  const metrics = metricsFor(key)
  if (!metrics.length) return null
  let best: { text: string; score: number } | null = null
  for (const log of Object.values(logs)) {
    for (const set of log.exercises[key] ?? []) {
      const score = metrics.reduce((a, m) => a + (set[m] ?? 0), 0)
      if (score > 0 && (!best || score > best.score)) {
        best = { text: formatSet(set, metrics), score }
      }
    }
  }
  return best?.text ?? null
}

function weekSummary(logs: Record<string, DayLog>, week: number) {
  const inWeek = days.filter((d) => d.week === week)
  const entries = inWeek.map((d) => logs[d.date]).filter(Boolean)
  const weights = entries.map((e) => e.weightKg).filter((v): v is number => v != null)
  const steps = entries.map((e) => e.steps).filter((v): v is number => v != null)
  const sleep = entries.map((e) => e.sleepScore).filter((v): v is number => v != null)
  return {
    total: inWeek.length,
    done: inWeek.filter((d) => isDone(logs[d.date]?.tier)).length,
    avgWeight: weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : null,
    totalSteps: steps.length ? steps.reduce((a, b) => a + b, 0) : null,
    avgSleep: sleep.length ? Math.round(sleep.reduce((a, b) => a + b, 0) / sleep.length) : null,
  }
}
