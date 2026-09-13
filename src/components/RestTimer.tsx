import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type Timer = { label: string; total: number; endsAt: number }

type Ctx = {
  start: (seconds: number, label: string) => void
  stop: () => void
  active: boolean
}

const RestCtx = createContext<Ctx>({ start: () => {}, stop: () => {}, active: false })

export function useRestTimer() {
  return useContext(RestCtx)
}

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const now = ctx.currentTime
    // Two short pips, loud enough to hear over a gym but not startling.
    ;[0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    })
    window.setTimeout(() => void ctx.close(), 900)
  } catch {
    // Audio is a nicety; the vibration and the pill still fire.
  }
}

function vibrate() {
  try {
    navigator.vibrate?.([180, 90, 180])
  } catch {
    /* not supported */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<Timer | null>(null)
  const [remaining, setRemaining] = useState(0)
  const fired = useRef(false)

  const start = useCallback((seconds: number, label: string) => {
    if (seconds <= 0) return
    fired.current = false
    setTimer({ label, total: seconds, endsAt: Date.now() + seconds * 1000 })
    setRemaining(seconds)
  }, [])

  const stop = useCallback(() => {
    setTimer(null)
    setRemaining(0)
  }, [])

  useEffect(() => {
    if (!timer) return
    // Driven off wall-clock time so a backgrounded tab still lands correctly.
    const tick = () => {
      const left = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0 && !fired.current) {
        fired.current = true
        beep()
        vibrate()
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [timer])

  useEffect(() => {
    if (!timer || remaining > 0) return
    const id = window.setTimeout(() => setTimer(null), 5000)
    return () => window.clearTimeout(id)
  }, [timer, remaining])

  const value = useMemo(() => ({ start, stop, active: timer != null }), [start, stop, timer])

  return (
    <RestCtx.Provider value={value}>
      {children}
      {timer && <Pill timer={timer} remaining={remaining} onStop={stop} onAdd={() => start(remaining + 30, timer.label)} />}
    </RestCtx.Provider>
  )
}

function Pill({
  timer,
  remaining,
  onStop,
  onAdd,
}: {
  timer: Timer
  remaining: number
  onStop: () => void
  onAdd: () => void
}) {
  const done = remaining === 0
  const pct = Math.max(0, Math.min(1, remaining / timer.total))
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div
      className="pop pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-full border-2 py-2 pr-2 pl-4 shadow-2xl"
        style={{
          background: done ? 'var(--must)' : 'var(--surface)',
          borderColor: done ? 'var(--must)' : 'var(--color-accent)',
          color: done ? 'var(--must-ink)' : 'var(--ink)',
        }}
      >
        {!done && (
          <div
            className="absolute inset-y-0 left-0 -z-10 transition-[width] duration-300 ease-linear"
            style={{
              width: `${pct * 100}%`,
              background: 'color-mix(in oklab, var(--color-accent) 20%, transparent)',
            }}
          />
        )}
        <span className="num text-2xl font-bold tabular-nums">
          {done ? 'Go' : `${mm}:${ss}`}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs" style={{ opacity: done ? 0.85 : 0.7 }}>
          {done ? `Rest over · ${timer.label}` : timer.label}
        </span>
        {!done && (
          <button
            onClick={onAdd}
            className="rounded-full px-3 py-2 text-xs font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
          >
            +30s
          </button>
        )}
        <button
          onClick={onStop}
          aria-label="Dismiss rest timer"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-semibold"
          style={{
            background: done ? 'rgb(0 0 0 / 0.12)' : 'var(--surface-2)',
            color: done ? 'var(--must-ink)' : 'var(--ink-2)',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
