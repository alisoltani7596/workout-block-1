import { useState } from 'react'
import { dayFor, days, firstDate, habits, lastDate, type TierName } from '../lib/program'
import { addDays, positionInBlock, shortDate, todayISO } from '../lib/dates'
import { useStore } from '../lib/store'
import { ExerciseRow } from '../components/ExerciseRow'
import { MorningStretch } from '../components/MorningStretch'
import { TargetBar } from '../components/TargetBar'
import { Card, SectionTitle, TypeTag } from '../components/ui'

export function Today({
  date,
  setDate,
  tier,
  setTier,
}: {
  date: string
  setDate: (d: string) => void
  tier: TierName
  setTier: (t: TierName) => void
}) {
  const { logs, logFor, setSets, setFeedback, updateLog } = useStore()
  const day = dayFor(date)
  const log = logFor(date)
  const [showMissed, setShowMissed] = useState(false)
  const position = positionInBlock(todayISO())

  if (!day) return null
  const block = day[tier]
  const index = days.findIndex((d) => d.date === date)

  return (
    <div className="flex flex-col gap-5">
      {position !== 'inside' && (
        <p
          className="rounded-xl border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
        >
          {position === 'before'
            ? `The block starts on ${shortDate(firstDate)}. Showing the first day.`
            : `The block finished on ${shortDate(lastDate)}. Showing the last day.`}
        </p>
      )}

      {/* Day switcher */}
      <div className="flex items-center gap-2">
        <NavBtn
          label="Previous day"
          disabled={index <= 0}
          onClick={() => setDate(addDays(date, -1))}
        >
          ‹
        </NavBtn>
        <div className="min-w-0 flex-1 text-center">
          <div
            className="text-[11px] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            {day.weekday} · week {day.week}
          </div>
          <div className="num text-sm" style={{ color: 'var(--ink-3)' }}>
            {shortDate(day.date)}
          </div>
        </div>
        <NavBtn
          label="Next day"
          disabled={index >= days.length - 1}
          onClick={() => setDate(addDays(date, 1))}
        >
          ›
        </NavBtn>
      </div>

      <header>
        <div className="mb-2 flex items-center gap-2">
          <TypeTag type={day.type} />
        </div>
        <h1 className="text-3xl leading-[1.05] font-extrabold tracking-tight text-balance">
          {day.title}
        </h1>
        <p className="mt-2 text-[15px] leading-snug" style={{ color: 'var(--ink-2)' }}>
          {day.focus}
        </p>
      </header>

      <MorningStretch
        value={log.morningStretch}
        onChange={(next) => updateLog(date, { morningStretch: next })}
      />

      <TierToggle day={{ must: day.must.durationMin, best: day.best.durationMin }} tier={tier} setTier={setTier} />

      <Card>
        <ul>
          {block.items.map((item, i) => (
            <ExerciseRow
              key={`${item.ex}-${i}`}
              item={item}
              date={date}
              log={log}
              logs={logs}
              onSets={(exKey, sets) => setSets(date, exKey, sets)}
              onFeedback={(exKey, p) => setFeedback(date, exKey, p)}
            />
          ))}
        </ul>
      </Card>

      {/* Can't do it today */}
      <div>
        <button
          onClick={() => setShowMissed((v) => !v)}
          aria-expanded={showMissed}
          className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
            Can't do it today
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {showMissed ? 'Hide' : 'Open'}
          </span>
        </button>
        {showMissed && (
          <p
            className="mt-2 rounded-2xl border px-4 py-3 text-[14px] leading-relaxed"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
          >
            {day.missed}
          </p>
        )}
      </div>

      {/* Coach note */}
      <div
        className="rounded-2xl border-l-4 py-3 pr-4 pl-4"
        style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-dim)' }}
      >
        <div
          className="mb-1 text-[10px] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--color-accent-soft)' }}
        >
          Coach note
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {day.coachNote}
        </p>
      </div>

      <section>
        <SectionTitle hint="today's logged value">Targets</SectionTitle>
        <Card className="flex flex-col gap-4 p-4">
          <TargetBar
            label="Steps"
            value={log.steps}
            must={day.targets.steps.must}
            best={day.targets.steps.best}
          />
          <TargetBar
            label="Walk / intensity minutes"
            unit="min"
            value={log.intensityMin}
            must={day.targets.walkMin.must}
            best={day.targets.walkMin.best}
          />
          <TargetBar
            label="Active calories"
            unit="kcal"
            value={log.activeKcal}
            must={day.targets.activeKcal.must}
            best={day.targets.activeKcal.best}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Daily habits</SectionTitle>
        <Card className="flex flex-col">
          {habits.must.map((h, i) => {
            const checked = log.habits?.[i] === true
            return (
              <button
                key={i}
                onClick={() =>
                  updateLog(date, { habits: { ...(log.habits ?? {}), [i]: !checked } })
                }
                aria-pressed={checked}
                className="flex items-start gap-3 border-b px-4 py-3 text-left last:border-b-0"
                style={{ borderColor: 'var(--line)' }}
              >
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-bold"
                  style={{
                    background: checked ? 'var(--must)' : 'transparent',
                    borderColor: checked ? 'var(--must)' : 'var(--line)',
                    color: 'var(--must-ink)',
                  }}
                >
                  {checked ? '✓' : ''}
                </span>
                <span
                  className="text-[14px] leading-snug"
                  style={{ color: checked ? 'var(--ink-3)' : 'var(--ink-2)' }}
                >
                  {h}
                </span>
              </button>
            )
          })}
        </Card>
      </section>
    </div>
  )
}

function NavBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-lg disabled:opacity-25"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
    >
      {children}
    </button>
  )
}

function TierToggle({
  day,
  tier,
  setTier,
}: {
  day: { must: number; best: number }
  tier: TierName
  setTier: (t: TierName) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => setTier('must')}
        aria-pressed={tier === 'must'}
        className="rounded-2xl border-2 px-3 py-3 text-left transition-colors"
        style={{
          background: tier === 'must' ? 'var(--must)' : 'var(--surface)',
          borderColor: tier === 'must' ? 'var(--must)' : 'var(--line)',
          color: tier === 'must' ? 'var(--must-ink)' : 'var(--ink-3)',
        }}
      >
        <div className="text-base font-extrabold tracking-tight">MUST</div>
        <div className="num text-[11px] font-semibold" style={{ opacity: 0.8 }}>
          {day.must} min · this is enough
        </div>
      </button>
      <button
        onClick={() => setTier('best')}
        aria-pressed={tier === 'best'}
        className="rounded-2xl border-2 px-3 py-3 text-left transition-colors"
        style={{
          background: tier === 'best' ? 'var(--color-accent)' : 'var(--surface)',
          borderColor: tier === 'best' ? 'var(--color-accent)' : 'var(--line)',
          color: tier === 'best' ? '#fff' : 'var(--ink-3)',
        }}
      >
        <div className="text-base font-extrabold tracking-tight">BEST</div>
        <div className="num text-[11px] font-semibold" style={{ opacity: 0.8 }}>
          {day.best} min · if you have it
        </div>
      </button>
    </div>
  )
}
