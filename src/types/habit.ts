import type { DayKey, ID, ISODateString } from './common';

/**
 * Discriminator for the two kinds of habit Stride tracks:
 * - `binary`     — simple Yes/No, e.g. "Meditate".
 * - `quantified` — has a numeric daily target, e.g. "Drink 3L of water".
 */
export type HabitType = 'binary' | 'quantified';

/** Fields common to every habit, regardless of kind. */
interface HabitBase {
  id: ID;
  name: string;

  /**
   * Optional link to a {@link Project}. `null` when the habit stands alone.
   * This is the foundation of "The Link" (D7): completing a habit that
   * references a project contributes to that project's progress.
   */
  projectId: ID | null;

  /** Tailwind-friendly accent color token (hex), used in the UI. */
  color: string;

  /** Name of a lucide-react icon rendered for this habit. */
  icon: string;

  /** Display/ordering position within the habit list (ascending). */
  sortOrder: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  /** When set, the habit is archived (hidden) but its history is preserved. */
  archivedAt: ISODateString | null;
}

/** A simple Yes/No habit — done or not done for a given day. */
export interface BinaryHabit extends HabitBase {
  type: 'binary';
}

/**
 * A quantified habit with a numeric daily target. A day counts as complete
 * once the logged amount reaches {@link QuantifiedHabit.target}.
 */
export interface QuantifiedHabit extends HabitBase {
  type: 'quantified';
  /** Daily goal amount, e.g. `3` for "Drink 3L of water". Must be > 0. */
  target: number;
  /** Unit label shown next to the amount, e.g. `"L"`, `"pages"`, `"reps"`. */
  unit: string;
}

/** A habit is either binary (Yes/No) or quantified (target-based). */
export type Habit = BinaryHabit | QuantifiedHabit;

/**
 * One day's completion record for a habit. Exactly one record exists per
 * `(habitId, date)` pair; `value` is the cumulative amount logged that day.
 *
 * - For a {@link BinaryHabit}, `value` is `1` when done.
 * - For a {@link QuantifiedHabit}, `value` accumulates toward the target.
 */
export interface HabitCompletion {
  id: ID;
  habitId: ID;
  /** Local calendar day this completion belongs to. */
  date: DayKey;
  /** Cumulative amount logged for the day (binary: 1, quantified: amount). */
  value: number;
  /** Timestamp of the most recent change to this day's record. */
  completedAt: ISODateString;
}

/**
 * Current and best streak for a habit, expressed in consecutive qualifying
 * days. Computed from {@link HabitCompletion} history (D5), not persisted.
 */
export interface HabitStreak {
  current: number;
  best: number;
  /** Whether today already qualifies as complete. */
  completedToday: boolean;
}

/** Type guard narrowing a {@link Habit} to a {@link QuantifiedHabit}. */
export function isQuantifiedHabit(habit: Habit): habit is QuantifiedHabit {
  return habit.type === 'quantified';
}

/** Type guard narrowing a {@link Habit} to a {@link BinaryHabit}. */
export function isBinaryHabit(habit: Habit): habit is BinaryHabit {
  return habit.type === 'binary';
}

/**
 * Whether a day's record satisfies the habit's completion criterion:
 * any positive value for binary habits, reaching the target for quantified.
 */
export function isDayComplete(habit: Habit, value: number): boolean {
  return isQuantifiedHabit(habit) ? value >= habit.target : value > 0;
}
