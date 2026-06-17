/**
 * Persistent running-timer state for time-unit habits (D5).
 *
 * Stored in `localStorage` as one tiny JSON object rather than a Dexie table:
 * the data is ephemeral UI state — a single start timestamp per running habit
 * — that never needs querying, indexing, or to live alongside the offline
 * habit history. The lighter store fits and avoids a schema migration. The
 * running state survives reloads/offline; at most one timer runs per habit,
 * but several habits may run at once.
 */
import type { ID } from '../types';

const STORAGE_KEY = 'stride.activeTimers';

/** Map of `habitId → timer start timestamp (epoch ms)`. */
type TimerMap = Record<ID, number>;

function read(): TimerMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TimerMap) : {};
  } catch {
    return {};
  }
}

function write(map: TimerMap): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** The start timestamp (epoch ms) of a habit's running timer, or `null`. */
export function getTimerStart(habitId: ID): number | null {
  return read()[habitId] ?? null;
}

/**
 * Start a habit's timer and return its start timestamp. An already-running
 * timer is preserved (its original start is returned) so a reload mid-run
 * never resets the accrued elapsed time.
 */
export function startTimer(habitId: ID, startedAt: number = Date.now()): number {
  const map = read();
  if (map[habitId] === undefined) {
    map[habitId] = startedAt;
    write(map);
  }
  return map[habitId];
}

/** Stop a habit's timer, returning its start timestamp (or `null` if idle). */
export function stopTimer(habitId: ID): number | null {
  const map = read();
  const startedAt = map[habitId];
  if (startedAt === undefined) return null;
  delete map[habitId];
  write(map);
  return startedAt;
}
