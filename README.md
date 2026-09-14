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

## Getting your watch's numbers in

The app has no backend, so nothing can push into it on its own. Instead the page accepts
numbers in its URL and merges them into the right day, field by field, without touching sets
or feedback:

```
…/#log?date=2026-09-14&steps=4812&activeKcal=396&restingHr=54&weightKg=93.4
…/#import=<base64url JSON of { logs: { "2026-09-14": { … } } }>
```

Two things feed that.

### From the iPhone — Apple Health, one tap a day

Garmin Connect writes to Apple Health once you enable it (Garmin Connect → Settings → Health
sync). The Shortcut in [`shortcuts/`](shortcuts/) reads **yesterday's** steps, active
calories, resting heart rate and weight from Health and opens the app with them. Install it by
opening the `.shortcut` file on the phone, then edit the first Text action to wherever the app
is hosted. Run it in the morning so "yesterday" is a complete day — or add it as a personal
Automation at 07:00 (with *Run Immediately* on) so it just happens. The first run asks for
Health read access and permission to open URLs — grant both once.

Two things to check before trusting the numbers: Health must be set to **kilograms**
(Health → Profile → Units → Weight), because the Shortcut sends whatever unit Health displays
and does not convert pounds. And the two Date actions are typed as "yesterday at 00:00" /
"today at 00:00" — confirm they resolve to midnight on your phone's locale after import.

`shortcuts/Sync Health to Block 1.xml` is the unsigned source, kept so changes are readable
in git; the `.shortcut` is the signed one you install.

What it cannot carry: **Garmin's sleep score and Body Battery**. Those never leave Garmin
Connect into Apple Health. For those you need the Mac route.

### From the Mac — straight from Garmin Connect, everything

```bash
npm run garmin -- --email you@example.com
```

Pulls the last seven days — sleep score, Body Battery (the day's high, which is the wake-up
reading), steps, active and total calories, resting HR, intensity minutes and weight — and
writes `garmin/pull-<from>_<to>.json`, which the Log tab's Import button reads. Add `--open`
and it opens the app with the days already loaded, no clicking. `--from 2026-09-14` sets the
start; `--url` overrides where the app lives (default is the GitHub Pages URL in the script).

The first run needs your Garmin password, which it reads from the macOS Keychain — add it
yourself, once, and it is never echoed or written anywhere else:

```bash
security add-generic-password -s workout-block-1-garmin -a "you@example.com" -w
```

After that Garmin's OAuth tokens live in `~/.workout-block-1/garmin-tokens/` and the password
is not used again. This goes through Garmin's own web API via the unofficial `garmin-connect`
package (Garmin's official Health API is partner-only). If it stops working after an update on
Garmin's side, `npm update garmin-connect` is usually the fix. `npm run test:garmin` exercises
the data shaping against a fake client, since the real one needs your account.

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
