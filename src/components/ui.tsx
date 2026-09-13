import type { ReactNode } from 'react'
import type { Tier } from '../lib/store'
import type { DayType } from '../lib/program'

export function Card({
  children,
  className = '',
  as: As = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'li'
}) {
  return (
    <As
      className={`rounded-2xl border ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      {children}
    </As>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2
        className="text-[11px] font-bold tracking-[0.14em] uppercase"
        style={{ color: 'var(--ink-3)' }}
      >
        {children}
      </h2>
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm"
      style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
    >
      {children}
    </div>
  )
}

export const TIER_COLOR: Record<Tier | 'future', string> = {
  best: 'var(--color-accent)',
  must: 'var(--must)',
  missed: 'var(--color-missed)',
  skipped: 'var(--color-skipped)',
  future: 'var(--line)',
}

export const TIER_LABEL: Record<Tier | 'future', string> = {
  best: 'BEST done',
  must: 'MUST done',
  missed: 'Missed',
  skipped: 'Skipped',
  future: 'Ahead',
}

export function StatusDot({ tier, size = 10 }: { tier: Tier | 'future'; size?: number }) {
  const solid = tier === 'best' || tier === 'must'
  return (
    <span
      aria-label={TIER_LABEL[tier]}
      title={TIER_LABEL[tier]}
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: solid ? TIER_COLOR[tier] : 'transparent',
        border: `2px solid ${TIER_COLOR[tier]}`,
      }}
    />
  )
}

const TYPE_STYLE: Record<DayType, { label: string }> = {
  strength: { label: 'Strength' },
  cardio: { label: 'Cardio' },
  sport: { label: 'Sport' },
  recovery: { label: 'Recovery' },
  admin: { label: 'Admin' },
}

export function TypeTag({ type }: { type: DayType }) {
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase"
      style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
    >
      {TYPE_STYLE[type].label}
    </span>
  )
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min,
  max,
  placeholder,
}: {
  label: string
  unit?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  step?: number
  min?: number
  max?: number
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
        {label}
      </span>
      <div
        className="flex items-center rounded-xl border focus-within:ring-2"
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
          min={min}
          max={max}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? undefined : Number(v))
          }}
          className="num min-w-0 flex-1 bg-transparent px-3 py-3.5 text-lg font-semibold outline-none"
          style={{ color: 'var(--ink)' }}
        />
        {unit && (
          <span className="pr-3 text-sm" style={{ color: 'var(--ink-3)' }}>
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'accent' | 'must' | 'plain'
}) {
  const color =
    tone === 'accent' ? 'var(--color-accent)' : tone === 'must' ? 'var(--must)' : 'var(--ink)'
  return (
    <div>
      <div className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
        {label}
      </div>
      <div className="num text-2xl leading-tight font-bold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
