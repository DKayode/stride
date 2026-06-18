import { useState } from 'react';
import { Check, Link2, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useProjects } from '../../hooks';
import { COLORS, ICON_NAMES, getIcon } from '../../lib/appearance';
import { createHabit, deleteHabit, updateHabit } from '../../db';
import { isQuantifiedHabit, type Habit, type HabitType, type ID } from '../../types';

interface HabitFormProps {
  open: boolean;
  /** When provided, the form edits this habit; otherwise it creates a new one. */
  habit?: Habit;
  onClose: () => void;
}

/** Create / edit form for a habit (binary or quantified) in a bottom sheet. */
export function HabitForm({ open, habit, onClose }: HabitFormProps) {
  const editing = habit !== undefined;

  const [name, setName] = useState(habit?.name ?? '');
  const [type, setType] = useState<HabitType>(habit?.type ?? 'binary');
  const [target, setTarget] = useState(
    habit && isQuantifiedHabit(habit) ? String(habit.target) : '3',
  );
  const [unit, setUnit] = useState(habit && isQuantifiedHabit(habit) ? habit.unit : 'L');
  const [color, setColor] = useState(habit?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(habit?.icon ?? ICON_NAMES[0]);
  const [projectId, setProjectId] = useState<ID | null>(habit?.projectId ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const projects = useProjects();

  const trimmedName = name.trim();
  const parsedTarget = Number(target);
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0;
  const canSave = trimmedName.length > 0 && (type === 'binary' || (targetValid && unit.trim().length > 0));

  async function handleSave() {
    if (!canSave) return;
    if (editing) {
      await updateHabit(habit.id, {
        name: trimmedName,
        color,
        icon,
        projectId,
        ...(type === 'quantified' ? { target: parsedTarget, unit: unit.trim() } : {}),
      });
    } else if (type === 'quantified') {
      await createHabit({
        type,
        name: trimmedName,
        target: parsedTarget,
        unit: unit.trim(),
        color,
        icon,
        projectId,
      });
    } else {
      await createHabit({ type: 'binary', name: trimmedName, color, icon, projectId });
    }
    onClose();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteHabit(habit.id);
    onClose();
  }

  // Type is fixed once a habit exists (changing kind would orphan history).
  const typeLocked = editing;

  return (
    <Sheet open={open} title={editing ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Name</span>
          <input
            autoFocus={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Drink water"
            className="rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Type</span>
          <div className="grid grid-cols-2 gap-2">
            {(['binary', 'quantified'] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={typeLocked && t !== type}
                onClick={() => setType(t)}
                className={`tap rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  type === t
                    ? 'border-brand bg-brand/15 text-white'
                    : 'border-surface-2 text-slate-300'
                } ${typeLocked && t !== type ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                {t === 'binary' ? 'Yes / No' : 'Quantified'}
              </button>
            ))}
          </div>
          {typeLocked && (
            <span className="text-xs text-slate-500">Type can't change after creation.</span>
          )}
        </div>

        {type === 'quantified' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-300">Daily target</span>
              <input
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-300">Unit</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="L, pages, reps"
                className="rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
              />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Color</span>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`tap size-8 rounded-full ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Icon</span>
          <div className="grid grid-cols-8 gap-2">
            {ICON_NAMES.map((iconName) => {
              const Icon = getIcon(iconName);
              return (
                <button
                  key={iconName}
                  type="button"
                  aria-label={iconName}
                  onClick={() => setIcon(iconName)}
                  className={`tap flex aspect-square items-center justify-center rounded-lg border ${
                    icon === iconName ? 'border-brand bg-brand/15' : 'border-surface-2'
                  }`}
                >
                  <Icon className="size-4" style={{ color }} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <Link2 className="size-4" aria-hidden />
            Link to project
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProjectId(null)}
              className={`tap rounded-full border px-3 py-1.5 text-sm ${
                projectId === null ? 'border-brand bg-brand/15 text-white' : 'border-surface-2 text-slate-300'
              }`}
            >
              None
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className={`tap max-w-[12rem] truncate rounded-full border px-3 py-1.5 text-sm ${
                  projectId === p.id ? 'border-brand bg-brand/15 text-white' : 'border-surface-2 text-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {projects.length === 0 && (
            <span className="text-xs text-slate-500">
              Create a project first to link this habit to it.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="tap mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong active:bg-brand-strong disabled:opacity-40"
        >
          <Check className="size-5" aria-hidden />
          {editing ? 'Save changes' : 'Create habit'}
        </button>

        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            className={`tap flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              confirmDelete
                ? 'border-danger bg-danger/15 text-danger'
                : 'border-surface-2 text-slate-400'
            }`}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmDelete ? 'Tap again to delete' : 'Delete habit'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
