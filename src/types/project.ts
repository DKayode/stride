import type { ID, ISODateString } from './common';

/**
 * A macro-level goal the user is advancing toward. Progress is derived (D6):
 * from its {@link Milestone}s when present, otherwise from
 * {@link Project.manualProgress}; linked-habit contribution layers on in D7.
 *
 * Kept deliberately separate from the habit domain (see CLAUDE.md domain
 * notes) — the only coupling is the optional `Habit.projectId` reference.
 */
export interface Project {
  id: ID;
  name: string;
  description: string;

  /** Tailwind-friendly accent color token (hex), used in the UI. */
  color: string;

  /** Name of a lucide-react icon rendered for this project. */
  icon: string;

  /** Display/ordering position within the project list (ascending). */
  sortOrder: number;

  /**
   * Manual progress fraction in the range `0..1`. Used as the project's
   * progress only when it has no milestones; ignored once milestones exist
   * (their completion ratio takes over). Always stored so toggling milestones
   * on/off never loses the user's intent.
   */
  manualProgress: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  /** When set, the project is archived (hidden) but preserved. */
  archivedAt: ISODateString | null;
}

/**
 * A discrete phase / checkpoint within a {@link Project}. Milestones carry
 * their own completion state and an explicit ordering within the project.
 */
export interface Milestone {
  id: ID;
  projectId: ID;
  title: string;

  /** Completion state of this milestone. */
  completed: boolean;
  /** When the milestone was completed; `null` while incomplete. */
  completedAt: ISODateString | null;

  /** Ordering position within the parent project (ascending). */
  sortOrder: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Derived progress view for a project, assembled at read time (D6/D7).
 * Not persisted — computed from milestones and linked-habit contribution.
 */
export interface ProjectProgress {
  projectId: ID;
  /** Overall completion fraction in `0..1`. */
  fraction: number;
  /** Convenience integer percentage `0..100` for display. */
  percent: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  /** Number of habits linked to this project (The Link, D7). */
  linkedHabits: number;
}
