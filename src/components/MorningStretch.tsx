import { exercise } from '../lib/program'
import type { MorningStretch as Stretch } from '../lib/store'
import { ExerciseImage } from './ExerciseImage'
import { useRestTimer } from './RestTimer'

const PRESETS = [10, 12, 15]

/**
 * Every day, before anything else. It sits above the session because it is
 * not part of the session — it happens whether or not you train.
 */
export function MorningStretch({
  value,
  onChange,
}: {
  value?: Stretch
  onChange: (next: Stretch) => void
}) {
  const entry = exercise('mobility')
  const rest = useRestTimer()
  const done = value?.done === true
  const minutes = value?.minutes

  return (
    <section
      className="rounded-2xl border-2 p-3"
      style={{
        borderColor: done ? 'var(--must)' : 'var(--line)',
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-center gap-3">
        <ExerciseImage entry={entry} exKey="mobility" />
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: done ? 'var(--must)' : 'var(--ink-3)' }}
          >
            Every morning
          </div>
          <div className="text-[15px] font-semibold">Morning stretch</div>
          <div className="num text-[13px]" style={{ color: 'var(--ink-2)' }}>
            10–15 min
          </div>
        </div>
        <button
          onClick={() => onChange({ done: !done, minutes })}
          aria-pressed={done}
          aria-label="Morning stretch done"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 text-lg font-bold"
          style={{
            background: done ? 'var(--must)' : 'var(--surface-2)',
            borderColor: done ? 'var(--must)' : 'var(--line)',
            color: done ? 'var(--must-ink)' : 'var(--ink-3)',
          }}
        >
          <span style={{ opacity: done ? 1 : 0.3 }}>✓</span>
        </button>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        Ankles, hips, thoracic spine, hamstrings. Move through range rather than holding long.
      </p>

      <div className="mt-3 flex items-center gap-2">
        {PRESETS.map((m) => {
          const on = minutes === m
          return (
            <button
              key={m}
              onClick={() => onChange({ done: true, minutes: on ? undefined : m })}
              aria-pressed={on}
              className="num h-11 flex-1 rounded-xl border text-sm font-semibold"
              style={{
                background: on ? 'var(--must)' : 'var(--surface-2)',
                borderColor: on ? 'var(--must)' : 'var(--line)',
                color: on ? 'var(--must-ink)' : 'var(--ink-2)',
              }}
            >
              {m} min
            </button>
          )
        })}
        <button
          onClick={() => rest.start((minutes ?? 10) * 60, 'Morning stretch')}
          className="h-11 shrink-0 rounded-xl border px-3 text-[11px] font-semibold"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
          aria-label="Start a timer for the morning stretch"
        >
          ⏱ Start
        </button>
      </div>
    </section>
  )
}
