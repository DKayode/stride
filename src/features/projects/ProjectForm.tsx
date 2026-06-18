import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { COLORS, ICON_NAMES, getIcon } from '../../lib/appearance';
import { createProject, deleteProject, updateProject } from '../../db';
import type { Project } from '../../types';

interface ProjectFormProps {
  open: boolean;
  /** When provided, edits this project; otherwise creates a new one. */
  project?: Project;
  onClose: () => void;
  /** Called after the project is deleted (so a parent detail view can close). */
  onDeleted?: () => void;
}

/** Create / edit form for a project in a bottom sheet. */
export function ProjectForm({ open, project, onClose, onDeleted }: ProjectFormProps) {
  const editing = project !== undefined;

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? COLORS[1]);
  const [icon, setIcon] = useState(project?.icon ?? 'target');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  async function handleSave() {
    if (!canSave) return;
    if (editing) {
      await updateProject(project.id, { name: trimmedName, description: description.trim(), color, icon });
    } else {
      await createProject({ name: trimmedName, description: description.trim(), color, icon });
    }
    onClose();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteProject(project.id);
    onClose();
    onDeleted?.();
  }

  return (
    <Sheet open={open} title={editing ? 'Edit project' : 'New project'} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Name</span>
          <input
            autoFocus={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ship Stride v1"
            className="rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="resize-none rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
          />
        </label>

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

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="tap mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong active:bg-brand-strong disabled:opacity-40"
        >
          <Check className="size-5" aria-hidden />
          {editing ? 'Save changes' : 'Create project'}
        </button>

        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            className={`tap flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              confirmDelete ? 'border-danger bg-danger/15 text-danger' : 'border-surface-2 text-slate-400'
            }`}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmDelete ? 'Tap again to delete project' : 'Delete project'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
