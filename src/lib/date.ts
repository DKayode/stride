import type { DayKey } from '../types';

/**
 * Local-day utilities. Habit completions are bucketed by the user's local
 * calendar day (see {@link DayKey}) so streaks behave correctly across day
 * boundaries and timezones. All helpers here operate in local time.
 */

/** Format a `Date` as a local `YYYY-MM-DD` day key. */
export function toDayKey(date: Date): DayKey {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The current local day key. */
export function todayKey(): DayKey {
  return toDayKey(new Date());
}

/** Parse a `YYYY-MM-DD` day key back into a local-midnight `Date`. */
export function dayKeyToDate(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Return the day key `deltaDays` away from `key` (negative = earlier). */
export function shiftDayKey(key: DayKey, deltaDays: number): DayKey {
  const date = dayKeyToDate(key);
  date.setDate(date.getDate() + deltaDays);
  return toDayKey(date);
}

/** Whole-day signed difference `a - b` (e.g. yesterday→today is 1). */
export function diffDayKeys(a: DayKey, b: DayKey): number {
  const ms = dayKeyToDate(a).getTime() - dayKeyToDate(b).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Whether a deadline is overdue: a non-null day in the past for an item that
 * is not yet completed. Completed items never read as overdue.
 */
export function isOverdue(
  deadline: DayKey | null,
  completed: boolean,
  today: DayKey = todayKey(),
): boolean {
  return deadline !== null && !completed && diffDayKeys(deadline, today) < 0;
}

/** Format a day key for compact display, e.g. `Jun 13`. */
export function formatDayKeyShort(key: DayKey): string {
  return dayKeyToDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
