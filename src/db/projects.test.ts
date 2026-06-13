import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  addMilestone,
  createProject,
  deleteProject,
  setProjectProgress,
  toggleMilestone,
} from './projects';
import { createHabit } from './habits';

async function clearDb(): Promise<void> {
  await Promise.all([
    db.habits.clear(),
    db.completions.clear(),
    db.projects.clear(),
    db.milestones.clear(),
  ]);
}

beforeEach(clearDb);

describe('project + milestone CRUD', () => {
  it('creates a project and orders milestones indexed by projectId', async () => {
    const project = await createProject({ name: 'Launch Stride' });
    const m1 = await addMilestone(project.id, 'Design');
    const m2 = await addMilestone(project.id, 'Build');
    const m3 = await addMilestone(project.id, 'Ship');

    const milestones = await db.milestones
      .where('projectId')
      .equals(project.id)
      .sortBy('sortOrder');

    expect(milestones.map((m) => m.title)).toEqual(['Design', 'Build', 'Ship']);
    expect(milestones.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
    expect([m1, m2, m3].every((m) => m.completed === false)).toBe(true);
  });

  it('toggles milestone completion and stamps completedAt', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'Phase 1');

    await toggleMilestone(milestone.id);
    let stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(true);
    expect(stored?.completedAt).not.toBeNull();

    await toggleMilestone(milestone.id);
    stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(false);
    expect(stored?.completedAt).toBeNull();
  });

  it('clamps manual progress to 0..1', async () => {
    const project = await createProject({ name: 'P' });
    await setProjectProgress(project.id, 2.5);
    expect((await db.projects.get(project.id))?.manualProgress).toBe(1);
    await setProjectProgress(project.id, -1);
    expect((await db.projects.get(project.id))?.manualProgress).toBe(0);
  });

  it('deletes a project, cascading milestones and unlinking habits', async () => {
    const project = await createProject({ name: 'P' });
    await addMilestone(project.id, 'M1');
    const habit = await createHabit({ type: 'binary', name: 'Linked', projectId: project.id });

    await deleteProject(project.id);

    expect(await db.projects.get(project.id)).toBeUndefined();
    expect(await db.milestones.where('projectId').equals(project.id).count()).toBe(0);
    const storedHabit = await db.habits.get(habit.id);
    expect(storedHabit?.projectId).toBeNull();
  });
});
