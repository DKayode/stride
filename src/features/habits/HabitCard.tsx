import { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Minus, Play, Plus, Square, Trophy } from 'lucide-react';
import { useHabitCompletions } from '../../hooks';
import { incrementHabit, toggleHabit } from '../../db';
import { getIcon } from '../../lib/appearance';
import { computeStreak } from '../../lib/streaks';
import { todayKey } from '../../lib/date';
import { elapsedToUnit, formatAmount, formatElapsed, isTimeUnit } from '../../lib/duration';
import { getTimerStart, startTimer, stopTimer } from '../../lib/timers';
import { isDayComplete, isQuantifiedHabit, type DayKey, type Habit } from '../../types';

interface HabitCardProps {
  habit: Habit;
  /** Local day this card reads and writes completions for (the selected day). */
  date: DayKey;
  onEdit: (habit: Habit) => void;
}

/**
 * A single habit row: appearance, current/best streak, and the selected day's
 * tracking control (binary check toggle or quantified stepper). All writes
 * persist instantly via the storage layer; streaks recompute reactively from
 * full history (always anchored at the real today, not the selected day).
 */
export function HabitCard({ habit, date, onEdit }: HabitCardProps) {
  const completions = useHabitCompletions(habit.id);
  const today = todayKey();

  const streak = useMemo(() => computeStreak(habit, completions, today), [habit, completions, today]);
  const dayValue = useMemo(
    () => completions.find((c) => c.date === date)?.value ?? 0,
    [completions, date],
  );

  const Icon = getIcon(habit.icon);
  const done = isDayComplete(habit, dayValue);
  const quantified = isQuantifiedHabit(habit);
  const progress = quantified ? Math.min(1, dayValue / habit.target) : done ? 1 : 0;

  // Start/stop timer for time-unit quantified habits. The active timer's start
  // timestamp persists in localStorage so it survives reloads; `now` ticks
  // once a second while running so the elapsed display stays live.
  const timed = quantified && isTimeUnit(habit.unit);
  const [startedAt, setStartedAt] = useState<number | null>(() =>
    timed ? getTimerStart(habit.id) : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null;
  const elapsed = startedAt !== null ? Math.max(0, now - startedAt) : 0;

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  function toggleTimer() {
    if (running) {
      const begun = stopTimer(habit.id);
      setStartedAt(null);
      if (begun !== null && isQuantifiedHabit(habit)) {
        const amount = elapsedToUnit(Date.now() - begun, habit.unit);
        if (amount > 0) void incrementHabit(habit, amount, date);
      }
    } else {
      setStartedAt(startTimer(habit.id));
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-surface-2 bg-surface">
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          onClick={() => onEdit(habit)}
          className="tap flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${habit.color}22` }}
          >
            <Icon className="size-5" style={{ color: habit.color }} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{habit.name}</span>
            <span className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Flame
                  className="size-3.5"
                  style={{ color: streak.current > 0 ? '#f59e0b' : undefined }}
                  aria-hidden
                />
                {streak.current} day{streak.current === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="size-3.5" aria-hidden />
                best {streak.best}
              </span>
              {quantified && (
                <span className="tabular-nums">
                  {formatAmount(dayValue)}/{habit.target} {habit.unit}
                </span>
              )}
            </span>
          </span>
        </button>

        {quantified ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {timed && (
              <button
                type="button"
                aria-label={running ? `Stop timer for ${habit.name}` : `Start timer for ${habit.name}`}
                aria-pressed={running}
                onClick={toggleTimer}
                className={`tap flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums ${
                  running
                    ? 'bg-danger/15 text-danger'
                    : 'border border-surface-2 text-slate-300 hover:bg-surface-2 active:bg-surface-2'
                }`}
              >
                {running ? <Square className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                {running ? formatElapsed(elapsed) : 'Start'}
              </button>
            )}
            <button
              type="button"
              aria-label={`Decrease ${habit.name}`}
              onClick={() => void incrementHabit(habit, -1, date)}
              disabled={dayValue <= 0}
              className="tap flex size-9 items-center justify-center rounded-full border border-surface-2 text-slate-300 hover:bg-surface-2 active:bg-surface-2 disabled:opacity-30"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Increase ${habit.name}`}
              onClick={() => void incrementHabit(habit, 1, date)}
              className="tap flex size-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: habit.color }}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
            aria-pressed={done}
            onClick={() => void toggleHabit(habit, date)}
            className={`tap flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition hover:opacity-90 ${
              done ? 'border-transparent text-white' : 'border-surface-2 text-transparent'
            }`}
            style={done ? { backgroundColor: habit.color } : undefined}
          >
            <Check className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <div className="h-1 w-full bg-surface-2">
        <div
          className="h-full transition-all"
          style={{ width: `${progress * 100}%`, backgroundColor: habit.color }}
        />
      </div>
    </li>
  );
}
