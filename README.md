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

Two build targets:

```bash
npm run build
```

`dist/` — a normal hashed bundle with the charts code-split out, for GitHub Pages or any static
host. Relative base, so a subpath works.

```bash
npm run build:file
```

`dist-file/` — the offline copy. One `index.html` with every byte of CSS and JS inlined, plus
the `exercises/` folder beside it. Double-click it and it runs from `file://`, no server. The
inlining is what makes that work: browsers refuse to load an *external* ES module from
`file://`, but an inline one runs fine.

`npm run verify:file` builds that target and drives it in Chrome over a real `file://` URL,
asserting the page boots, an exercise frame decodes, `localStorage` works, and the images still
draw with `fetch` and IndexedDB removed entirely. Set `CHROME_PATH` if Chrome is not in the
usual place.

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
- **Each exercise is measured in its own units.** A plank takes seconds, a bike ride takes
  minutes and kilometres, a push-up takes reps, and a farmer's walk takes both kilograms and
  seconds. The mapping lives in `metricsFor()` in `src/lib/program.ts`, one line per exercise.
- **Step goals are set for a day spent at home**: 3,500 / 5,000 on training days and
  5,500 / 8,000 on the rest days, when there is no session eating into the walking.
- **Every exercise can be rated and annotated** — too easy through too hard, plus a note. The
  Progress tab averages those and sorts hardest first, with every note kept and dated. That
  section is the raw material for writing month 2.
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
