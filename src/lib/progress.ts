import { isDayComplete, type Habit, type ID, type Milestone, type Project, type ProjectProgress, type Subtask } from '../types';

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
 * Compute a project's overall progress as a pure function of its milestones,
 * their sub-tasks (auto-roll-up), and (optionally) its linked-habit
 * contribution.
 *
 * Model — a COUNT-WEIGHTED POOL refined for sub-tasks. Each milestone
 * contributes units toward the goal: a milestone WITH sub-tasks contributes
 * `subtaskCount` units (of which `completedSubtasks` are done); a milestone
 * with NO sub-tasks contributes one unit (done iff the milestone is). Linked
 * habits pool in as one unit each, unchanged:
 *
 *     fraction = (Σ milestoneUnitsCompleted + completedLinkedHabits)
 *                / (Σ milestoneUnitsTotal + totalLinkedHabits)
 *
 * Counting each sub-task as a unit keeps progress proportional to the real
 * work outstanding rather than letting a sub-task-heavy milestone weigh the
 * same as a bare one. When a project has neither milestones nor linked habits,
 * `manualProgress` is the fallback. Both sub-task and linked-habit data are
 * optional, so with neither this reduces exactly to the prior milestone/manual
 * behaviour.
 *
 * Pure, fully typed, and unit-tested (mirrors `computeStreak`).
 */
export function computeProjectProgress(
  project: Project,
  milestones: readonly Milestone[],
  options: {
    linkedHabits?: LinkedHabitContribution;
    subtasksByMilestone?: ReadonlyMap<ID, readonly Subtask[]>;
  } = {},
): ProjectProgress {
  const milestonesTotal = milestones.length;
  const milestonesCompleted = milestones.reduce((n, m) => (m.completed ? n + 1 : n), 0);

  let milestoneUnitsTotal = 0;
  let milestoneUnitsCompleted = 0;
  let subtasksTotal = 0;
  let subtasksCompleted = 0;
  for (const m of milestones) {
    const subtasks = options.subtasksByMilestone?.get(m.id) ?? [];
    if (subtasks.length > 0) {
      const done = subtasks.reduce((n, s) => (s.completed ? n + 1 : n), 0);
      milestoneUnitsTotal += subtasks.length;
      milestoneUnitsCompleted += done;
      subtasksTotal += subtasks.length;
      subtasksCompleted += done;
    } else {
      milestoneUnitsTotal += 1;
      milestoneUnitsCompleted += m.completed ? 1 : 0;
    }
  }

  const linkedTotal = options.linkedHabits?.total ?? 0;
  const linkedCompleted = options.linkedHabits
    ? Math.min(Math.max(0, options.linkedHabits.completed), linkedTotal)
    : 0;

  const unitTotal = milestoneUnitsTotal + linkedTotal;
  const fraction =
    unitTotal > 0
      ? clamp01((milestoneUnitsCompleted + linkedCompleted) / unitTotal)
      : clamp01(project.manualProgress);

  return {
    projectId: project.id,
    fraction,
    percent: Math.round(fraction * 100),
    milestonesTotal,
    milestonesCompleted,
    subtasksTotal,
    subtasksCompleted,
    linkedHabits: linkedTotal,
  };
}
