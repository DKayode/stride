import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { computeLinkedContribution, computeProjectProgress, type LinkedHabitContribution } from '../lib/progress';
import { todayKey } from '../lib/date';
import type { DayKey, ID, Milestone, Project, ProjectProgress, Subtask } from '../types';

const EMPTY_CONTRIBUTION: LinkedHabitContribution = { total: 0, completed: 0 };

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

/** Reactive, ordered sub-tasks belonging to a milestone. */
export function useSubtasks(milestoneId: ID | undefined): Subtask[] {
  return useLiveQuery(
    () =>
      milestoneId
        ? db.subtasks.where('milestoneId').equals(milestoneId).sortBy('sortOrder')
        : Promise.resolve<Subtask[]>([]),
    [milestoneId],
    [] as Subtask[],
  );
}

/**
 * Reactive linked-habit contribution for a project (The Link, D7): how many
 * non-archived habits reference the project and how many are complete today.
 * Recomputes whenever a linked habit or any of today's completions change.
 */
export function useLinkedHabitContribution(
  projectId: ID | undefined,
  date: DayKey = todayKey(),
): LinkedHabitContribution {
  return useLiveQuery(
    async () => {
      if (!projectId) return EMPTY_CONTRIBUTION;
      const linked = (await db.habits.where('projectId').equals(projectId).toArray()).filter(
        (h) => h.archivedAt === null,
      );
      if (linked.length === 0) return EMPTY_CONTRIBUTION;
      const completions = await db.completions.where('date').equals(date).toArray();
      const values = new Map(completions.map((c) => [c.habitId, c.value] as const));
      return computeLinkedContribution(linked, values);
    },
    [projectId, date],
    EMPTY_CONTRIBUTION,
  );
}

/**
 * Reactive derived progress for a single project, including linked-habit
 * contribution (The Link). Recomputes whenever the project, its milestones,
 * its linked habits, or today's completions change — so completing a linked
 * habit visibly moves the project's percentage.
 */
export function useProjectProgress(project: Project | undefined): ProjectProgress | undefined {
  const milestones = useMilestones(project?.id);
  const linkedHabits = useLinkedHabitContribution(project?.id);
  return useMemo(
    () => (project ? computeProjectProgress(project, milestones, { linkedHabits }) : undefined),
    [project, milestones, linkedHabits],
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
