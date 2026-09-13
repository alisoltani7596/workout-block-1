# Block 1: Re-entry

A personal workout and body tracker for one 17-day training block, 14–30 September 2026.

The programme itself lives in [`src/data/plan.json`](src/data/plan.json) and is read-only — the
app never edits it. Everything you type (weights, sets, body numbers) lives in `localStorage`
under a single key, `workout-block-1/v1`. There is no backend and no account.

## Running it

```bash
npm install
npm run dev
```

```bash
npm run build && npm run preview
```

The build uses a relative base, so `dist/` can be dropped straight into GitHub Pages or any
static host. Opening `dist/index.html` directly as a `file://` URL will not work in Chrome or
Safari — they refuse to load ES-module bundles from `file://` — so serve the folder instead
(`npm run preview`, or `python3 -m http.server` inside `dist/`).

## Screens

- **Today** — the day's session, MUST or BEST, with per-set logging, last-time weights, a rest
  timer, targets, the coach note and the daily habit checklist.
- **Plan** — all 17 days grouped by week, filterable by type, plus the block rules and habits.
- **Progress** — weight trend against the target band, session adherence, steps and active
  calories against goal, sleep against next-day RPE, and a weekly summary.
- **Log** — one form per day for the Garmin numbers, session tier, RPE and notes, plus
  JSON/CSV export and JSON import.

## Notes on a few decisions

- **Walk minutes** are read from the **intensity minutes** field. The data model in the brief
  has no separate walk-minutes input, and intensity minutes is the closest Garmin number.
- **Exercise images** come from the public-domain [`yuhonas/free-exercise-db`]
  (https://github.com/yuhonas/free-exercise-db) dataset. All 50 frames (25 exercises × start
  and end) are vendored into `public/exercises/` so the app works with no signal on its very
  first load. At runtime each frame resolves through IndexedDB → bundled file → the upstream
  URL → a lettered placeholder, so a failure never breaks the layout.
- **The weight projection stays hidden** until there are at least three weigh-ins spanning a
  week. Extrapolating from two adjacent mornings produces a confident-looking number that means
  nothing, which is the opposite of what this screen is for.
- **Nothing shames a missed day.** `missed` is a first-class tier, coloured neutral, and the
  streak counter simply stops rather than scolding.
