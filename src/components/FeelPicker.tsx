import { useState } from 'react'
import type { ExerciseFeedback, Feel } from '../lib/store'

export const FEEL_SCALE: { value: Feel; short: string; long: string; color: string }[] = [
  { value: 1, short: 'Too easy', long: 'far too easy — add load next month', color: 'var(--color-missed)' },
  { value: 2, short: 'Easy', long: 'easy — room to add a little', color: 'var(--must)' },
  { value: 3, short: 'Right', long: 'about right — keep it here', color: 'var(--must)' },
  { value: 4, short: 'Hard', long: 'hard but clean', color: 'var(--color-accent)' },
  { value: 5, short: 'Too hard', long: 'too hard — form went, back it off', color: 'var(--color-accent)' },
]

/**
 * Per-exercise feedback. This is the raw material for writing month 2, so it
 * is deliberately two taps to answer and always has room for a sentence.
 */
export function FeelPicker({
  feedback,
  onChange,
  placeholder,
}: {
  feedback?: ExerciseFeedback
  onChange: (patch: Partial<ExerciseFeedback>) => void
  placeholder: string
}) {
  const [noteOpen, setNoteOpen] = useState(Boolean(feedback?.note))
  const chosen = FEEL_SCALE.find((f) => f.value === feedback?.feel)

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--ink-3)' }}>
          How did it feel?
        </span>
        {chosen && (
          <span className="text-[11px]" style={{ color: chosen.color }}>
            {chosen.long}
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {FEEL_SCALE.map((f) => {
          const on = feedback?.feel === f.value
          return (
            <button
              key={f.value}
              onClick={() => onChange({ feel: on ? undefined : f.value })}
              aria-pressed={on}
              aria-label={f.long}
              className="rounded-lg border py-2 text-[10px] leading-tight font-semibold"
              style={{
                background: on ? f.color : 'var(--surface-2)',
                borderColor: on ? f.color : 'var(--line)',
                color: on ? (f.value >= 4 ? '#fff' : 'var(--must-ink)') : 'var(--ink-3)',
              }}
            >
              {f.short}
            </button>
          )
        })}
      </div>

      {noteOpen ? (
        <textarea
          rows={2}
          autoFocus={!feedback?.note}
          value={feedback?.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value || undefined })}
          placeholder={placeholder}
          className="mt-2 w-full resize-y rounded-xl border px-3 py-2.5 text-[13px] outline-none"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        />
      ) : (
        <button
          onClick={() => setNoteOpen(true)}
          className="mt-2 text-[11px] underline"
          style={{ color: 'var(--ink-3)' }}
        >
          Add a note
        </button>
      )}
    </div>
  )
}
