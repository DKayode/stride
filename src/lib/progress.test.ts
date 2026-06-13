import { describe, expect, it } from 'vitest';
import { computeProjectProgress, orderMilestones } from './progress';
import type { Milestone, Project } from '../types';

const project: Project = {
  id: 'p1',
  name: 'Launch Stride',
  description: '',
  color: '#22d3ee',
  icon: 'target',
  sortOrder: 0,
  manualProgress: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

function milestone(id: string, completed: boolean, sortOrder: number): Milestone {
  return {
    id,
    projectId: 'p1',
    title: id,
    completed,
    completedAt: completed ? '2026-01-02T00:00:00.000Z' : null,
    sortOrder,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('computeProjectProgress — no milestones', () => {
  it('falls back to manualProgress', () => {
    const result = computeProjectProgress({ ...project, manualProgress: 0.4 }, []);
    expect(result.fraction).toBeCloseTo(0.4);
    expect(result.percent).toBe(40);
    expect(result.milestonesTotal).toBe(0);
    expect(result.milestonesCompleted).toBe(0);
    expect(result.linkedHabits).toBe(0);
  });

  it('clamps an out-of-range manualProgress', () => {
    expect(computeProjectProgress({ ...project, manualProgress: 1.5 }, []).percent).toBe(100);
    expect(computeProjectProgress({ ...project, manualProgress: -0.2 }, []).percent).toBe(0);
  });
});

describe('computeProjectProgress — with milestones', () => {
  it('all done → 100%', () => {
    const result = computeProjectProgress(project, [
      milestone('a', true, 0),
      milestone('b', true, 1),
      milestone('c', true, 2),
    ]);
    expect(result.fraction).toBe(1);
    expect(result.percent).toBe(100);
    expect(result.milestonesCompleted).toBe(3);
    expect(result.milestonesTotal).toBe(3);
  });

  it('partial → completed/total ratio (ignores manualProgress)', () => {
    const result = computeProjectProgress({ ...project, manualProgress: 0.9 }, [
      milestone('a', true, 0),
      milestone('b', false, 1),
      milestone('c', false, 2),
      milestone('d', false, 3),
    ]);
    expect(result.fraction).toBeCloseTo(0.25);
    expect(result.percent).toBe(25);
    expect(result.milestonesCompleted).toBe(1);
  });
});

describe('orderMilestones', () => {
  it('sorts by sortOrder without mutating the input', () => {
    const input = [milestone('c', false, 2), milestone('a', false, 0), milestone('b', false, 1)];
    const ordered = orderMilestones(input);
    expect(ordered.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(input.map((m) => m.id)).toEqual(['c', 'a', 'b']); // original untouched
  });
});

describe('computeProjectProgress — D7 extension point', () => {
  it('is a no-op when no linked habits (identity with base)', () => {
    const withEmpty = computeProjectProgress(project, [milestone('a', true, 0)], {
      linkedHabits: { count: 0, fraction: 0.5 },
    });
    expect(withEmpty.fraction).toBe(1); // base ratio, link ignored
    expect(withEmpty.linkedHabits).toBe(0);
  });

  it('blends linked-habit contribution equally with the base', () => {
    // base = 1/2 = 0.5, linked fraction = 1.0 → (0.5 + 1.0) / 2 = 0.75
    const blended = computeProjectProgress(project, [milestone('a', true, 0), milestone('b', false, 1)], {
      linkedHabits: { count: 2, fraction: 1 },
    });
    expect(blended.fraction).toBeCloseTo(0.75);
    expect(blended.percent).toBe(75);
    expect(blended.linkedHabits).toBe(2);
  });
});
