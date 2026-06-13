import { db } from './database';
import { newId } from '../lib/id';
import type { DayKey, ID, ISODateString, Milestone, Project, Subtask } from '../types';

const DEFAULT_COLOR = '#22d3ee';
const DEFAULT_ICON = 'target';

function nowIso(): ISODateString {
  return new Date().toISOString();
}

function clampFraction(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Input for creating a project. */
export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  manualProgress?: number;
}

/** Mutable project fields accepted by {@link updateProject}. */
export type UpdateProjectInput = Partial<{
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  manualProgress: number;
  archivedAt: ISODateString | null;
}>;

async function nextProjectSortOrder(): Promise<number> {
  const last = await db.projects.orderBy('sortOrder').last();
  return last ? last.sortOrder + 1 : 0;
}

async function nextMilestoneSortOrder(projectId: ID): Promise<number> {
  const siblings = await db.milestones.where('projectId').equals(projectId).toArray();
  return siblings.reduce((max, m) => Math.max(max, m.sortOrder + 1), 0);
}

async function nextSubtaskSortOrder(milestoneId: ID): Promise<number> {
  const siblings = await db.subtasks.where('milestoneId').equals(milestoneId).toArray();
  return siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);
}

/**
 * Recompute and persist a milestone's completion from its sub-tasks
 * (auto-roll-up): a milestone with ≥1 sub-task is completed iff every sub-task
 * is completed, stamping `completedAt` to match. A milestone with zero
 * sub-tasks is left untouched so it keeps its manual checkbox behaviour. Run
 * inside a `rw` transaction after any sub-task add/toggle/delete; no-op when
 * the milestone is gone or its state is already correct.
 */
async function reconcileMilestone(milestoneId: ID): Promise<void> {
  const milestone = await db.milestones.get(milestoneId);
  if (!milestone) return;
  const subtasks = await db.subtasks.where('milestoneId').equals(milestoneId).toArray();
  if (subtasks.length === 0) return;
  const completed = subtasks.every((s) => s.completed);
  if (completed === milestone.completed) return;
  await db.milestones.update(milestoneId, {
    completed,
    completedAt: completed ? nowIso() : null,
    updatedAt: nowIso(),
  });
}

/** Create and persist a new project. */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const ts = nowIso();
  const project: Project = {
    id: newId(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    color: input.color ?? DEFAULT_COLOR,
    icon: input.icon ?? DEFAULT_ICON,
    sortOrder: input.sortOrder ?? (await nextProjectSortOrder()),
    manualProgress: clampFraction(input.manualProgress ?? 0),
    createdAt: ts,
    updatedAt: ts,
    archivedAt: null,
  };
  await db.projects.add(project);
  return project;
}

/** Patch mutable fields of a project. */
export async function updateProject(id: ID, patch: UpdateProjectInput): Promise<void> {
  const next: UpdateProjectInput = { ...patch };
  if (next.manualProgress !== undefined) {
    next.manualProgress = clampFraction(next.manualProgress);
  }
  await db.projects.update(id, { ...next, updatedAt: nowIso() });
}

/**
 * Delete a project. Cascades to its milestones and their sub-tasks, and
 * unlinks (does not delete) any habits that referenced it, setting their
 * `projectId` back to `null`.
 */
export async function deleteProject(id: ID): Promise<void> {
  await db.transaction('rw', db.projects, db.milestones, db.subtasks, db.habits, async () => {
    const milestoneIds = await db.milestones.where('projectId').equals(id).primaryKeys();
    await db.subtasks.where('milestoneId').anyOf(milestoneIds).delete();
    await db.milestones.where('projectId').equals(id).delete();
    await db.habits.where('projectId').equals(id).modify({
      projectId: null,
      updatedAt: nowIso(),
    });
    await db.projects.delete(id);
  });
}

/** Set a project's manual progress fraction (0..1). */
export async function setProjectProgress(id: ID, fraction: number): Promise<void> {
  await updateProject(id, { manualProgress: clampFraction(fraction) });
}

/** Create and persist a milestone within a project, optionally with a deadline. */
export async function addMilestone(
  projectId: ID,
  title: string,
  deadline: DayKey | null = null,
): Promise<Milestone> {
  const ts = nowIso();
  const milestone: Milestone = {
    id: newId(),
    projectId,
    title: title.trim(),
    completed: false,
    completedAt: null,
    deadline,
    sortOrder: await nextMilestoneSortOrder(projectId),
    createdAt: ts,
    updatedAt: ts,
  };
  await db.milestones.add(milestone);
  return milestone;
}

/** Patch a milestone's title, deadline, or ordering. */
export async function updateMilestone(
  id: ID,
  patch: Partial<{ title: string; deadline: DayKey | null; sortOrder: number }>,
): Promise<void> {
  await db.milestones.update(id, { ...patch, updatedAt: nowIso() });
}

/** Set a milestone's completion state, stamping `completedAt` accordingly. */
export async function setMilestoneCompleted(id: ID, completed: boolean): Promise<void> {
  await db.milestones.update(id, {
    completed,
    completedAt: completed ? nowIso() : null,
    updatedAt: nowIso(),
  });
}

/** Toggle a milestone's completion state. */
export async function toggleMilestone(id: ID): Promise<void> {
  await db.transaction('rw', db.milestones, async () => {
    const milestone = await db.milestones.get(id);
    if (!milestone) return;
    await setMilestoneCompleted(id, !milestone.completed);
  });
}

/** Delete a single milestone, cascading to its sub-tasks. */
export async function deleteMilestone(id: ID): Promise<void> {
  await db.transaction('rw', db.milestones, db.subtasks, async () => {
    await db.subtasks.where('milestoneId').equals(id).delete();
    await db.milestones.delete(id);
  });
}

/**
 * Create and persist a sub-task within a milestone, optionally with a
 * deadline. Reconciles the parent milestone so adding the first sub-task flips
 * it to derived (incomplete) state.
 */
export async function addSubtask(
  milestoneId: ID,
  title: string,
  deadline: DayKey | null = null,
): Promise<Subtask> {
  const ts = nowIso();
  const subtask: Subtask = {
    id: newId(),
    milestoneId,
    title: title.trim(),
    completed: false,
    completedAt: null,
    deadline,
    sortOrder: await nextSubtaskSortOrder(milestoneId),
    createdAt: ts,
    updatedAt: ts,
  };
  await db.transaction('rw', db.subtasks, db.milestones, async () => {
    await db.subtasks.add(subtask);
    await reconcileMilestone(milestoneId);
  });
  return subtask;
}

/** Patch a sub-task's title, deadline, or ordering. */
export async function updateSubtask(
  id: ID,
  patch: Partial<{ title: string; deadline: DayKey | null; sortOrder: number }>,
): Promise<void> {
  await db.subtasks.update(id, { ...patch, updatedAt: nowIso() });
}

/**
 * Set a sub-task's completion state, stamping `completedAt` accordingly, then
 * reconcile the parent milestone's auto-roll-up.
 */
export async function setSubtaskCompleted(id: ID, completed: boolean): Promise<void> {
  await db.transaction('rw', db.subtasks, db.milestones, async () => {
    const subtask = await db.subtasks.get(id);
    if (!subtask) return;
    await db.subtasks.update(id, {
      completed,
      completedAt: completed ? nowIso() : null,
      updatedAt: nowIso(),
    });
    await reconcileMilestone(subtask.milestoneId);
  });
}

/** Toggle a sub-task's completion state. */
export async function toggleSubtask(id: ID): Promise<void> {
  await db.transaction('rw', db.subtasks, db.milestones, async () => {
    const subtask = await db.subtasks.get(id);
    if (!subtask) return;
    await setSubtaskCompleted(id, !subtask.completed);
  });
}

/** Delete a single sub-task, then reconcile the parent milestone. */
export async function deleteSubtask(id: ID): Promise<void> {
  await db.transaction('rw', db.subtasks, db.milestones, async () => {
    const subtask = await db.subtasks.get(id);
    if (!subtask) return;
    await db.subtasks.delete(id);
    await reconcileMilestone(subtask.milestoneId);
  });
}
