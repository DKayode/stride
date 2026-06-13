import { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { useHabits } from '../../hooks';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import type { Habit } from '../../types';

/** Habit tracking screen: the day's habits with create / edit / track controls. */
export function HabitsScreen() {
  const habits = useHabits();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditing(habit);
    setFormOpen(true);
  }

  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-slate-400">Build consistency, one day at a time.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="tap flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-white active:bg-brand-strong"
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </header>

      {habits.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-400">
          <ListChecks className="size-12 text-surface-2" aria-hidden />
          <p className="font-medium text-slate-300">No habits yet</p>
          <p className="max-w-xs text-sm">
            Add your first habit — a simple Yes/No like “Meditate”, or a quantified goal like
            “Drink 3L of water”.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="tap mt-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand-strong"
          >
            Create a habit
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onEdit={openEdit} />
          ))}
        </ul>
      )}

      <HabitForm open={formOpen} habit={editing} onClose={() => setFormOpen(false)} />
    </section>
  );
}
