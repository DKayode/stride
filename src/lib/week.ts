import type { DayKey } from '../types';
import { dayKeyToDate, shiftDayKey } from './date';

/** Day a week starts on: 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** The day key for the start of the local week containing `key`. */
export function startOfWeekKey(key: DayKey, weekStartsOn: WeekStart = 1): DayKey {
  const dayOfWeek = dayKeyToDate(key).getDay(); // 0..6, Sun..Sat
  const offset = (dayOfWeek - weekStartsOn + 7) % 7;
  return shiftDayKey(key, -offset);
}

/**
 * The seven local day keys of the week containing `key`, ordered from the
 * week start. Correct across month/year boundaries (uses local-time helpers),
 * and always includes `key` itself ("today" when called with the current day).
 */
export function weekDayKeys(key: DayKey, weekStartsOn: WeekStart = 1): DayKey[] {
  const start = startOfWeekKey(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => shiftDayKey(start, i));
}

/** Single-letter weekday label for a day key (S, M, T, W, T, F, S). */
export function weekdayInitial(key: DayKey): string {
  return WEEKDAY_INITIALS[dayKeyToDate(key).getDay()];
}

/** Day-of-month number for a day key. */
export function dayOfMonth(key: DayKey): number {
  return dayKeyToDate(key).getDate();
}
