import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useCompletionsForDays, useHabits } from '../../hooks';
import { getIcon } from '../../lib/appearance';
import { todayKey } from '../../lib/date';
import { dayOfMonth, weekDayKeys, weekdayInitial } from '../../lib/week';
import { isDayComplete, isQuantifiedHabit, type DayKey, type Habit } from '../../types';

type CellState = 'done' | 'partial' | 'empty';

function cellState(habit: Habit, value: number): CellState {
  if (isDayComplete(habit, value)) return 'done';
  if (isQuantifiedHabit(habit) && value > 0) return 'partial';
  return 'empty';
}

/**
 * Current-week habit completion grid: habits as rows, the seven local days of
 * this week as columns. Each cell reflects that day's state (done / partial /
 * empty); the "today" column is highlighted. Reactive via useLiveQuery.
 */
export function WeekGrid() {
  const habits = useHabits();
  const days = useMemo(() => weekDayKeys(todayKey()), []);
  const today = todayKey();
  const grid = useCompletionsForDays(days);

  if (habits.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-surface-2 px-4 py-6 text-center text-sm text-slate-500">
        Add a habit to start tracking your week.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-2 bg-surface p-3">
      {/* Header: weekday + date, today highlighted. */}
      <div className="flex items-center gap-2">
        <div className="w-20 shrink-0" />
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((day: DayKey) => {
            const isToday = day === today;
            return (
              <div key={day} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium uppercase text-slate-500">
                  {weekdayInitial(day)}
                </span>
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[11px] tabular-nums ${
                    isToday ? 'bg-brand font-bold text-white' : 'text-slate-400'
                  }`}
                >
                  {dayOfMonth(day)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-2 flex flex-col gap-1.5">
        {habits.map((habit) => {
          const Icon = getIcon(habit.icon);
          const byDay = grid.get(habit.id);
          return (
            <li key={habit.id} className="flex items-center gap-2">
              <div className="flex w-20 shrink-0 items-center gap-1.5">
                <Icon className="size-3.5 shrink-0" style={{ color: habit.color }} aria-hidden />
                <span className="truncate text-xs text-slate-300">{habit.name}</span>
              </div>
              <div className="grid flex-1 grid-cols-7 gap-1">
                {days.map((day) => {
                  const value = byDay?.get(day) ?? 0;
                  const state = cellState(habit, value);
                  const isToday = day === today;
                  const label = `${habit.name} ${day}: ${
                    state === 'done' ? 'complete' : state === 'partial' ? 'partial' : 'not done'
                  }`;
                  return (
                    <div
                      key={day}
                      title={label}
                      aria-label={label}
                      className={`flex aspect-square items-center justify-center rounded-md ${
                        isToday ? 'ring-1 ring-inset ring-brand/60' : ''
                      }`}
                      style={
                        state === 'done'
                          ? { backgroundColor: habit.color }
                          : state === 'partial'
                            ? { backgroundColor: `${habit.color}33`, border: `1.5px solid ${habit.color}` }
                            : { backgroundColor: 'var(--color-surface-2)' }
                      }
                    >
                      {state === 'done' && <Check className="size-3 text-white" aria-hidden />}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
