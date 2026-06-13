import { describe, expect, it } from 'vitest';
import { dayOfMonth, startOfWeekKey, weekDayKeys, weekdayInitial } from './week';
import { diffDayKeys } from './date';

// 2026-06-13 is a Saturday; 2026-07-01 is a Wednesday.
describe('weekDayKeys (Monday start)', () => {
  it('returns Mon..Sun for a Saturday, including that day', () => {
    const days = weekDayKeys('2026-06-13', 1);
    expect(days).toEqual([
      '2026-06-08', // Mon
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13', // Sat (the reference day)
      '2026-06-14', // Sun
    ]);
    expect(days).toContain('2026-06-13');
    expect(days).toHaveLength(7);
  });

  it('produces 7 consecutive days', () => {
    const days = weekDayKeys('2026-06-13', 1);
    for (let i = 1; i < days.length; i += 1) {
      expect(diffDayKeys(days[i], days[i - 1])).toBe(1);
    }
  });

  it('crosses the month boundary correctly', () => {
    // Week containing Wed 2026-07-01 starts Mon 2026-06-29.
    const days = weekDayKeys('2026-07-01', 1);
    expect(days[0]).toBe('2026-06-29');
    expect(days[6]).toBe('2026-07-05');
    expect(days).toContain('2026-07-01');
  });
});

describe('weekDayKeys (Sunday start)', () => {
  it('returns Sun..Sat for a Saturday (today is last column)', () => {
    const days = weekDayKeys('2026-06-13', 0);
    expect(days[0]).toBe('2026-06-07'); // Sun
    expect(days[6]).toBe('2026-06-13'); // Sat
  });
});

describe('startOfWeekKey', () => {
  it('is idempotent on the first day of the week', () => {
    const start = startOfWeekKey('2026-06-13', 1);
    expect(start).toBe('2026-06-08');
    expect(startOfWeekKey(start, 1)).toBe('2026-06-08');
  });
});

describe('labels', () => {
  it('weekdayInitial + dayOfMonth', () => {
    expect(weekdayInitial('2026-06-13')).toBe('S'); // Saturday
    expect(weekdayInitial('2026-06-08')).toBe('M'); // Monday
    expect(dayOfMonth('2026-06-13')).toBe(13);
  });
});
