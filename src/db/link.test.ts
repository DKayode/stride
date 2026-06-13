import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { addMilestone, createHabit, createProject, toggleHabit, toggleMilestone, updateHabit } from '.';
import { computeLinkedContribution, computeProjectProgress } from '../lib/progress';
import { todayKey } from '../lib/date';
import type { ID } from '../types';

async function clearDb(): Promise<void> {
  await Promise.all([
    db.habits.clear(),
    db.completions.clear(),
    db.projects.clear(),
    db.milestones.clear(),
  ]);
}

/**
 * Mirror the reactive hook path (useProjectProgress) without React: read a
 * project's milestones + linked habits + today's completions and compute the
 * derived progress. This exercises The Link end-to-end through the DB.
 */
async function projectPercent(projectId: ID): Promise<number> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('project not found');
  const milestones = await db.milestones.where('projectId').equals(projectId).toArray();
  const linked = (await db.habits.where('projectId').equals(projectId).toArray()).filter(
    (h) => h.archivedAt === null,
  );
  const completions = await db.completions.where('date').equals(todayKey()).toArray();
  const values = new Map(completions.map((c) => [c.habitId, c.value] as const));
  const contribution = computeLinkedContribution(linked, values);
  return computeProjectProgress(project, milestones, { linkedHabits: contribution }).percent;
}

beforeEach(clearDb);

describe('The Link — habit ↔ project (D7)', () => {
  it('linking a habit adds it as a progress unit, lowering an all-done project', async () => {
    const project = await createProject({ name: 'Ship' });
    const milestone = await addMilestone(project.id, 'M1');
    await toggleMilestone(milestone.id); // 1/1 milestones → 100%
    expect(await projectPercent(project.id)).toBe(100);

    // Link a (not-yet-done today) habit → pool becomes (1 + 0)/(1 + 1) = 50%.
    await createHabit({ type: 'binary', name: 'Daily push', projectId: project.id });
    expect(await projectPercent(project.id)).toBe(50);
  });

  it('completing a linked habit raises the project percentage', async () => {
    const project = await createProject({ name: 'Ship' });
    const milestone = await addMilestone(project.id, 'M1');
    await toggleMilestone(milestone.id);
    const habit = await createHabit({ type: 'binary', name: 'Daily push', projectId: project.id });

    expect(await projectPercent(project.id)).toBe(50); // 1 of 2 units
    await toggleHabit(habit); // habit done today
    expect(await projectPercent(project.id)).toBe(100); // 2 of 2 units
  });

  it('quantified linked habit contributes only once its target is met', async () => {
    const project = await createProject({ name: 'Hydrate goals' });
    const habit = await createHabit({
      type: 'quantified',
      name: 'Water',
      target: 3,
      unit: 'L',
      projectId: project.id,
    });

    expect(await projectPercent(project.id)).toBe(0); // 0/1 linked, no milestones
    await db.completions.add({
      id: 'c-partial',
      habitId: habit.id,
      date: todayKey(),
      value: 2,
      completedAt: new Date().toISOString(),
    });
    expect(await projectPercent(project.id)).toBe(0); // partial → not complete
    await db.completions.update('c-partial', { value: 3 });
    expect(await projectPercent(project.id)).toBe(100); // target met
  });

  it('unlinking a habit removes its contribution', async () => {
    const project = await createProject({ name: 'Ship' });
    const milestone = await addMilestone(project.id, 'M1');
    await toggleMilestone(milestone.id);
    const habit = await createHabit({ type: 'binary', name: 'Daily push', projectId: project.id });
    expect(await projectPercent(project.id)).toBe(50);

    await updateHabit(habit.id, { projectId: null }); // unlink
    expect(await projectPercent(project.id)).toBe(100); // back to milestone-only
  });

  it('deleting the project unlinks the habit (habit survives)', async () => {
    const project = await createProject({ name: 'Temp' });
    const habit = await createHabit({ type: 'binary', name: 'Survivor', projectId: project.id });
    const { deleteProject } = await import('.');
    await deleteProject(project.id);
    const stored = await db.habits.get(habit.id);
    expect(stored).toBeDefined();
    expect(stored?.projectId).toBeNull();
  });
});
