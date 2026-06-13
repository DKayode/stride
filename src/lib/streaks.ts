import { isDayComplete, type DayKey, type Habit, type HabitCompletion, type HabitStreak } from '../types';
import { diffDayKeys, shiftDayKey, todayKey } from './date';

/**
 * Compute current + best streaks for a habit from its completion history.
 *
 * A day "qualifies" when its logged value satisfies the habit's completion
 * criterion (`isDayComplete`): any positive value for binary habits, or
 * reaching the target for quantified habits.
 *
 * - **best**: the longest run of consecutive qualifying calendar days ever.
 * - **current**: consecutive qualifying days counting backward from an anchor.
 *   The anchor is *today* if today qualifies, otherwise *yesterday*. This is
 *   the key day-boundary rule: a streak whose most recent qualifying day is
 *   yesterday is still "alive" (today simply isn't logged yet) and does not
 *   reset. If neither today nor yesterday qualifies, the run is broken and
 *   current is 0.
 *
 * Pure and timezone-correct: all day math goes through the local-time
 * {@link DayKey} helpers, so streaks behave across day/month/year boundaries.
 * `today` is injectable for deterministic testing.
 */
export function computeStreak(
  habit: Habit,
  completions: readonly HabitCompletion[],
  today: DayKey = todayKey(),
): HabitStreak {
  const qualifying = new Set<DayKey>();
  for (const completion of completions) {
    if (isDayComplete(habit, completion.value)) {
      qualifying.add(completion.date);
    }
  }

  const completedToday = qualifying.has(today);
  const best = longestRun(qualifying);

  // Anchor the current run at today (if done) or yesterday (grace for a day
  // not yet logged). Anything older means yesterday was missed → run broken.
  const yesterday = shiftDayKey(today, -1);
  let anchor: DayKey | null = null;
  if (qualifying.has(today)) {
    anchor = today;
  } else if (qualifying.has(yesterday)) {
    anchor = yesterday;
  }

  let current = 0;
  if (anchor !== null) {
    let cursor = anchor;
    while (qualifying.has(cursor)) {
      current += 1;
      cursor = shiftDayKey(cursor, -1);
    }
  }

  return { current, best, completedToday };
}

/** Longest run of consecutive calendar days within a set of day keys. */
function longestRun(days: ReadonlySet<DayKey>): number {
  if (days.size === 0) return 0;
  // YYYY-MM-DD sorts lexically in chronological order.
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = diffDayKeys(sorted[i], sorted[i - 1]);
    if (gap === 1) {
      run += 1;
    } else if (gap === 0) {
      continue; // defensive: duplicate day (the unique index prevents this)
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  return best;
}
