import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  clearHabitDay,
  createHabit,
  deleteHabit,
  getCompletion,
  incrementHabit,
  setHabitAmount,
  toggleHabit,
  updateHabit,
} from './habits';
import { todayKey } from '../lib/date';
import { isDayComplete } from '../types';

async function clearDb(): Promise<void> {
  await Promise.all([
    db.habits.clear(),
    db.completions.clear(),
    db.projects.clear(),
    db.milestones.clear(),
  ]);
}

function countCompletions(habitId: string): Promise<number> {
  return db.completions.where('habitId').equals(habitId).count();
}

beforeEach(clearDb);

describe('habit CRUD', () => {
  it('creates and reads back a binary habit with defaults', async () => {
    const habit = await createHabit({ type: 'binary', name: '  Meditate  ' });
    const stored = await db.habits.get(habit.id);
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('Meditate');
    expect(stored?.type).toBe('binary');
    expect(stored?.projectId).toBeNull();
    expect(stored?.archivedAt).toBeNull();
    expect(await db.habits.count()).toBe(1);
  });

  it('creates a quantified habit carrying target + unit', async () => {
    const habit = await createHabit({
      type: 'quantified',
      name: 'Drink water',
      target: 3,
      unit: 'L',
    });
    expect(habit.type).toBe('quantified');
    if (habit.type === 'quantified') {
      expect(habit.target).toBe(3);
      expect(habit.unit).toBe('L');
    }
  });

  it('updates mutable fields and bumps updatedAt', async () => {
    const habit = await createHabit({ type: 'binary', name: 'Read' });
    await updateHabit(habit.id, { name: 'Read 10 pages' });
    const stored = await db.habits.get(habit.id);
    expect(stored?.name).toBe('Read 10 pages');
  });

  it('deletes a habit and cascades its completions', async () => {
    const habit = await createHabit({ type: 'binary', name: 'Stretch' });
    await toggleHabit(habit);
    expect(await countCompletions(habit.id)).toBe(1);
    await deleteHabit(habit.id);
    expect(await db.habits.get(habit.id)).toBeUndefined();
    expect(await countCompletions(habit.id)).toBe(0);
  });
});

describe('binary toggle idempotency (one record per habit+day)', () => {
  it('toggling on creates exactly one completion; toggling off removes it', async () => {
    const habit = await createHabit({ type: 'binary', name: 'Meditate' });

    await toggleHabit(habit);
    expect(await countCompletions(habit.id)).toBe(1);
    expect((await getCompletion(habit.id))?.value).toBe(1);
    expect(isDayComplete(habit, (await getCompletion(habit.id))!.value)).toBe(true);

    await toggleHabit(habit);
    expect(await countCompletions(habit.id)).toBe(0);
    expect(await getCompletion(habit.id)).toBeUndefined();
  });

  it('repeated setHabitAmount never duplicates the per-day record', async () => {
    const habit = await createHabit({ type: 'binary', name: 'Floss' });
    await setHabitAmount(habit, 1);
    await setHabitAmount(habit, 1);
    await setHabitAmount(habit, 1);
    expect(await countCompletions(habit.id)).toBe(1);
  });
});

describe('quantified increment', () => {
  it('accumulates toward and reaches the target as one record', async () => {
    const habit = await createHabit({
      type: 'quantified',
      name: 'Water',
      target: 3,
      unit: 'L',
    });

    await incrementHabit(habit, 1);
    await incrementHabit(habit, 1);
    let completion = await getCompletion(habit.id);
    expect(completion?.value).toBe(2);
    expect(isDayComplete(habit, completion!.value)).toBe(false);
    expect(await countCompletions(habit.id)).toBe(1);

    await incrementHabit(habit, 1);
    completion = await getCompletion(habit.id);
    expect(completion?.value).toBe(3);
    expect(isDayComplete(habit, completion!.value)).toBe(true);
    expect(await countCompletions(habit.id)).toBe(1);
  });

  it('clamps at zero and clears the record when emptied', async () => {
    const habit = await createHabit({
      type: 'quantified',
      name: 'Pushups',
      target: 20,
      unit: 'reps',
    });
    await incrementHabit(habit, 5);
    await incrementHabit(habit, -10); // over-decrement
    expect(await getCompletion(habit.id)).toBeUndefined();
    expect(await countCompletions(habit.id)).toBe(0);
  });

  it('accrues fractional amounts (timer path) into a specific day', async () => {
    const habit = await createHabit({
      type: 'quantified',
      name: 'Deep work',
      target: 2,
      unit: 'hours',
    });
    const day = '2026-06-10';

    // Two timed sessions logged into a past day: 1.5h then 0.25h.
    await incrementHabit(habit, 1.5, day);
    await incrementHabit(habit, 0.25, day);
    let completion = await getCompletion(habit.id, day);
    expect(completion?.value).toBeCloseTo(1.75);
    expect(isDayComplete(habit, completion!.value)).toBe(false);
    expect(await countCompletions(habit.id)).toBe(1);

    // Reaching the (non-integer-friendly) target completes the day.
    await incrementHabit(habit, 0.25, day);
    completion = await getCompletion(habit.id, day);
    expect(completion?.value).toBeCloseTo(2);
    expect(isDayComplete(habit, completion!.value)).toBe(true);
  });

  it('clearHabitDay removes the day record', async () => {
    const habit = await createHabit({ type: 'binary', name: 'Walk' });
    await toggleHabit(habit);
    await clearHabitDay(habit);
    expect(await getCompletion(habit.id, todayKey())).toBeUndefined();
  });
});
