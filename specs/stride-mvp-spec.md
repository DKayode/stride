PROJECT: Stride — Offline-first Habit + Project tracker (PWA → TWA)

GOAL
Build a highly optimized, minimalist, offline-first Progressive Web App called "Stride"
that tracks BOTH daily habits (micro consistency) and project advancement/milestones
(macro progress), and can be wrapped as a Trusted Web Activity (TWA) for the Google
Play Store.

TECH STACK (non-negotiable)
- React + Vite + TypeScript + Tailwind CSS
- Persistence: IndexedDB via Dexie.js (preferred) or idb-keyval — 100% offline-first
- Icons: lucide-react
- PWA: vite-plugin-pwa (Workbox) for service worker, caching, manifest
- Package manager: pnpm

CONSTRAINTS
- Strictly mobile-first. Sticky bottom navigation bar.
- Disable native pull-to-refresh / overscroll glow via CSS `overscroll-behavior-y: contain`.
- No accidental text selection on interactive elements; visual (haptic-ready) feedback on tap.
- Fully typed. NO placeholders, NO blank functions, NO TODO stubs in delivered code.
- Production-ready, clean, idiomatic React + TS.
- Everything must work offline; all actions persist instantly to IndexedDB.

DELIVERABLES (implement ONE AT A TIME, verify each against this spec)
1. Project scaffold: Vite + React + TS + Tailwind, pnpm, lucide-react, dexie,
   vite-plugin-pwa. Clean directory layout. `pnpm dev` and `pnpm build` both succeed.
2. Config files:
   - vite.config.ts wired with vite-plugin-pwa: offline caching of app shell, assets,
     fonts, and icons; auto-update OR prompt-for-update via Workbox window.
   - public/manifest.json (or plugin manifest) for "Stride": display=standalone,
     background_color + theme_color, standard 192/512 icons AND maskable icons,
     suitable to pass Play Store Asset Links validation.
3. Domain types (src/types): `Habit`, `Project`, `Milestone`. Habits may optionally
   reference a `projectId` (the Link feature). Quantified habits support a target
   (e.g. "Drink 3L of water") as well as simple Yes/No.
4. Offline storage layer: a Dexie database wrapper + typed hooks (e.g. useHabits,
   useProjects) OR a useLocalStorage-style hook. Must expose CRUD + toggle/complete.
5. Habit Tracking (Micro): create / edit / delete / toggle daily habits (Yes/No and
   quantified). Automatic streak calculation (current streak + best streak).
6. Project Advancement (Macro): create projects, overall progress %, milestones/phases
   with their own completion state.
7. The Link: link a habit to a project; completing linked habits contributes to / is
   reflected in the project's progress.
8. Dashboard: unified mobile-first view — current week's habit completion grid alongside
   a visual indicator of each project's progress.
9. App.tsx shell: sticky bottom nav, header with an "Install Stride" button that is
   HIDDEN when already installed or running as TWA/standalone, unified habits+projects view.
10. TWA checklist: actionable bubblewrap CLI / TwaManifest template + assetlinks.json
    guidance so the PWA can later be compiled to an .apk smoothly. Put it in TWA.md.

SUCCESS CRITERIA
- `pnpm build` produces a PWA that passes an installability check (manifest + SW + icons).
- App loads and is fully usable offline (verify with network disabled).
- Streaks compute correctly across day boundaries.
- Habit↔Project link visibly affects project progress on the dashboard.
- Bottom nav works; pull-to-refresh is suppressed; install button hides in standalone mode.
- No TypeScript errors (`pnpm tsc --noEmit` clean); no console errors at runtime.
- TWA.md gives a working bubblewrap init/build recipe and assetlinks.json template.
