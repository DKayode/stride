import { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { ProgressRing } from '../../components/ProgressRing';
import { ProjectForm } from './ProjectForm';
import { useLinkedHabitContribution, useMilestones, useProjectProgress } from '../../hooks';
import { addMilestone, deleteMilestone, setProjectProgress, toggleMilestone } from '../../db';
import { getIcon } from '../../lib/appearance';
import type { Project } from '../../types';

interface ProjectDetailProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

/** Project detail sheet: progress, milestone management, and manual progress. */
export function ProjectDetail({ open, project, onClose }: ProjectDetailProps) {
  const milestones = useMilestones(project.id);
  const progress = useProjectProgress(project);
  const linked = useLinkedHabitContribution(project.id);
  const [newTitle, setNewTitle] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const Icon = getIcon(project.icon);
  const percent = progress?.percent ?? 0;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    await addMilestone(project.id, title);
    setNewTitle('');
  }

  async function handleDeleteMilestone(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    await deleteMilestone(id);
    setConfirmId(null);
  }

  return (
    <Sheet open={open} title={project.name} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center gap-4">
          <ProgressRing fraction={progress?.fraction ?? 0} color={project.color} size={64} stroke={7}>
            <span className="text-sm font-bold tabular-nums">{percent}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="size-4 shrink-0" style={{ color: project.color }} aria-hidden />
              <span className="truncate font-semibold">{project.name}</span>
            </div>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{project.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {progress && progress.milestonesTotal > 0
                ? `${progress.milestonesCompleted}/${progress.milestonesTotal} milestones`
                : linked.total > 0
                  ? 'Progress from linked habits'
                  : 'No milestones — using manual progress'}
              {linked.total > 0 && (
                <span className="text-brand">
                  {' · '}
                  {linked.completed}/{linked.total} linked habit{linked.total === 1 ? '' : 's'} today
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Edit project"
            className="tap rounded-full p-2 text-slate-400 active:bg-surface-2 active:text-slate-100"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        </div>

        {progress && progress.milestonesTotal === 0 && linked.total === 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-300">
              Manual progress: {Math.round(project.manualProgress * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(project.manualProgress * 100)}
              onChange={(e) => void setProjectProgress(project.id, Number(e.target.value) / 100)}
              className="accent-brand"
              style={{ accentColor: project.color }}
            />
          </label>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Milestones</span>
          {milestones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-2 px-3 py-4 text-center text-sm text-slate-500">
              Add phases or checkpoints to track this project.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-surface-2 bg-ink px-3 py-2.5"
                >
                  <button
                    type="button"
                    aria-label={m.completed ? `Mark ${m.title} incomplete` : `Mark ${m.title} complete`}
                    aria-pressed={m.completed}
                    onClick={() => void toggleMilestone(m.id)}
                    className={`tap flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      m.completed ? 'border-transparent text-white' : 'border-surface-2 text-transparent'
                    }`}
                    style={m.completed ? { backgroundColor: project.color } : undefined}
                  >
                    <Check className="size-4" aria-hidden />
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${m.completed ? 'text-slate-500 line-through' : ''}`}
                  >
                    {m.title}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${m.title}`}
                    onClick={() => void handleDeleteMilestone(m.id)}
                    className={`tap rounded-md p-1.5 ${
                      confirmId === m.id ? 'bg-danger/15 text-danger' : 'text-slate-500 active:text-slate-300'
                    }`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 flex items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
              }}
              placeholder="Add a milestone"
              className="flex-1 rounded-xl border border-surface-2 bg-ink px-3 py-2.5 text-base outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={newTitle.trim().length === 0}
              aria-label="Add milestone"
              className="tap flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white active:bg-brand-strong disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ProjectForm
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onDeleted={onClose}
      />
    </Sheet>
  );
}
