type Props = {
  label: string
  unit?: string
  value?: number
  must: number
  best: number
}

/**
 * MUST and BEST thresholds sit side by side on one track, so the floor is
 * visible as a thing you can clear rather than a thing you fell short of.
 */
export function TargetBar({ label, unit, value, must, best }: Props) {
  const scale = Math.max(best, value ?? 0) * 1.06
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`
  const v = value ?? 0
  const hitMust = value != null && v >= must
  const hitBest = value != null && v >= best
  const fill = hitBest ? 'var(--color-accent)' : hitMust ? 'var(--must)' : 'var(--ink-3)'

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
        </span>
        <span className="num text-sm font-bold" style={{ color: value == null ? 'var(--ink-3)' : fill }}>
          {value == null ? '—' : value.toLocaleString()}
          {unit && value != null ? <span className="text-[11px] font-medium"> {unit}</span> : null}
        </span>
      </div>

      <div
        className="relative h-3 overflow-hidden rounded-full"
        style={{ background: 'var(--surface-2)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: pct(v), background: fill, opacity: value == null ? 0 : 1 }}
        />
        <Marker at={pct(must)} color="var(--must)" />
        <Marker at={pct(best)} color="var(--color-accent)" />
      </div>

      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ink-3)' }}>
        <span>
          <b style={{ color: 'var(--must)' }}>MUST</b> {must.toLocaleString()}
        </span>
        <span>
          <b style={{ color: 'var(--color-accent)' }}>BEST</b> {best.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function Marker({ at, color }: { at: string; color: string }) {
  return (
    <div
      className="absolute inset-y-0 w-[3px] rounded-full"
      style={{ left: at, background: color, transform: 'translateX(-1.5px)', opacity: 0.95 }}
    />
  )
}
