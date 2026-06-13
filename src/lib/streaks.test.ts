import { describe, expect, it } from 'vitest';
import { computeStreak } from './streaks';
import type { BinaryHabit, HabitCompletion, QuantifiedHabit } from '../types';

const TODAY = '2026-06-13';

const binary: BinaryHabit = {
  id: 'h1',
  name: 'Meditate',
  type: 'binary',
  projectId: null,
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
  name: 'Water',
  type: 'quantified',
  target: 3,
  unit: 'L',
};

/** Build completion records from `[date, value]` pairs. */
function completions(pairs: [string, number][]): HabitCompletion[] {
  return pairs.map(([date, value], i) => ({
    id: `c${i}`,
    habitId: 'h',
    date,
    value,
    completedAt: `${date}T12:00:00.000Z`,
  }));
}

describe('computeStreak — empty history', () => {
  it('returns zeroes and not-completed-today', () => {
    expect(computeStreak(binary, [], TODAY)).toEqual({
      current: 0,
      best: 0,
      completedToday: false,
    });
  });
});

describe('computeStreak — consecutive run ending today', () => {
  it('counts the full run and flags completedToday', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-06-11', 1],
        ['2026-06-12', 1],
        ['2026-06-13', 1],
      ]),
      TODAY,
    );
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
    expect(result.completedToday).toBe(true);
  });
});

describe('computeStreak — today not yet done', () => {
  it('keeps the run alive when it ends yesterday (current unaffected)', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-06-10', 1],
        ['2026-06-11', 1],
        ['2026-06-12', 1], // yesterday; today (06-13) not logged
      ]),
      TODAY,
    );
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
    expect(result.completedToday).toBe(false);
  });

  it('breaks to 0 when yesterday was also missed', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-06-09', 1],
        ['2026-06-10', 1],
        ['2026-06-11', 1], // run ended two days ago → broken
      ]),
      TODAY,
    );
    expect(result.current).toBe(0);
    expect(result.best).toBe(3);
    expect(result.completedToday).toBe(false);
  });
});

describe('computeStreak — gap in the middle', () => {
  it('best is the longest run; current counts only the run touching today/yesterday', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-06-01', 1],
        ['2026-06-02', 1],
        ['2026-06-03', 1],
        ['2026-06-04', 1], // best run of 4
        // gap
        ['2026-06-12', 1],
        ['2026-06-13', 1], // current run of 2 ending today
      ]),
      TODAY,
    );
    expect(result.current).toBe(2);
    expect(result.best).toBe(4);
    expect(result.completedToday).toBe(true);
  });

  it('a single missed day breaks the run', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-06-10', 1],
        // 06-11 missed
        ['2026-06-12', 1],
        ['2026-06-13', 1],
      ]),
      TODAY,
    );
    expect(result.current).toBe(2);
    expect(result.best).toBe(2);
  });
});

describe('computeStreak — quantified partial vs met', () => {
  it('counts only days whose value reaches the target', () => {
    const result = computeStreak(
      quantified,
      completions([
        ['2026-06-11', 3], // met
        ['2026-06-12', 2], // partial → does NOT qualify, breaks run
        ['2026-06-13', 3], // met
      ]),
      TODAY,
    );
    expect(result.current).toBe(1); // only today
    expect(result.best).toBe(1);
    expect(result.completedToday).toBe(true);
  });

  it('over-target days still qualify', () => {
    const result = computeStreak(
      quantified,
      completions([
        ['2026-06-12', 5],
        ['2026-06-13', 4],
      ]),
      TODAY,
    );
    expect(result.current).toBe(2);
    expect(result.best).toBe(2);
  });
});

describe('computeStreak — across month boundary', () => {
  it('treats end-of-month → next-month as consecutive', () => {
    const result = computeStreak(
      binary,
      completions([
        ['2026-05-30', 1],
        ['2026-05-31', 1],
        ['2026-06-01', 1],
      ]),
      '2026-06-01',
    );
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });
});
