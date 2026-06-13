import Dexie, { type Table } from 'dexie';
import type { Habit, HabitCompletion, Milestone, Project, Subtask } from '../types';

/**
 * The Stride IndexedDB database (offline-first persistence via Dexie).
 *
 * Schema design notes:
 * - `completions` has a UNIQUE compound index `&[habitId+date]` so there is
 *   at most one completion record per habit per local day — toggle/complete
 *   upserts that single record instead of accumulating duplicates.
 * - `milestones` is indexed by `projectId` (and `[projectId+sortOrder]`) so a
 *   project's milestones can be fetched and ordered cheaply.
 * - `subtasks` mirrors that shape under `milestoneId` (and
 *   `[milestoneId+sortOrder]`) so a milestone's sub-tasks fetch and order
 *   cheaply for the auto-roll-up (v2). Existing `Milestone` rows gain
 *   `deadline` lazily — code treats a missing value as `null`, so no backfill
 *   is needed.
 * - Habit and project tables are independent; the only link is the optional
 *   `Habit.projectId` reference (resolved in The Link, D7).
 */
export class StrideDatabase extends Dexie {
  declare habits: Table<Habit, string>;
  declare completions: Table<HabitCompletion, string>;
  declare projects: Table<Project, string>;
  declare milestones: Table<Milestone, string>;
  declare subtasks: Table<Subtask, string>;

  constructor() {
    super('stride');
    this.version(1).stores({
      habits: 'id, sortOrder, projectId, type',
      completions: 'id, &[habitId+date], habitId, date',
      projects: 'id, sortOrder',
      milestones: 'id, projectId, [projectId+sortOrder]',
    });
    this.version(2).stores({
      subtasks: 'id, milestoneId, [milestoneId+sortOrder]',
    });
  }
}

/** Singleton database instance shared across the app. */
export const db = new StrideDatabase();
