import { db } from './database';
import { newId } from '../lib/id';
import type { ID, ISODateString, Milestone, Project } from '../types';

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
 * Delete a project. Cascades to its milestones and unlinks (does not delete)
 * any habits that referenced it, setting their `projectId` back to `null`.
 */
export async function deleteProject(id: ID): Promise<void> {
  await db.transaction('rw', db.projects, db.milestones, db.habits, async () => {
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

/** Create and persist a milestone within a project. */
export async function addMilestone(projectId: ID, title: string): Promise<Milestone> {
  const ts = nowIso();
  const milestone: Milestone = {
    id: newId(),
    projectId,
    title: title.trim(),
    completed: false,
    completedAt: null,
    deadline: null,
    sortOrder: await nextMilestoneSortOrder(projectId),
    createdAt: ts,
    updatedAt: ts,
  };
  await db.milestones.add(milestone);
  return milestone;
}

/** Patch a milestone's title or ordering. */
export async function updateMilestone(
  id: ID,
  patch: Partial<{ title: string; sortOrder: number }>,
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

/** Delete a single milestone. */
export async function deleteMilestone(id: ID): Promise<void> {
  await db.milestones.delete(id);
}
