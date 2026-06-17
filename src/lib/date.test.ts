import { describe, expect, it } from 'vitest';
import {
  diffDayKeys,
  formatRelativeDay,
  isToday,
  shiftDayKey,
  toDayKey,
} from './date';

// A fixed local reference day used as "today" throughout (a Saturday).
const TODAY = '2026-06-13';

describe('shiftDayKey (day navigation)', () => {
  it('steps back and forward by whole days', () => {
    expect(shiftDayKey(TODAY, -1)).toBe('2026-06-12'); // prev
    expect(shiftDayKey(TODAY, 1)).toBe('2026-06-14'); // next
  });

  it('crosses month boundaries', () => {
    expect(shiftDayKey('2026-07-01', -1)).toBe('2026-06-30');
    expect(shiftDayKey('2026-06-30', 1)).toBe('2026-07-01');
  });

  it('round-trips with diffDayKeys', () => {
    for (const delta of [-5, -1, 0, 1, 7]) {
      expect(diffDayKeys(shiftDayKey(TODAY, delta), TODAY)).toBe(delta);
    }
  });
});

describe('isToday', () => {
  it('is true only for the reference day', () => {
    expect(isToday(TODAY, TODAY)).toBe(true);
    expect(isToday(shiftDayKey(TODAY, -1), TODAY)).toBe(false);
    expect(isToday(shiftDayKey(TODAY, 1), TODAY)).toBe(false);
  });

  it('defaults to the actual current day', () => {
    expect(isToday(toDayKey(new Date()))).toBe(true);
  });
});

describe('formatRelativeDay', () => {
  it('labels today and yesterday', () => {
    expect(formatRelativeDay(TODAY, TODAY)).toBe('Today');
    expect(formatRelativeDay(shiftDayKey(TODAY, -1), TODAY)).toBe('Yesterday');
  });

  it('falls back to a date label for older days', () => {
    const label = formatRelativeDay(shiftDayKey(TODAY, -5), TODAY);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label).toContain('8'); // 2026-06-08
  });
});
