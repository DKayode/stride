import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { computeProjectProgress } from '../lib/progress';
import type { ID, Milestone, Project, ProjectProgress } from '../types';

/** Reactive list of projects ordered by `sortOrder` (archived excluded). */
export function useProjects(includeArchived = false): Project[] {
  return useLiveQuery(
    async () => {
      const all = await db.projects.orderBy('sortOrder').toArray();
      return includeArchived ? all : all.filter((p) => p.archivedAt === null);
    },
    [includeArchived],
    [] as Project[],
  );
}

/** Reactive single project by id. */
export function useProject(id: ID | undefined): Project | undefined {
  return useLiveQuery(() => (id ? db.projects.get(id) : undefined), [id]);
}

/** Reactive, ordered milestones belonging to a project. */
export function useMilestones(projectId: ID | undefined): Milestone[] {
  return useLiveQuery(
    () =>
      projectId
        ? db.milestones.where('projectId').equals(projectId).sortBy('sortOrder')
        : Promise.resolve<Milestone[]>([]),
    [projectId],
    [] as Milestone[],
  );
}

/**
 * Reactive derived progress for a single project. Recomputes whenever the
 * project or its milestones change. D7 will extend this with linked-habit
 * contribution; the underlying `computeProjectProgress` already supports it.
 */
export function useProjectProgress(project: Project | undefined): ProjectProgress | undefined {
  const milestones = useMilestones(project?.id);
  return useMemo(
    () => (project ? computeProjectProgress(project, milestones) : undefined),
    [project, milestones],
  );
}

/** Reactive milestones for every project, grouped by `projectId`. */
export function useMilestonesByProject(): Map<ID, Milestone[]> {
  return useLiveQuery(
    async () => {
      const all = await db.milestones.toArray();
      const grouped = new Map<ID, Milestone[]>();
      for (const milestone of all) {
        const list = grouped.get(milestone.projectId) ?? [];
        list.push(milestone);
        grouped.set(milestone.projectId, list);
      }
      for (const list of grouped.values()) {
        list.sort((a, b) => a.sortOrder - b.sortOrder);
      }
      return grouped;
    },
    [],
    new Map<ID, Milestone[]>(),
  );
}
