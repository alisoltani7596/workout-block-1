import { useState } from 'react'
import { exercise, restSeconds, type PlanItem } from '../lib/program'
import { lastPerformance, type DayLog, type SetLog } from '../lib/store'
import { ExerciseImage } from './ExerciseImage'
import { useRestTimer } from './RestTimer'
import { dayMonth } from '../lib/dates'

const DEFAULT_REST = 60

type Props = {
  item: PlanItem
  date: string
  log: DayLog
  logs: Record<string, DayLog>
  onSets: (exKey: string, sets: SetLog[]) => void
}

export function ExerciseRow({ item, date, log, logs, onSets }: Props) {
  const entry = exercise(item.ex)
  const [open, setOpen] = useState(false)
  const rest = useRestTimer()

  const stored = log.exercises[item.ex] ?? []
  const sets: SetLog[] = Array.from({ length: item.sets }, (_, i) => {
    const s = stored.find((x) => x.setIndex === i)
    return s ?? { setIndex: i, done: false }
  })
  const doneCount = sets.filter((s) => s.done).length

  const restSec = restSeconds(item.rest) ?? DEFAULT_REST
  const last = lastPerformance(logs, item.ex, date)

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
    <li
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--line)' }}
    >
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
            last: {formatLast(last)} <span className="opacity-70">({dayMonth(last.date)})</span>
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

              <MiniInput
                aria-label={`Set ${s.setIndex + 1} weight in kilograms`}
                suffix="kg"
                value={s.weightKg}
                onChange={(v) => patch(s.setIndex, { weightKg: v })}
                step={0.5}
              />
              <MiniInput
                aria-label={`Set ${s.setIndex + 1} reps`}
                suffix="reps"
                value={s.reps}
                onChange={(v) => patch(s.setIndex, { reps: v })}
                step={1}
              />
            </div>
          ))}
        </div>
      </div>
    </li>
  )
}

function formatLast(last: { weightKg?: number; reps?: number }) {
  const w = last.weightKg != null ? `${last.weightKg} kg` : null
  const r = last.reps != null ? `${last.reps}` : null
  if (w && r) return `${w} × ${r}`
  return w ?? (r ? `${r} reps` : '—')
}

function MiniInput({
  value,
  onChange,
  suffix,
  step,
  'aria-label': ariaLabel,
}: {
  value?: number
  onChange: (v: number | undefined) => void
  suffix: string
  step: number
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
        step={step}
        min={0}
        aria-label={ariaLabel}
        value={value ?? ''}
        placeholder="–"
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="num w-full min-w-0 bg-transparent px-2.5 text-[15px] font-semibold outline-none"
        style={{ color: 'var(--ink)' }}
      />
      <span className="pr-2 text-[10px]" style={{ color: 'var(--ink-3)' }}>
        {suffix}
      </span>
    </div>
  )
}
