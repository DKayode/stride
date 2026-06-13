import { describe, expect, it } from 'vitest';
import {
  isBinaryHabit,
  isDayComplete,
  isQuantifiedHabit,
  type BinaryHabit,
  type QuantifiedHabit,
} from './habit';

const base = {
  projectId: null,
  color: '#6366f1',
  icon: 'activity',
  sortOrder: 0,
  createdAt: '2026-06-13T00:00:00.000Z',
  updatedAt: '2026-06-13T00:00:00.000Z',
  archivedAt: null,
} as const;

const binary: BinaryHabit = { ...base, id: 'h1', name: 'Meditate', type: 'binary' };
const quantified: QuantifiedHabit = {
  ...base,
  id: 'h2',
  name: 'Drink water',
  type: 'quantified',
  target: 3,
  unit: 'L',
};

describe('habit type guards', () => {
  it('narrows quantified vs binary', () => {
    expect(isQuantifiedHabit(quantified)).toBe(true);
    expect(isQuantifiedHabit(binary)).toBe(false);
    expect(isBinaryHabit(binary)).toBe(true);
    expect(isBinaryHabit(quantified)).toBe(false);
  });
});

describe('isDayComplete', () => {
  it('binary: any positive value completes the day', () => {
    expect(isDayComplete(binary, 0)).toBe(false);
    expect(isDayComplete(binary, 1)).toBe(true);
  });

  it('quantified: completes only when value reaches the target', () => {
    expect(isDayComplete(quantified, 2.9)).toBe(false);
    expect(isDayComplete(quantified, 3)).toBe(true);
    expect(isDayComplete(quantified, 5)).toBe(true);
  });
});
