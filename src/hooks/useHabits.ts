import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { todayKey } from '../lib/date';
import type { DayKey, Habit, HabitCompletion, ID } from '../types';

/**
 * Reactive list of habits ordered by `sortOrder`. Re-renders automatically on
 * any write to the habits table. Archived habits are excluded by default.
 */
export function useHabits(includeArchived = false): Habit[] {
  return useLiveQuery(
    async () => {
      const all = await db.habits.orderBy('sortOrder').toArray();
      return includeArchived ? all : all.filter((h) => h.archivedAt === null);
    },
    [includeArchived],
    [] as Habit[],
  );
}

/** Reactive single habit by id (`undefined` while loading or if missing). */
export function useHabit(id: ID | undefined): Habit | undefined {
  return useLiveQuery(() => (id ? db.habits.get(id) : undefined), [id]);
}

/**
 * Reactive map of `habitId → completion` for a single day (defaults to today).
 * Lets the UI look up each habit's progress for the day in O(1).
 */
export function useCompletionsForDate(date: DayKey = todayKey()): Map<ID, HabitCompletion> {
  return useLiveQuery(
    async () => {
      const rows = await db.completions.where('date').equals(date).toArray();
      return new Map(rows.map((row) => [row.habitId, row] as const));
    },
    [date],
    new Map<ID, HabitCompletion>(),
  );
}

/** Reactive full completion history for one habit (used for streaks, D5). */
export function useHabitCompletions(habitId: ID | undefined): HabitCompletion[] {
  return useLiveQuery(
    () =>
      habitId
        ? db.completions.where('habitId').equals(habitId).toArray()
        : Promise.resolve<HabitCompletion[]>([]),
    [habitId],
    [] as HabitCompletion[],
  );
}
