import { describe, expect, it } from 'vitest';
import { computeLinkedContribution, computeProjectProgress, orderMilestones } from './progress';
import type { BinaryHabit, Milestone, Project, QuantifiedHabit } from '../types';

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

describe('computeProjectProgress — The Link (count-weighted pool)', () => {
  it('is a no-op when no linked habits (identity with milestone base)', () => {
    const withEmpty = computeProjectProgress(project, [milestone('a', true, 0)], {
      linkedHabits: { total: 0, completed: 0 },
    });
    expect(withEmpty.fraction).toBe(1); // base ratio, link ignored
    expect(withEmpty.linkedHabits).toBe(0);
  });

  it('pools each milestone and linked habit as one unit (no wild swing)', () => {
    // 9/10 milestones done + 1 incomplete linked habit → (9+0)/(10+1) = 9/11
    const milestones = Array.from({ length: 10 }, (_, i) => milestone(`m${i}`, i < 9, i));
    const result = computeProjectProgress(project, milestones, {
      linkedHabits: { total: 1, completed: 0 },
    });
    expect(result.fraction).toBeCloseTo(9 / 11);
    expect(result.percent).toBe(82);
    expect(result.linkedHabits).toBe(1);
  });

  it('completing the linked habit raises the percentage', () => {
    const milestones = Array.from({ length: 10 }, (_, i) => milestone(`m${i}`, i < 9, i));
    const done = computeProjectProgress(project, milestones, {
      linkedHabits: { total: 1, completed: 1 },
    });
    expect(done.fraction).toBeCloseTo(10 / 11);
    expect(done.percent).toBe(91);
  });

  it('with no milestones, derives progress from linked habits (manual ignored)', () => {
    const result = computeProjectProgress({ ...project, manualProgress: 0.99 }, [], {
      linkedHabits: { total: 2, completed: 1 },
    });
    expect(result.fraction).toBeCloseTo(0.5);
    expect(result.percent).toBe(50);
  });

  it('clamps completed to total defensively', () => {
    const result = computeProjectProgress(project, [], {
      linkedHabits: { total: 2, completed: 5 },
    });
    expect(result.fraction).toBe(1);
  });
});

describe('computeLinkedContribution', () => {
  const binary: BinaryHabit = {
    id: 'h1',
    name: 'Meditate',
    type: 'binary',
    projectId: 'p1',
    color: '#6366f1',
    icon: 'activity',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
  };
  const quantified: QuantifiedHabit = {
    ...binary,
    id: 'h2',
    type: 'quantified',
    target: 3,
    unit: 'L',
  };

  it('counts completed via isDayComplete for both kinds', () => {
    const values = new Map<string, number>([
      ['h1', 1], // binary done
      ['h2', 2], // quantified partial → not complete
    ]);
    expect(computeLinkedContribution([binary, quantified], values)).toEqual({
      total: 2,
      completed: 1,
    });
  });

  it('treats missing values as zero (not complete)', () => {
    expect(computeLinkedContribution([binary, quantified], new Map())).toEqual({
      total: 2,
      completed: 0,
    });
  });

  it('quantified counts once the target is met', () => {
    const values = new Map<string, number>([['h2', 3]]);
    expect(computeLinkedContribution([quantified], values)).toEqual({ total: 1, completed: 1 });
  });
});
