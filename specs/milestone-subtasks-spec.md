PROJECT: Stride — Milestone Sub-tasks with Deadlines

GOAL
Extend the Projects/Milestones domain so each Milestone can own an ordered list of
SUB-TASKS, and both Milestones and Sub-tasks can carry an optional DEADLINE (due date).
Sub-task completion AUTO-ROLLS-UP into milestone completion and project progress.

CONTEXT (current state — read before building)
- Domain types live in `src/types/project.ts`: `Project`, `Milestone`, `ProjectProgress`.
- Dexie schema in `src/db/database.ts` is at `version(1)`; tables: habits, completions,
  projects, milestones. `milestones` indexed by `id, projectId, [projectId+sortOrder]`.
- Milestone CRUD in `src/db/projects.ts` (addMilestone, updateMilestone,
  setMilestoneCompleted, toggleMilestone, deleteMilestone; deleteProject cascades to
  milestones). Re-exported via `src/db/index.ts`.
- Hooks in `src/hooks/useProjects.ts`: useMilestones(projectId), useProjectProgress, etc.
- Progress math in `src/lib/progress.ts`: `computeProjectProgress` is a COUNT-WEIGHTED
  POOL over (milestones + linked habits). PURE + unit-tested.
- UI in `src/features/projects/ProjectDetail.tsx`: milestone list, toggle, add, delete.
- Date helpers in `src/lib/date.ts` (DayKey/todayKey). ISODateString in `src/types/common.ts`.

TECH STACK (unchanged, non-negotiable)
- React + Vite + TypeScript + Tailwind. Dexie.js for persistence. lucide-react icons. pnpm.
- Mobile-first, offline-first. Fully typed. NO TODO stubs, NO placeholders.
- Match existing code style, file layout, JSDoc density, and idioms exactly.

PRODUCT DECISIONS (locked — do not re-litigate)
- AUTO-ROLL-UP: a milestone with ≥1 sub-task is "completed" IFF all its sub-tasks are
  completed. Its checkbox becomes derived (read-only) and reflects sub-task state.
  A milestone with ZERO sub-tasks keeps today's behavior: a manual completion checkbox.
- DEADLINES ON BOTH: Milestone gets optional `deadline`, Sub-task gets optional `deadline`.
  Deadlines are a local calendar day (DayKey), nullable. Overdue = deadline < today AND
  not completed; surface visually (e.g. red text / badge). Completed items never show overdue.
- Progress: project progress counts each SUB-TASK as a unit when a milestone has sub-tasks;
  a milestone with no sub-tasks counts as one unit (as today). See deliverable 5 for exact math.

DELIVERABLES (implement ONE AT A TIME, commit after each, verify against this spec)

1. Domain type: add `Subtask` to `src/types/project.ts` and export from `src/types/index.ts`.
   Fields (mirror Milestone conventions):
     id: ID; milestoneId: ID; title: string;
     completed: boolean; completedAt: ISODateString | null;
     deadline: DayKey | null;            // optional due date
     sortOrder: number;
     createdAt: ISODateString; updatedAt: ISODateString;
   Add `deadline: DayKey | null` to `Milestone`. JSDoc every new field in the existing style.

2. Dexie schema migration: bump `src/db/database.ts` to `version(2)`.
   - Add `subtasks` table indexed `id, milestoneId, [milestoneId+sortOrder]`.
   - Keep `version(1)` block present; add `version(2)` with the new store. Existing
     `Milestone` rows gain `deadline` lazily (treat undefined as null in code) — do NOT
     write a data backfill unless trivial via a Dexie upgrade callback.
   - Declare the `subtasks: Table<Subtask, string>` on the class.

3. Sub-task CRUD in `src/db/projects.ts` (export via `src/db/index.ts`):
     addSubtask(milestoneId, title, deadline?) -> Subtask   (sortOrder = next in milestone)
     updateSubtask(id, patch: Partial<{title; deadline: DayKey|null; sortOrder}>)
     setSubtaskCompleted(id, completed)  // stamps completedAt; then reconcile parent milestone
     toggleSubtask(id)
     deleteSubtask(id)                   // then reconcile parent milestone
   - Add `deadline` to `updateMilestone`'s accepted patch and to milestone create input.
   - RECONCILE rule: after any sub-task add/toggle/delete, recompute the parent milestone's
     `completed`/`completedAt` from its sub-tasks (all done -> completed; otherwise not).
     Centralize this in one helper; wrap multi-write ops in `db.transaction('rw', ...)`.
   - CASCADE: deleting a milestone deletes its sub-tasks; `deleteProject` must also delete
     sub-tasks of the project's milestones (extend its existing transaction).

4. Hook: `useSubtasks(milestoneId)` in `src/hooks/useProjects.ts` — reactive, ordered by
   sortOrder, mirroring `useMilestones`. Export via `src/hooks/index.ts` if applicable.

5. Progress math in `src/lib/progress.ts` — extend `computeProjectProgress` (keep it PURE
   and add unit tests in `progress.test.ts`):
   - Accept the project's sub-tasks (grouped per milestone) as an additional input.
   - Count-weighted pool, refined: for each milestone, if it has sub-tasks, contribute
     `completedSubtasks` toward total `subtaskCount`; if it has none, contribute 1 unit
     (completed -> 1) as today. Linked-habit units continue to pool in unchanged.
       fraction = (Σ milestoneUnitsCompleted + linkedCompleted) / (Σ milestoneUnitsTotal + linkedTotal)
   - Update `useProjectProgress` to feed sub-tasks in. `ProjectProgress` may gain
     `subtasksTotal`/`subtasksCompleted` if useful for display (optional, typed).

6. UI in `src/features/projects/ProjectDetail.tsx`:
   - Each milestone row is expandable to reveal its sub-tasks (ordered list).
   - When a milestone has sub-tasks, its checkbox is DERIVED/read-only (shows rolled-up
     state); when it has none, keep the manual toggle.
   - Add a sub-task under a milestone: text input + optional date picker (`<input type="date">`,
     stored as DayKey). Toggle, edit, and delete sub-tasks (reuse the tap-again-to-confirm
     delete pattern already used for milestones).
   - Show each sub-task's deadline; render OVERDUE (incomplete + past) in danger styling.
   - Allow setting/clearing a milestone deadline too; show it on the milestone row with the
     same overdue treatment. Mobile-first, matches existing Sheet/Tailwind styling.

7. Tests: extend `src/db/projects.test.ts` for sub-task CRUD + reconcile + cascade, and
   `src/lib/progress.test.ts` for the refined pool math (milestone with/without sub-tasks,
   mixed, plus linked habits). All existing tests must still pass.

SUCCESS CRITERIA
- `pnpm typecheck` clean; `pnpm test` all green (existing 49 + new); `pnpm build` succeeds.
- Adding sub-tasks to a milestone makes its checkbox derived; completing all sub-tasks
  auto-completes the milestone and bumps project %; un-completing one reverses it.
- Milestone with no sub-tasks behaves exactly as before.
- Overdue (incomplete, past-deadline) sub-tasks and milestones are visually flagged; completed
  ones never show overdue. Deadlines persist offline across reloads.
- Deleting a milestone or project removes all descendant sub-tasks (no orphans in IndexedDB).
- No TypeScript errors; no runtime console errors; code matches existing style.
