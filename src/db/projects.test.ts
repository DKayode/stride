import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  addMilestone,
  addSubtask,
  createProject,
  deleteMilestone,
  deleteProject,
  deleteSubtask,
  setProjectProgress,
  setSubtaskCompleted,
  toggleMilestone,
  toggleSubtask,
  updateSubtask,
} from './projects';
import { createHabit } from './habits';

async function clearDb(): Promise<void> {
  await Promise.all([
    db.habits.clear(),
    db.completions.clear(),
    db.projects.clear(),
    db.milestones.clear(),
    db.subtasks.clear(),
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

describe('sub-task CRUD + auto-roll-up reconcile', () => {
  it('creates sub-tasks ordered by sortOrder under a milestone', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    await addSubtask(milestone.id, 'First');
    await addSubtask(milestone.id, 'Second', '2026-07-01');
    const third = await addSubtask(milestone.id, 'Third');

    const subtasks = await db.subtasks
      .where('milestoneId')
      .equals(milestone.id)
      .sortBy('sortOrder');

    expect(subtasks.map((s) => s.title)).toEqual(['First', 'Second', 'Third']);
    expect(subtasks.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
    expect(subtasks[1].deadline).toBe('2026-07-01');
    expect(third.completed).toBe(false);
  });

  it('patches a sub-task title and deadline', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    const subtask = await addSubtask(milestone.id, 'Draft');

    await updateSubtask(subtask.id, { title: 'Final draft', deadline: '2026-08-15' });
    let stored = await db.subtasks.get(subtask.id);
    expect(stored?.title).toBe('Final draft');
    expect(stored?.deadline).toBe('2026-08-15');

    await updateSubtask(subtask.id, { deadline: null });
    stored = await db.subtasks.get(subtask.id);
    expect(stored?.deadline).toBeNull();
  });

  it('adding the first sub-task flips a completed milestone back to derived/incomplete', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    await toggleMilestone(milestone.id);
    expect((await db.milestones.get(milestone.id))?.completed).toBe(true);

    await addSubtask(milestone.id, 'Now there is work to do');
    const stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(false);
    expect(stored?.completedAt).toBeNull();
  });

  it('auto-completes the milestone when all sub-tasks are done, reversing when one is un-done', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    const s1 = await addSubtask(milestone.id, 'A');
    const s2 = await addSubtask(milestone.id, 'B');

    await setSubtaskCompleted(s1.id, true);
    expect((await db.milestones.get(milestone.id))?.completed).toBe(false);

    await setSubtaskCompleted(s2.id, true);
    let stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(true);
    expect(stored?.completedAt).not.toBeNull();

    await toggleSubtask(s1.id); // back to incomplete
    stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(false);
    expect(stored?.completedAt).toBeNull();
  });

  it('reconciles after deleting a sub-task: removing the last incomplete one completes the milestone', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    const done = await addSubtask(milestone.id, 'Done');
    const pending = await addSubtask(milestone.id, 'Pending');
    await setSubtaskCompleted(done.id, true);
    expect((await db.milestones.get(milestone.id))?.completed).toBe(false);

    await deleteSubtask(pending.id);
    expect((await db.milestones.get(milestone.id))?.completed).toBe(true);
  });

  it('leaves a milestone with zero sub-tasks under manual control', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    const only = await addSubtask(milestone.id, 'Only');

    // Deleting the last sub-task must not force a completion state change.
    await deleteSubtask(only.id);
    const stored = await db.milestones.get(milestone.id);
    expect(stored?.completed).toBe(false);
    // Manual toggle still works once there are no sub-tasks.
    await toggleMilestone(milestone.id);
    expect((await db.milestones.get(milestone.id))?.completed).toBe(true);
  });
});

describe('sub-task cascade deletes', () => {
  it('deleting a milestone removes its sub-tasks', async () => {
    const project = await createProject({ name: 'P' });
    const milestone = await addMilestone(project.id, 'M');
    await addSubtask(milestone.id, 'A');
    await addSubtask(milestone.id, 'B');

    await deleteMilestone(milestone.id);

    expect(await db.milestones.get(milestone.id)).toBeUndefined();
    expect(await db.subtasks.where('milestoneId').equals(milestone.id).count()).toBe(0);
  });

  it('deleting a project removes all sub-tasks of its milestones (no orphans)', async () => {
    const project = await createProject({ name: 'P' });
    const m1 = await addMilestone(project.id, 'M1');
    const m2 = await addMilestone(project.id, 'M2');
    await addSubtask(m1.id, 'A');
    await addSubtask(m1.id, 'B');
    await addSubtask(m2.id, 'C');

    await deleteProject(project.id);

    expect(await db.subtasks.where('milestoneId').anyOf([m1.id, m2.id]).count()).toBe(0);
    expect(await db.subtasks.count()).toBe(0);
  });
});
