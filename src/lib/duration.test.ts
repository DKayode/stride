import { describe, expect, it } from 'vitest';
import {
  elapsedToUnit,
  formatAmount,
  formatElapsed,
  isHourUnit,
  isTimeUnit,
} from './duration';

describe('isTimeUnit', () => {
  it('matches hour and minute labels case-insensitively', () => {
    for (const u of ['h', 'hr', 'hrs', 'hour', 'Hours', ' MIN ', 'm', 'mins', 'Minute', 'minutes']) {
      expect(isTimeUnit(u)).toBe(true);
    }
  });

  it('rejects non-time units', () => {
    for (const u of ['L', 'pages', 'reps', 'km', '', 'meters']) {
      expect(isTimeUnit(u)).toBe(false);
    }
  });
});

describe('isHourUnit', () => {
  it('distinguishes hours from minutes', () => {
    expect(isHourUnit('h')).toBe(true);
    expect(isHourUnit('Hours')).toBe(true);
    expect(isHourUnit('min')).toBe(false);
    expect(isHourUnit('reps')).toBe(false);
  });
});

describe('elapsedToUnit', () => {
  it('converts to minutes for minute units', () => {
    expect(elapsedToUnit(90_000, 'min')).toBe(1.5); // 90s = 1.5 min
    expect(elapsedToUnit(60_000, 'minutes')).toBe(1);
  });

  it('converts to hours for hour units', () => {
    expect(elapsedToUnit(3_600_000, 'h')).toBe(1); // 1h
    expect(elapsedToUnit(1_800_000, 'hours')).toBe(0.5);
  });

  it('returns 0 for non-time units or negative elapsed', () => {
    expect(elapsedToUnit(60_000, 'reps')).toBe(0);
    expect(elapsedToUnit(-5000, 'min')).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('formats below and above an hour', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(42_000)).toBe('0:42');
    expect(formatElapsed(90_000)).toBe('1:30');
    expect(formatElapsed(3_661_000)).toBe('1:01:01');
  });

  it('clamps negatives to zero', () => {
    expect(formatElapsed(-1000)).toBe('0:00');
  });
});

describe('formatAmount', () => {
  it('keeps integers and rounds fractions to two places', () => {
    expect(formatAmount(2)).toBe('2');
    expect(formatAmount(0.5)).toBe('0.5');
    expect(formatAmount(1.5333)).toBe('1.53');
  });
});
