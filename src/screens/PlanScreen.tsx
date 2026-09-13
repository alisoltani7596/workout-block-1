import { useState } from 'react'
import { days, habits, rules, weeks, type DayType } from '../lib/program'
import { shortDate, todayISO } from '../lib/dates'
import { useStore } from '../lib/store'
import { Card, SectionTitle, StatusDot, TIER_LABEL, TypeTag } from '../components/ui'

const FILTERS: (DayType | 'all')[] = ['all', 'strength', 'cardio', 'sport', 'recovery', 'admin']

export function PlanScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { logs } = useStore()
  const [filter, setFilter] = useState<DayType | 'all'>('all')
  const today = todayISO()

  const visible = days.filter((d) => filter === 'all' || d.type === filter)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">The block</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          17 days, {shortDate(days[0].date)} to {shortDate(days[days.length - 1].date)}.
        </p>
      </header>

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold capitalize"
              style={{
                background: filter === f ? 'var(--color-accent)' : 'var(--surface)',
                borderColor: filter === f ? 'var(--color-accent)' : 'var(--line)',
                color: filter === f ? '#fff' : 'var(--ink-2)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {weeks.map((w) => {
        const inWeek = visible.filter((d) => d.week === w)
        if (!inWeek.length) return null
        return (
          <section key={w}>
            <SectionTitle hint={`${inWeek.length} day${inWeek.length > 1 ? 's' : ''}`}>
              Week {w}
            </SectionTitle>
            <ul className="flex flex-col gap-2">
              {inWeek.map((d) => {
                const tier = logs[d.date]?.tier
                const status = tier ?? (d.date > today ? 'future' : 'skipped')
                const isToday = d.date === today
                return (
                  <li key={d.date}>
                    <button
                      onClick={() => onOpenDay(d.date)}
                      className="flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left"
                      style={{
                        background: 'var(--surface)',
                        borderColor: isToday ? 'var(--color-accent)' : 'var(--line)',
                      }}
                    >
                      <StatusDot tier={status} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="num text-[11px] font-semibold" style={{ color: 'var(--ink-3)' }}>
                            {shortDate(d.date)}
                          </span>
                          {isToday && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                              style={{ background: 'var(--color-accent)', color: '#fff' }}
                            >
                              Today
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[15px] font-semibold">
                          {d.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <TypeTag type={d.type} />
                          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                            {TIER_LABEL[status]}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--ink-3)' }} aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <section>
        <SectionTitle>Rules</SectionTitle>
        <Card className="flex flex-col">
          {rules.map((r, i) => (
            <p
              key={i}
              className="border-b px-4 py-3 text-[14px] leading-relaxed last:border-b-0"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              {r}
            </p>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Habits</SectionTitle>
        <div className="flex flex-col gap-3">
          <HabitList title="MUST" color="var(--must)" items={habits.must} />
          <HabitList title="BEST" color="var(--color-accent)" items={habits.best} />
        </div>
      </section>
    </div>
  )
}

function HabitList({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color }}>
        {title}
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((h, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-snug" style={{ color: 'var(--ink-2)' }}>
            <span style={{ color }} aria-hidden>
              —
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
