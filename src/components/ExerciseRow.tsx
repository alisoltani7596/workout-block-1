import { useState } from 'react'
import {
  METRIC,
  exercise,
  metricsFor,
  restSeconds,
  type MetricKey,
  type PlanItem,
} from '../lib/program'
import {
  lastPerformance,
  type DayLog,
  type ExerciseFeedback,
  type Feel,
  type SetLog,
} from '../lib/store'
import { ExerciseImage } from './ExerciseImage'
import { useRestTimer } from './RestTimer'
import { FeelPicker } from './FeelPicker'
import { dayMonth } from '../lib/dates'

const DEFAULT_REST = 60

type Props = {
  item: PlanItem
  date: string
  log: DayLog
  logs: Record<string, DayLog>
  onSets: (exKey: string, sets: SetLog[]) => void
  onFeedback: (exKey: string, patch: Partial<ExerciseFeedback>) => void
}

export function ExerciseRow({ item, date, log, logs, onSets, onFeedback }: Props) {
  const entry = exercise(item.ex)
  const [open, setOpen] = useState(false)
  const rest = useRestTimer()

  const metrics = metricsFor(item.ex)
  const stored = log.exercises[item.ex] ?? []
  const sets: SetLog[] = Array.from({ length: item.sets }, (_, i) => {
    const s = stored.find((x) => x.setIndex === i)
    return s ?? { setIndex: i, done: false }
  })
  const doneCount = sets.filter((s) => s.done).length

  const restSec = restSeconds(item.rest) ?? DEFAULT_REST
  const last = lastPerformance(logs, item.ex, date)
  const feedback = log.feedback?.[item.ex]

  const patch = (i: number, next: Partial<SetLog>) => {
    onSets(
      item.ex,
      sets.map((s) => (s.setIndex === i ? { ...s, ...next } : s)),
    )
  }

  const toggle = (i: number) => {
    const nowDone = !sets[i].done
    patch(i, { done: nowDone })
    if (nowDone) rest.start(restSec, `${entry.name} · set ${i + 1}`)
  }

  return (
    <li className="border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <ExerciseImage entry={entry} exKey={item.ex} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold">{entry.name}</span>
              {doneCount === item.sets && (
                <span
                  className="shrink-0 text-[11px] font-bold"
                  style={{ color: 'var(--must)' }}
                  aria-label="all sets done"
                >
                  ✓
                </span>
              )}
              {feedback?.feel != null && <FeelDot feel={feedback.feel} />}
            </span>
            <span className="num mt-0.5 block text-[13px]" style={{ color: 'var(--ink-2)' }}>
              {item.sets > 1 ? `${item.sets} × ${item.reps}` : item.reps}
            </span>
            {item.superset && (
              <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--color-accent)' }}>
                superset with {exercise(item.superset).name}
              </span>
            )}
          </span>
          <span
            className="shrink-0 text-xs transition-transform"
            style={{ color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none' }}
            aria-hidden
          >
            ▶
          </span>
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3">
          <ExerciseImage entry={entry} exKey={item.ex} size="large" className="mb-3" />
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {entry.cue}
          </p>
          <p className="mt-2 text-[11px] tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
            {entry.equipment}
            {item.rest ? ` · rest ${item.rest}` : ''}
          </p>
        </div>
      )}

      <div className="px-3 pb-3">
        {last && (
          <p className="num mb-2 text-[11px]" style={{ color: 'var(--ink-3)' }}>
            last: {formatSet(last.set, metrics)}{' '}
            <span className="opacity-70">({dayMonth(last.date)})</span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          {sets.map((s) => (
            <div key={s.setIndex} className="flex items-center gap-2">
              <button
                onClick={() => toggle(s.setIndex)}
                aria-pressed={s.done}
                aria-label={`Set ${s.setIndex + 1}${s.done ? ', done, tap to restart rest' : ''}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-bold transition-colors"
                style={{
                  background: s.done ? 'var(--must)' : 'var(--surface-2)',
                  borderColor: s.done ? 'var(--must)' : 'var(--line)',
                  color: s.done ? 'var(--must-ink)' : 'var(--ink-3)',
                }}
              >
                {s.done ? '✓' : s.setIndex + 1}
              </button>

              {s.done && (
                <button
                  onClick={() => rest.start(restSec, `${entry.name} · set ${s.setIndex + 1}`)}
                  className="num h-11 shrink-0 rounded-xl border px-2.5 text-[11px] font-semibold"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
                  aria-label={`Restart ${restSec} second rest`}
                >
                  ⏱ {restSec}s
                </button>
              )}

              {metrics.map((m) => (
                <MiniInput
                  key={m}
                  metric={m}
                  aria-label={`Set ${s.setIndex + 1} ${METRIC[m].label}`}
                  value={s[m]}
                  onChange={(v) => patch(s.setIndex, { [m]: v })}
                />
              ))}

              {metrics.length === 0 && (
                <span className="flex-1 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  nothing to measure — just tick it
                </span>
              )}
            </div>
          ))}
        </div>

        <FeelPicker
          feedback={feedback}
          onChange={(p) => onFeedback(item.ex, p)}
          placeholder={`How did ${entry.name.toLowerCase()} feel? Anything worth changing next month.`}
        />
      </div>
    </li>
  )
}

/** "20 kg × 10", "45 s", "30 min · 8.2 km" */
export function formatSet(set: SetLog, metrics: MetricKey[]): string {
  const parts = metrics
    .filter((m) => set[m] != null)
    .map((m) => `${set[m]} ${METRIC[m].suffix}`)
  if (!parts.length) return 'done'
  // Weight against reps reads better as a product than a list.
  if (metrics[0] === 'weightKg' && metrics[1] === 'reps' && parts.length === 2) {
    return `${set.weightKg} kg × ${set.reps}`
  }
  return parts.join(' · ')
}

export const FEEL_COLOR: Record<Feel, string> = {
  1: 'var(--color-missed)',
  2: 'var(--must)',
  3: 'var(--must)',
  4: 'var(--color-accent)',
  5: 'var(--color-accent)',
}

function FeelDot({ feel }: { feel: Feel }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: FEEL_COLOR[feel] }}
      aria-hidden
    />
  )
}

function MiniInput({
  value,
  onChange,
  metric,
  'aria-label': ariaLabel,
}: {
  value?: number
  onChange: (v: number | undefined) => void
  metric: MetricKey
  'aria-label': string
}) {
  return (
    <div
      className="flex h-11 min-w-0 flex-1 items-center rounded-xl border focus-within:ring-2"
      style={
        {
          background: 'var(--surface-2)',
          borderColor: 'var(--line)',
          '--tw-ring-color': 'var(--color-accent)',
        } as React.CSSProperties
      }
    >
      <input
        type="number"
        inputMode="decimal"
        step={METRIC[metric].step}
        min={0}
        aria-label={ariaLabel}
        value={value ?? ''}
        placeholder="–"
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="num w-full min-w-0 bg-transparent px-2.5 text-[15px] font-semibold outline-none"
        style={{ color: 'var(--ink)' }}
      />
      <span className="pr-2 text-[10px]" style={{ color: 'var(--ink-3)' }}>
        {METRIC[metric].suffix}
      </span>
    </div>
  )
}
