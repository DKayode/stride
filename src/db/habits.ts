import { db } from './database';
import { newId } from '../lib/id';
import { todayKey } from '../lib/date';
import {
  isQuantifiedHabit,
  type DayKey,
  type Habit,
  type HabitCompletion,
  type ID,
  type ISODateString,
} from '../types';

const DEFAULT_COLOR = '#6366f1';
const DEFAULT_ICON = 'activity';

function nowIso(): ISODateString {
  return new Date().toISOString();
}

/** Input for creating a habit — a discriminated union mirroring {@link Habit}. */
export type CreateHabitInput =
  | {
      type: 'binary';
      name: string;
      projectId?: ID | null;
      color?: string;
      icon?: string;
      sortOrder?: number;
    }
  | {
      type: 'quantified';
      name: string;
      target: number;
      unit: string;
      projectId?: ID | null;
      color?: string;
      icon?: string;
      sortOrder?: number;
    };

/** Mutable habit fields accepted by {@link updateHabit}. */
export type UpdateHabitInput = Partial<{
  name: string;
  projectId: ID | null;
  color: string;
  icon: string;
  sortOrder: number;
  target: number;
  unit: string;
  archivedAt: ISODateString | null;
}>;

async function nextHabitSortOrder(): Promise<number> {
  const last = await db.habits.orderBy('sortOrder').last();
  return last ? last.sortOrder + 1 : 0;
}

/** Create and persist a new habit. Returns the stored entity. */
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const ts = nowIso();
  const common = {
    id: newId(),
    name: input.name.trim(),
    projectId: input.projectId ?? null,
    color: input.color ?? DEFAULT_COLOR,
    icon: input.icon ?? DEFAULT_ICON,
    sortOrder: input.sortOrder ?? (await nextHabitSortOrder()),
    createdAt: ts,
    updatedAt: ts,
    archivedAt: null,
  };
  const habit: Habit =
    input.type === 'quantified'
      ? { ...common, type: 'quantified', target: input.target, unit: input.unit }
      : { ...common, type: 'binary' };
  await db.habits.add(habit);
  return habit;
}

/** Patch mutable fields of a habit. */
export async function updateHabit(id: ID, patch: UpdateHabitInput): Promise<void> {
  await db.habits.update(id, { ...patch, updatedAt: nowIso() });
}

/** Delete a habit and all of its completion history. */
export async function deleteHabit(id: ID): Promise<void> {
  await db.transaction('rw', db.habits, db.completions, async () => {
    await db.completions.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  });
}

/** Archive (hide) or restore a habit without losing its history. */
export async function setHabitArchived(id: ID, archived: boolean): Promise<void> {
  await updateHabit(id, { archivedAt: archived ? nowIso() : null });
}

/** Read the single completion record for a habit on a given day, if any. */
export async function getCompletion(
  habitId: ID,
  date: DayKey = todayKey(),
): Promise<HabitCompletion | undefined> {
  return db.completions.where('[habitId+date]').equals([habitId, date]).first();
}

/**
 * Upsert the one-per-day completion record to `nextValue`. Must run inside a
 * readwrite transaction that includes `db.completions`. A value `<= 0` clears
 * (deletes) the record so no empty rows linger.
 */
async function upsertCompletion(habitId: ID, date: DayKey, nextValue: number): Promise<void> {
  const existing = await db.completions.where('[habitId+date]').equals([habitId, date]).first();
  if (nextValue <= 0) {
    if (existing) await db.completions.delete(existing.id);
    return;
  }
  if (existing) {
    await db.completions.update(existing.id, { value: nextValue, completedAt: nowIso() });
  } else {
    await db.completions.add({
      id: newId(),
      habitId,
      date,
      value: nextValue,
      completedAt: nowIso(),
    });
  }
}

/** Set the exact logged amount for a habit's day (clears at `<= 0`). */
export async function setHabitAmount(
  habit: Habit,
  value: number,
  date: DayKey = todayKey(),
): Promise<void> {
  await db.transaction('rw', db.completions, () =>
    upsertCompletion(habit.id, date, Math.max(0, value)),
  );
}

/** Remove a habit's completion record for the given day. */
export async function clearHabitDay(habit: Habit, date: DayKey = todayKey()): Promise<void> {
  await db.transaction('rw', db.completions, () => upsertCompletion(habit.id, date, 0));
}

/**
 * Quantified flow: add `amount` to the day's logged value (clamped at 0).
 * Reaching the habit's target marks the day complete (see `isDayComplete`).
 */
export async function incrementHabit(
  habit: Habit,
  amount = 1,
  date: DayKey = todayKey(),
): Promise<void> {
  await db.transaction('rw', db.completions, async () => {
    const current = (await getCompletion(habit.id, date))?.value ?? 0;
    await upsertCompletion(habit.id, date, Math.max(0, current + amount));
  });
}

/**
 * Toggle a habit's completion for a day. Binary habits flip done/undone;
 * quantified habits flip between cleared and target-met. Idempotent in the
 * sense that it never creates more than one record per habit/day.
 */
export async function toggleHabit(habit: Habit, date: DayKey = todayKey()): Promise<void> {
  const target = isQuantifiedHabit(habit) ? habit.target : 1;
  await db.transaction('rw', db.completions, async () => {
    const current = (await getCompletion(habit.id, date))?.value ?? 0;
    const isComplete = current >= target;
    await upsertCompletion(habit.id, date, isComplete ? 0 : target);
  });
}
