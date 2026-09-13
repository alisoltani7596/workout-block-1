import { useRef, useState } from 'react'
import { dayFor, firstDate, lastDate } from '../lib/program'
import { isFriday, shortDate } from '../lib/dates'
import { normalize, useStore, type DayLog, type Tier } from '../lib/store'
import { Card, NumberField, SectionTitle, TIER_COLOR } from '../components/ui'
import { toCsv, toJson, download } from '../lib/exchange'

const TIERS: { key: Tier; label: string; hint: string }[] = [
  { key: 'best', label: 'BEST', hint: 'full session' },
  { key: 'must', label: 'MUST', hint: 'the floor, and it counts' },
  { key: 'missed', label: 'Missed', hint: 'planned for, not punished' },
  { key: 'skipped', label: 'Skipped', hint: 'chose not to' },
]

export function LogScreen({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { logs, logFor, updateLog, replaceAll } = useStore()
  const log = logFor(date)
  const day = dayFor(date)
  const set = (patch: Partial<DayLog>) => updateLog(date, patch)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Log</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Everything here is optional. Fill in what you have.
        </p>
      </header>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          Date
        </span>
        <input
          type="date"
          value={date}
          min={firstDate}
          max={lastDate}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="num w-full rounded-xl border px-3 py-3.5 text-lg font-semibold outline-none"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        />
        <span className="mt-1 block text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {shortDate(date)}
          {day ? ` · ${day.title}` : ''}
        </span>
      </label>

      <section>
        <SectionTitle>Body and numbers</SectionTitle>
        <Card className="grid grid-cols-2 gap-3 p-4">
          <NumberField
            label="Weight"
            unit="kg"
            step={0.1}
            min={0}
            value={log.weightKg}
            onChange={(v) => set({ weightKg: v })}
          />
          <NumberField
            label="Steps"
            step={100}
            min={0}
            value={log.steps}
            onChange={(v) => set({ steps: v })}
          />
          <NumberField
            label="Active calories"
            unit="kcal"
            step={10}
            min={0}
            value={log.activeKcal}
            onChange={(v) => set({ activeKcal: v })}
          />
          <NumberField
            label="Total calories"
            unit="kcal"
            step={10}
            min={0}
            value={log.totalKcal}
            onChange={(v) => set({ totalKcal: v })}
          />
          <NumberField
            label="Sleep score"
            unit="/100"
            min={0}
            max={100}
            value={log.sleepScore}
            onChange={(v) => set({ sleepScore: v })}
          />
          <NumberField
            label="Body battery"
            unit="am"
            min={0}
            max={100}
            value={log.bodyBattery}
            onChange={(v) => set({ bodyBattery: v })}
          />
          <NumberField
            label="Resting HR"
            unit="bpm"
            min={0}
            value={log.restingHr}
            onChange={(v) => set({ restingHr: v })}
          />
          <NumberField
            label="Intensity minutes"
            unit="min"
            min={0}
            value={log.intensityMin}
            onChange={(v) => set({ intensityMin: v })}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Session</SectionTitle>
        <Card className="flex flex-col gap-4 p-4">
          <div>
            <span className="mb-2 block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              How did today go?
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map((t) => {
                const on = log.tier === t.key
                const dark = t.key === 'best'
                return (
                  <button
                    key={t.key}
                    onClick={() => set({ tier: on ? undefined : t.key })}
                    aria-pressed={on}
                    className="rounded-xl border-2 px-3 py-2.5 text-left"
                    style={{
                      background: on ? TIER_COLOR[t.key] : 'var(--surface-2)',
                      borderColor: on ? TIER_COLOR[t.key] : 'var(--line)',
                      color: on ? (dark ? '#fff' : 'var(--must-ink)') : 'var(--ink-2)',
                    }}
                  >
                    <div className="text-sm font-extrabold">{t.label}</div>
                    <div className="text-[10px]" style={{ opacity: 0.85 }}>
                      {t.hint}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Slider
            label="RPE — how hard it felt"
            value={log.rpe}
            onChange={(v) => set({ rpe: v })}
            leftHint="easy"
            rightHint="everything I had"
          />

          {isFriday(date) && (
            <Slider
              label="Last 20 minutes of football"
              value={log.footballLast20}
              onChange={(v) => set({ footballLast20: v })}
              leftHint="walking"
              rightHint="still flying"
            />
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              Notes
            </span>
            <textarea
              rows={3}
              value={log.notes ?? ''}
              onChange={(e) => set({ notes: e.target.value || undefined })}
              placeholder="Anything worth remembering next month."
              className="w-full resize-y rounded-xl border px-3 py-3 text-[15px] outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </Card>
      </section>

      <DataSection logs={logs} onImport={replaceAll} />
    </div>
  )
}

function Slider({
  label,
  value,
  onChange,
  leftHint,
  rightHint,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
  leftHint: string
  rightHint: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
        </span>
        <span className="num text-2xl font-bold" style={{ color: value ? 'var(--color-accent)' : 'var(--ink-3)' }}>
          {value ?? '—'}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        aria-label={label}
        value={value ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ opacity: value ? 1 : 0.55 }}
      />
      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ink-3)' }}>
        <span>1 · {leftHint}</span>
        {value != null && (
          <button onClick={() => onChange(undefined)} className="underline">
            clear
          </button>
        )}
        <span>10 · {rightHint}</span>
      </div>
    </div>
  )
}

function DataSection({
  logs,
  onImport,
}: {
  logs: Record<string, DayLog>
  onImport: (data: unknown) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const store = normalize(parsed)
      onImport(store)
      setMsg(`Imported ${Object.keys(store.logs).length} days.`)
    } catch {
      setMsg('That file could not be read as JSON. Nothing was changed.')
    }
  }

  return (
    <section>
      <SectionTitle hint={`${Object.keys(logs).length} days stored`}>Your data</SectionTitle>
      <Card className="flex flex-col gap-2 p-4">
        <p className="mb-1 text-[13px]" style={{ color: 'var(--ink-2)' }}>
          Everything lives in this browser. Export before you clear site data, or to carry the
          block into month 2.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={() => download(`workout-block-1-${stamp()}.json`, toJson(), 'application/json')}>
            Export JSON
          </Btn>
          <Btn onClick={() => download(`workout-block-1-${stamp()}.csv`, toCsv(logs), 'text/csv')}>
            Export CSV
          </Btn>
        </div>
        <Btn onClick={() => fileRef.current?.click()}>Import from JSON…</Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
        {msg && (
          <p className="text-[12px]" style={{ color: 'var(--color-accent)' }}>
            {msg}
          </p>
        )}
      </Card>
    </section>
  )
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border px-3 py-3 text-sm font-semibold"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
    >
      {children}
    </button>
  )
}
