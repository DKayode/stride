PROJECT: Stride — Desktop browser UI (responsive, mobile preserved)

GOAL
Stride is currently mobile-first and hard-locked to a ~448px column (max-w-md) with a
fixed bottom nav and bottom-sheet modals. On a desktop browser this is a narrow phone
column floating in empty space. Build a DESKTOP-SPECIFIC UI that activates at desktop
widths via responsive breakpoints, WITHOUT regressing the mobile experience at all.

CONTEXT (current state — read before building)
- Stride is LIVE IN PRODUCTION (CI/CD: merge to main → GHCR → VPS). Keep main green.
- React + Vite + TS + Tailwind v4 (CSS-first theme in src/index.css), Dexie, lucide-react, pnpm.
- App shell: src/App.tsx — `mx-auto flex min-h-dvh max-w-md flex-col`, sticky Header,
  `<main className="flex-1 pb-24">` switching 3 tabs, fixed BottomNav, UpdatePrompt.
- Nav: src/components/BottomNav.tsx — fixed bottom, max-w-md, 3 tabs (dashboard/habits/projects).
- Header: src/components/Header.tsx — slim sticky top bar, wordmark + conditional Install button.
- Modals: src/components/Sheet.tsx — bottom sheet (items-end, max-w-md, slide-up).
- Screens: src/features/{dashboard,habits,projects}/*Screen.tsx — each `flex flex-col gap-4 p-4`
  with a header row and a vertical `<ul className="flex flex-col gap-3">` list of cards.
- index.css already gates `.tap:active { scale }` to `@media (pointer: coarse)`, so desktop
  won't get the mobile tap-shrink. overscroll-behavior-y: contain is global (fine to keep).

LOCKED DESIGN DECISIONS (do not re-litigate)
- DESKTOP NAV = LEFT SIDEBAR. A persistent vertical sidebar (wordmark + 3 destinations +
  Install button) shown at desktop widths; the bottom nav remains the mobile nav.
- LAYOUT = RESPONSIVE REFLOW (not master-detail). Same 3 screens; at desktop widths use a
  wider max-width container and multi-column card grids; roomier dashboard. Keep all data
  flows and components — this is layout/CSS + a sidebar, not a rearchitecture.
- MODALS = CENTERED DIALOG ON DESKTOP. The Sheet stays a bottom sheet on mobile and becomes
  a centered modal dialog (backdrop + max-w, vertically centered) at desktop widths — same
  component, responsive.
- Breakpoint: use Tailwind `lg:` (≈1024px) as the mobile→desktop switch unless a screen
  clearly benefits from `md:`/`xl:` for its grid columns. Be consistent; centralize if helpful.

DELIVERABLES (implement ONE AT A TIME, commit after each; run `pnpm typecheck` &
`pnpm test` before every commit — both MUST pass; each commit keeps main deployable)

D1 — Responsive app shell (src/App.tsx).
  Restructure so that:
    - Mobile (default): unchanged — centered max-w-md column, sticky Header, main with
      bottom-nav clearance, fixed BottomNav.
    - Desktop (lg:): a two-region layout — left Sidebar (fixed/sticky, full height) + a main
      content region that is wider (e.g. container max-w-5xl/6xl, centered) with comfortable
      horizontal padding. No bottom-nav clearance on desktop (the `pb-24` must NOT apply at
      lg — there is no bottom nav there).
  Render BottomNav only on mobile (`lg:hidden`) and Sidebar only on desktop (`hidden lg:flex`).
  Keep tab state in App; both navs drive the same `tab`/`setTab`.

D2 — Sidebar nav (new src/components/SideNav.tsx).
  Vertical desktop sidebar: Stride wordmark (Activity icon + name) at top, the 3 destinations
  (Home/Habits/Projects) as full-width nav buttons with icon + label and active highlighting
  (brand color / subtle bg), and the conditional Install button near the bottom. Mirror
  BottomNav's Tab API and active semantics (aria-current). Desktop hover states (hover:)
  since there's no tap feedback. Hidden below lg.

D3 — Responsive modal (src/components/Sheet.tsx).
  Make the overlay responsive: mobile keeps items-end + slide-up bottom sheet + max-w-md +
  rounded-t-3xl; desktop centers it (lg:items-center) as a dialog with max-w (e.g. max-w-lg),
  full rounded corners, and max-h with internal scroll. Preserve Esc-to-close, backdrop
  click, body scroll lock, focus semantics, and aria-modal. One component, responsive classes.

D4 — Multi-column content reflow (the 3 screens + cards).
  - HabitsScreen / ProjectsScreen: turn the vertical `ul` list into a responsive grid at
    wider widths (e.g. `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3/4`); ensure
    HabitCard / ProjectCard look correct as grid cells (no fixed mobile-only assumptions;
    check truncation/wrapping, full-width buttons, progress bars).
    NOTE: the just-shipped Habits day-navigator and the per-card timer must keep working in
    grid form.
  - DashboardScreen: use the extra width — e.g. a roomier week grid and a multi-column
    arrangement of its sections on desktop; keep it single-column on mobile.
  - Scale screen headers/padding up modestly on desktop (e.g. larger title, `lg:p-6/8`).
  - Empty states stay centered and sensible at wide widths (cap their width).

D5 — Desktop polish & correctness pass.
  - Add hover states wherever only `active:` exists on primary interactive elements (desktop
    has no active-tap feedback). Don't remove the mobile `active:` styles.
  - Ensure no horizontal scrollbars at common desktop widths (1280, 1440) and that content is
    width-capped and centered (no full-bleed stretched cards).
  - Verify the install button appears in exactly one place per layout (sidebar on desktop,
    header on mobile) — never both at once.
  - Confirm bottom-sheet→dialog and nav swap happen cleanly at the lg breakpoint (resize test).

D6 — Verify + tests.
  Keep the existing suite green (this is largely presentational; add tests only where new pure
  logic is introduced, e.g. a shared nav-items module). Manually verify at 375px (mobile,
  MUST be visually unchanged) and at 1280px (desktop: sidebar, multi-column, centered dialogs)
  on http://localhost:5173. `pnpm build` succeeds.

SUCCESS CRITERIA
- At ≥1024px: left sidebar nav, wide centered content with multi-column habit/project grids,
  roomier dashboard, and create/edit forms as centered dialogs. No bottom nav, no phone column.
- At <1024px: IDENTICAL to today — bottom nav, max-w-md column, bottom-sheet modals. Zero
  visual regression on mobile.
- Day-navigator + habit timer + milestone/sub-task editing all still work in the new layouts.
- No horizontal overflow at desktop widths; install button never duplicated.
- `pnpm typecheck` clean; `pnpm test` green; `pnpm build` succeeds; no runtime console errors.
- Code matches existing style/JSDoc; no new dependencies; offline-first behavior intact.
