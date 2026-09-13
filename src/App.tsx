import { Suspense, lazy, useEffect, useState } from 'react'
import { clampToBlock, todayISO } from './lib/dates'
import { meta, type TierName } from './lib/program'
import { useStore } from './lib/store'
import { RestTimerProvider } from './components/RestTimer'
import { Today } from './screens/Today'
import { PlanScreen } from './screens/PlanScreen'
import { LogScreen } from './screens/LogScreen'

// Recharts is most of the bundle; it loads when the Progress tab is first opened.
const Progress = lazy(() => import('./screens/Progress').then((m) => ({ default: m.Progress })))

type Tab = 'today' | 'plan' | 'progress' | 'log'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'today',
    label: 'Today',
    icon: <path d="M4 7h16M4 12h10M4 17h7" />,
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: (
      <>
        <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
        <path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" />
      </>
    ),
  },
  {
    key: 'progress',
    label: 'Progress',
    icon: <path d="M4 18l5-6 4 3.5L20 6" />,
  },
  {
    key: 'log',
    label: 'Log',
    icon: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
  },
]

export default function App() {
  const { settings, setTheme } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => clampToBlock(todayISO()))
  const [tier, setTier] = useState<TierName>('must')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  const openDay = (d: string) => {
    setDate(d)
    setTab('today')
    window.scrollTo({ top: 0 })
  }

  return (
    <RestTimerProvider>
      <div className="mx-auto flex min-h-full w-full max-w-5xl md:gap-6 md:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col py-6 md:flex">
          <Brand />
          <nav className="mt-8 flex flex-col gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
                style={{
                  background: tab === t.key ? 'var(--surface)' : 'transparent',
                  color: tab === t.key ? 'var(--color-accent)' : 'var(--ink-3)',
                }}
              >
                <Icon>{t.icon}</Icon>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto">
            <ThemeToggle theme={settings.theme} setTheme={setTheme} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex items-center justify-between px-4 pt-4 md:hidden">
            <Brand compact />
            <ThemeToggle theme={settings.theme} setTheme={setTheme} compact />
          </div>

          <div
            className="px-4 pt-5 md:px-0 md:pt-8"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
          >
            {tab === 'today' && (
              <Today date={date} setDate={setDate} tier={tier} setTier={setTier} />
            )}
            {tab === 'plan' && <PlanScreen onOpenDay={openDay} />}
            {tab === 'progress' && (
              <Suspense fallback={<p className="py-10 text-center text-sm" style={{ color: 'var(--ink-3)' }}>Loading charts…</p>}>
                <Progress />
              </Suspense>
            )}
            {tab === 'log' && <LogScreen date={date} setDate={setDate} />}
          </div>
        </main>

        {/* Mobile tab bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur md:hidden"
          style={{
            background: 'color-mix(in oklab, var(--bg) 92%, transparent)',
            borderColor: 'var(--line)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold"
              style={{ color: tab === t.key ? 'var(--color-accent)' : 'var(--ink-3)' }}
            >
              <Icon>{t.icon}</Icon>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </RestTimerProvider>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div>
      <div
        className="text-[10px] font-bold tracking-[0.22em] uppercase"
        style={{ color: 'var(--color-accent)' }}
      >
        {meta.blockName}
      </div>
      {!compact && (
        <div className="mt-1 text-lg leading-tight font-extrabold tracking-tight">
          {meta.athlete}
          <span style={{ color: 'var(--ink-3)' }}> · {meta.goal.toLowerCase()}</span>
        </div>
      )}
    </div>
  )
}

function ThemeToggle({
  theme,
  setTheme,
  compact,
}: {
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  compact?: boolean
}) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={`flex items-center gap-2 rounded-xl border font-semibold ${
        compact ? 'h-9 w-9 justify-center' : 'px-3 py-2.5 text-sm'
      }`}
      style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
    >
      <Icon>
        {theme === 'dark' ? (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
          </>
        )}
      </Icon>
      {!compact && (theme === 'dark' ? 'Dark' : 'Light')}
    </button>
  )
}
