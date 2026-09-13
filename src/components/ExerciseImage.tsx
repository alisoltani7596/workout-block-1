import { useEffect, useRef, useState } from 'react'
import { cachedUrl, loadFrame, localUrl } from '../lib/imageCache'
import type { LibraryEntry } from '../lib/program'

const FRAME_MS = 900

type Props = {
  entry: LibraryEntry
  exKey: string
  size?: 'thumb' | 'large'
  className?: string
}

/**
 * Cross-fades the dataset's start and end frames so the movement reads as
 * motion. Pauses while off screen, and degrades to a lettered tile rather
 * than ever leaving a broken image in the layout.
 */
export function ExerciseImage({ entry, exKey, size = 'thumb', className = '' }: Props) {
  const { dbId } = entry
  const ref = useRef<HTMLDivElement | null>(null)
  const [frames, setFrames] = useState<[string | null, string | null]>(() =>
    dbId ? [cachedUrl(dbId, 0) ?? null, cachedUrl(dbId, 1) ?? null] : [null, null],
  )
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!dbId || !visible) return
    let alive = true
    Promise.all([loadFrame(dbId, 0), loadFrame(dbId, 1)]).then(([a, b]) => {
      if (!alive) return
      // fetch is unavailable on some origins (file://, locked-down privacy
      // modes); a plain <img src> still works there, so try that before
      // giving up on the picture entirely.
      setFrames([a ?? localUrl(dbId, 0), b ?? a ?? localUrl(dbId, 1)])
    })
    return () => {
      alive = false
    }
  }, [dbId, visible])

  useEffect(() => {
    if (!visible || !frames[0] || !frames[1] || frames[0] === frames[1]) return
    const id = window.setInterval(() => setFlip((f) => !f), FRAME_MS)
    return () => window.clearInterval(id)
  }, [visible, frames])

  const box =
    size === 'thumb'
      ? 'h-14 w-14 rounded-xl'
      : 'aspect-4/3 w-full rounded-2xl'

  if (!dbId || failed) {
    return (
      <div
        ref={ref}
        className={`${box} ${className} grid shrink-0 place-items-center border`}
        style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
        aria-hidden
      >
        <Glyph exKey={exKey} name={entry.name} large={size === 'large'} />
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${box} ${className} relative shrink-0 overflow-hidden border`}
      style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
    >
      {frames.map((src, i) =>
        src ? (
          <img
            key={i}
            src={src}
            alt={i === 0 ? `${entry.name}, start position` : ''}
            aria-hidden={i === 1}
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: (i === 1) === flip ? 1 : 0 }}
          />
        ) : null,
      )}
    </div>
  )
}

/** Cardio, mobility and admin items get an icon chosen by library key. */
function Glyph({ exKey, name, large }: { exKey: string; name: string; large: boolean }) {
  const path = GLYPHS[exKey]
  const cls = large ? 'h-16 w-16' : 'h-7 w-7'
  if (!path) {
    return (
      <span
        className={large ? 'text-4xl font-bold' : 'text-lg font-bold'}
        style={{ color: 'var(--ink-3)' }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      style={{ color: 'var(--ink-3)' }}
      aria-hidden
    >
      {path}
    </svg>
  )
}

const bike = (
  <>
    <circle cx="5.5" cy="17" r="3.5" />
    <circle cx="18.5" cy="17" r="3.5" />
    <path d="M5.5 17 10 9h4l4.5 8M9 6h4" />
  </>
)
const run = (
  <>
    <circle cx="15" cy="4.5" r="1.8" />
    <path d="M13.5 8 9 10l1.5 4 3 1 1 5M10.5 14 7 17M14.5 9l3 2 2.5-.5" />
  </>
)
const walk = (
  <>
    <circle cx="12.5" cy="4.5" r="1.8" />
    <path d="M12.5 7.5 10 12l2.5 2 1 6M10 12 8 20M13.5 9l3 1.5" />
  </>
)
const wave = <path d="M2 15c2.5 0 2.5-6 5-6s2.5 6 5 6 2.5-6 5-6 2.5 6 5 6" />
const ball = (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2 2M18 6l-2 2M6 18l2-2M18 18l-2-2" />
  </>
)
const scale = (
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M8.5 12a3.5 3.5 0 0 1 7 0M12 12l2-3" />
  </>
)
const clipboard = (
  <>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 3h6v3H9zM9 12h6M9 16h4" />
  </>
)
const roller = (
  <>
    <rect x="2.5" y="8" width="19" height="8" rx="4" />
    <path d="M7 8v8M17 8v8" />
  </>
)

const GLYPHS: Record<string, React.ReactNode> = {
  bike_easy: bike,
  bike_intervals: bike,
  treadmill_incline: walk,
  treadmill_intervals: run,
  walk_outside: walk,
  mobility: wave,
  stretch: wave,
  foam_roll: roller,
  football: ball,
  volleyball: ball,
  weigh_in: scale,
  test_block: clipboard,
}
