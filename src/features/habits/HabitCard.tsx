import { useMemo } from 'react';
import { Check, Flame, Minus, Plus, Trophy } from 'lucide-react';
import { useHabitCompletions } from '../../hooks';
import { incrementHabit, toggleHabit } from '../../db';
import { getIcon } from '../../lib/appearance';
import { computeStreak } from '../../lib/streaks';
import { todayKey } from '../../lib/date';
import { isDayComplete, isQuantifiedHabit, type Habit } from '../../types';

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
}

/**
 * A single habit row: appearance, current/best streak, and the day's tracking
 * control (binary check toggle or quantified stepper). All writes persist
 * instantly via the storage layer; streaks recompute reactively from history.
 */
export function HabitCard({ habit, onEdit }: HabitCardProps) {
  const completions = useHabitCompletions(habit.id);
  const today = todayKey();

  const streak = useMemo(() => computeStreak(habit, completions, today), [habit, completions, today]);
  const todayValue = useMemo(
    () => completions.find((c) => c.date === today)?.value ?? 0,
    [completions, today],
  );

  const Icon = getIcon(habit.icon);
  const done = isDayComplete(habit, todayValue);
  const quantified = isQuantifiedHabit(habit);
  const progress = quantified ? Math.min(1, todayValue / habit.target) : done ? 1 : 0;

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
                  {todayValue}/{habit.target} {habit.unit}
                </span>
              )}
            </span>
          </span>
        </button>

        {quantified ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label={`Decrease ${habit.name}`}
              onClick={() => void incrementHabit(habit, -1)}
              disabled={todayValue <= 0}
              className="tap flex size-9 items-center justify-center rounded-full border border-surface-2 text-slate-300 active:bg-surface-2 disabled:opacity-30"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Increase ${habit.name}`}
              onClick={() => void incrementHabit(habit, 1)}
              className="tap flex size-9 items-center justify-center rounded-full text-white"
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
            onClick={() => void toggleHabit(habit)}
            className={`tap flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition ${
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
