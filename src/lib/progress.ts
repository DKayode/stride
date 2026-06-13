import { isDayComplete, type Habit, type ID, type Milestone, type Project, type ProjectProgress } from '../types';

/**
 * Aggregate contribution of habits linked to a project (The Link, D7),
 * expressed as raw counts so it can be pooled with milestones by count.
 * `total` is how many (non-archived) habits are linked; `completed` is how
 * many of those are complete for the reference day.
 */
export interface LinkedHabitContribution {
  total: number;
  completed: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Return milestones sorted by their `sortOrder` (ascending), non-mutating. */
export function orderMilestones(milestones: readonly Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Compute the linked-habit contribution for a set of habits given each
 * habit's logged value for the reference day. Pure and unit-tested; the
 * reactive hook supplies the per-habit values from today's completions.
 */
export function computeLinkedContribution(
  linkedHabits: readonly Habit[],
  valuesByHabit: ReadonlyMap<ID, number>,
): LinkedHabitContribution {
  let completed = 0;
  for (const habit of linkedHabits) {
    if (isDayComplete(habit, valuesByHabit.get(habit.id) ?? 0)) {
      completed += 1;
    }
  }
  return { total: linkedHabits.length, completed };
}

/**
 * Compute a project's overall progress as a pure function of its milestones
 * and (optionally) its linked-habit contribution.
 *
 * Model — a COUNT-WEIGHTED POOL: every milestone and every linked habit is one
 * unit toward the goal:
 *
 *     fraction = (completedMilestones + completedLinkedHabits)
 *                / (totalMilestones + totalLinkedHabits)
 *
 * This keeps linked-habit completion proportional: in a 10-milestone project
 * with one linked habit, that habit is worth 1/11 of progress — a meaningful,
 * intuitive nudge rather than the wild swing of an equal-weight average. When
 * a project has neither milestones nor linked habits, `manualProgress` is the
 * fallback. Linked-habit data is optional, so with no link this reduces
 * exactly to the D6 milestone/manual behaviour.
 *
 * Pure, fully typed, and unit-tested (mirrors `computeStreak`).
 */
export function computeProjectProgress(
  project: Project,
  milestones: readonly Milestone[],
  options: { linkedHabits?: LinkedHabitContribution } = {},
): ProjectProgress {
  const milestonesTotal = milestones.length;
  const milestonesCompleted = milestones.reduce((n, m) => (m.completed ? n + 1 : n), 0);

  const linkedTotal = options.linkedHabits?.total ?? 0;
  const linkedCompleted = options.linkedHabits
    ? Math.min(Math.max(0, options.linkedHabits.completed), linkedTotal)
    : 0;

  const unitTotal = milestonesTotal + linkedTotal;
  const fraction =
    unitTotal > 0
      ? clamp01((milestonesCompleted + linkedCompleted) / unitTotal)
      : clamp01(project.manualProgress);

  return {
    projectId: project.id,
    fraction,
    percent: Math.round(fraction * 100),
    milestonesTotal,
    milestonesCompleted,
    linkedHabits: linkedTotal,
  };
}
