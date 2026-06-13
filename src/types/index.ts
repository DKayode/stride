/**
 * Barrel for the Stride domain model. Import entities from `@/types`
 * (or `../types`) rather than reaching into individual modules.
 */
export type { ID, ISODateString, DayKey } from './common';

export type {
  HabitType,
  BinaryHabit,
  QuantifiedHabit,
  Habit,
  HabitCompletion,
  HabitStreak,
} from './habit';
export { isQuantifiedHabit, isBinaryHabit, isDayComplete } from './habit';

export type { Project, Milestone, Subtask, ProjectProgress } from './project';
