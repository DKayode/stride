PROJECT: Stride — Bug fixes + Past-day habits + Hours timer

GOAL
Five user-reported changes: three bug fixes (project form, milestone editing,
long-text readability) plus two features (completing habits for past days via a
day navigator, and a start/stop timer for time-unit quantified habits).

CONTEXT (current state — read before building)
- Stride is LIVE IN PRODUCTION (CI/CD: merge to main → GHCR → VPS). Keep main green.
- React + Vite + TS + Tailwind, Dexie.js, lucide-react, pnpm. Mobile-first, offline-first.
- Match existing code style, JSDoc density, and idioms EXACTLY. No TODO stubs.
- Relevant files:
  - src/features/projects/ProjectForm.tsx        (D1)
  - src/features/projects/ProjectsScreen.tsx     (D1 — where the form is mounted)
  - src/features/projects/ProjectDetail.tsx      (D2, D3 — MilestoneRow component)
  - src/features/habits/HabitsScreen.tsx         (D4 — day navigator host)
  - src/features/habits/HabitCard.tsx            (D4, D5 — tracking controls)
  - src/features/habits/HabitForm.tsx            (D5 — unit field)
  - src/db/habits.ts                             (D4, D5 — all CRUD already takes a `date`)
  - src/lib/date.ts                              (D4 — DayKey helpers, todayKey)
  - src/types/habit.ts                           (D5 — QuantifiedHabit.unit)
- Reference fix: commit 9c3d82d keyed HabitForm by `editing?.id ?? 'new'` to fix the
  exact "edit shows blank/stale" class of bug. D1 is the project-side twin of this.

DELIVERABLES (implement ONE AT A TIME, commit after each; run `pnpm typecheck` &
`pnpm test` before every commit — both MUST pass)

D1 — Fix: new project pre-filled with the last project's info.
  Root cause: ProjectForm seeds its useState from `project` only on mount, so reusing
  the same element for "create" after an edit (or across creates) keeps stale values.
  Fix: in ProjectsScreen (wherever <ProjectForm> is rendered) key it by
  `editing?.id ?? 'new'` so it remounts fresh per target — mirror the HabitForm fix
  (9c3d82d / HabitsScreen). Verify: open create after editing a project → all fields
  blank/defaults (name, description, color=COLORS[1], icon='target').

D2 — Fix: milestone title cannot be edited after creation.
  In ProjectDetail.tsx MilestoneRow, add inline title editing mirroring the existing
  sub-task edit pattern (Pencil button → edit input with Enter=save / Escape=cancel →
  `updateMilestone(id, { title })`). Keep the expand/collapse behavior intact; the edit
  control must not hijack the row's expand toggle. Trim; ignore empty saves.

D3 — Fix: long milestone / sub-task titles are unreadable (truncated).
  MilestoneRow currently uses `truncate` on the milestone title button and the sub-task
  title span. Switch to wrapping so the full text is readable on mobile
  (e.g. `whitespace-normal break-words`, remove `truncate`). Keep line-through on
  completed items and the layout stable (min-w-0 + flex still behave). The project
  description (line-clamp-2 in ProjectDetail header) may also expand to full text.

D4 — Feature: complete habits for past days (day navigator).
  Add a date navigator to HabitsScreen: a header control with ‹ prev / next › arrows and
  the selected day label (e.g. "Today", "Yesterday", or a short date). Hold the selected
  DayKey in HabitsScreen state (default todayKey()). Thread it down to HabitCard so the
  card reads the completion for the SELECTED day and every write targets it:
    - HabitCard: replace the hardcoded `todayKey()` with a `date` prop.
    - toggleHabit / incrementHabit / setHabitAmount already accept a `date` arg — pass it.
  Do NOT allow navigating into the future (cap next at today; disable the › arrow on
  today). Streaks still compute from full history. Add date helpers to src/lib/date.ts as
  needed (addDays, prevDay/nextDay, isToday, a friendly label) — keep them pure + tested.

D5 — Feature: start/stop timer for time-unit quantified habits.
  A quantified habit whose unit denotes time (case-insensitive match of:
  h, hr, hrs, hour, hours, m, min, mins, minute, minutes) gets a start/stop timer on its
  HabitCard, in addition to the existing +/- stepper.
    - Running state must persist across reloads/offline. Store the active timer's start
      timestamp (e.g. a small Dexie table `timers` keyed by habitId, schema version(3),
      OR a typed localStorage helper — pick the lighter option that fits the codebase and
      justify it in the commit). Only one timer per habit; multiple habits may run at once.
    - On STOP: compute elapsed, convert to the habit's unit (hours vs minutes per the unit
      string), and add it to the selected day's value via the existing increment/setAmount
      path (fractional allowed — verify isDayComplete/target math handles non-integers;
      adjust display formatting, not the data model).
    - While running, show elapsed live (ticking) and a Stop control; show Start when idle.
    - Respect D4: the timer logs into the SELECTED day (default today).
  Keep the time-unit detection in one small pure, tested helper (e.g. src/lib/duration.ts).

D6 — Tests + verification.
  Unit-test new pure helpers (date navigation, duration/unit detection, elapsed→unit).
  Extend db tests if a timer table is added. Ensure existing suite stays green. Manually
  verify each deliverable against its acceptance note above on http://localhost:5173.

SUCCESS CRITERIA
- `pnpm typecheck` clean; `pnpm test` all green (existing + new); `pnpm build` succeeds.
- New project form is always blank/defaults; never inherits the previous project.
- Milestone titles editable inline; long milestone/sub-task titles fully readable (wrap).
- Habits screen can navigate to past days and toggle/log completions there (no future).
- Time-unit habits show a working start/stop timer that accrues elapsed time into the
  day's value and survives a page reload while running.
- No TypeScript errors, no runtime console errors; code matches existing style.
- main stays deployable at every commit (each deliverable independently green).
