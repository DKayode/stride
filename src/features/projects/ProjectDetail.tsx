import { useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { ProgressRing } from '../../components/ProgressRing';
import { ProjectForm } from './ProjectForm';
import { useLinkedHabitContribution, useMilestones, useProjectProgress, useSubtasks } from '../../hooks';
import {
  addMilestone,
  addSubtask,
  deleteMilestone,
  deleteSubtask,
  setProjectProgress,
  toggleMilestone,
  toggleSubtask,
  updateMilestone,
  updateSubtask,
} from '../../db';
import { formatDayKeyShort, isOverdue } from '../../lib/date';
import { getIcon } from '../../lib/appearance';
import type { DayKey, Milestone, Project } from '../../types';

interface ProjectDetailProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

/** Inline deadline chip; renders in danger styling when overdue. */
function DeadlineChip({ deadline, completed }: { deadline: DayKey; completed: boolean }) {
  const overdue = isOverdue(deadline, completed);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
        overdue ? 'bg-danger/15 text-danger' : 'text-slate-400'
      }`}
    >
      <Calendar className="size-3" aria-hidden />
      {formatDayKeyShort(deadline)}
      {overdue && <span className="sr-only"> (overdue)</span>}
    </span>
  );
}

/**
 * A single milestone: an expandable row revealing its sub-tasks. When the
 * milestone has sub-tasks its checkbox is derived (read-only, rolled up from
 * the sub-tasks); with none it keeps the manual completion toggle.
 */
function MilestoneRow({ milestone, color }: { milestone: Milestone; color: string }) {
  const subtasks = useSubtasks(milestone.id);
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const hasSubtasks = subtasks.length > 0;
  const completedCount = subtasks.reduce((n, s) => (s.completed ? n + 1 : n), 0);

  async function handleAddSubtask() {
    const title = newTitle.trim();
    if (!title) return;
    await addSubtask(milestone.id, title, newDeadline || null);
    setNewTitle('');
    setNewDeadline('');
  }

  async function handleDeleteSubtask(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    await deleteSubtask(id);
    setConfirmId(null);
  }

  function startEdit(id: string, title: string, deadline: DayKey | null) {
    setEditId(id);
    setEditTitle(title);
    setEditDeadline(deadline ?? '');
  }

  async function saveEdit() {
    if (!editId) return;
    const title = editTitle.trim();
    if (title) {
      await updateSubtask(editId, { title, deadline: editDeadline || null });
    }
    setEditId(null);
  }

  function startTitleEdit() {
    setTitleDraft(milestone.title);
    setEditingTitle(true);
  }

  async function saveTitleEdit() {
    const title = titleDraft.trim();
    if (title) {
      await updateMilestone(milestone.id, { title });
    }
    setEditingTitle(false);
  }

  return (
    <li className="rounded-xl border border-surface-2 bg-ink">
      <div className="flex items-center gap-2 px-2 py-2.5">
        <button
          type="button"
          aria-label={expanded ? 'Collapse milestone' : 'Expand milestone'}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="tap rounded-md p-1 text-slate-500 hover:text-slate-300 active:text-slate-300"
        >
          {expanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
        </button>

        {hasSubtasks ? (
          <span
            role="img"
            aria-label={milestone.completed ? `${milestone.title} complete` : `${milestone.title} incomplete`}
            title="Completion is derived from sub-tasks"
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
              milestone.completed ? 'border-transparent text-white' : 'border-surface-2 text-transparent'
            }`}
            style={milestone.completed ? { backgroundColor: color } : undefined}
          >
            <Check className="size-4" aria-hidden />
          </span>
        ) : (
          <button
            type="button"
            aria-label={milestone.completed ? `Mark ${milestone.title} incomplete` : `Mark ${milestone.title} complete`}
            aria-pressed={milestone.completed}
            onClick={() => void toggleMilestone(milestone.id)}
            className={`tap flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
              milestone.completed ? 'border-transparent text-white' : 'border-surface-2 text-transparent'
            }`}
            style={milestone.completed ? { backgroundColor: color } : undefined}
          >
            <Check className="size-4" aria-hidden />
          </button>
        )}

        {editingTitle ? (
          <>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveTitleEdit();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => void saveTitleEdit()}
              aria-label="Save milestone title"
              className="tap rounded-md p-1.5 text-brand hover:text-brand-strong active:text-brand-strong"
            >
              <Check className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              aria-label="Cancel edit"
              className="tap rounded-md p-1.5 text-slate-500 hover:text-slate-300 active:text-slate-300"
            >
              <X className="size-4" aria-hidden />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`min-w-0 flex-1 whitespace-normal break-words text-left text-sm ${
                milestone.completed ? 'text-slate-500 line-through' : ''
              }`}
            >
              {milestone.title}
              {hasSubtasks && (
                <span className="ml-1.5 text-xs text-slate-500">
                  {completedCount}/{subtasks.length}
                </span>
              )}
            </button>

            {milestone.deadline && <DeadlineChip deadline={milestone.deadline} completed={milestone.completed} />}

            <button
              type="button"
              aria-label={`Edit ${milestone.title}`}
              onClick={startTitleEdit}
              className="tap rounded-md p-1.5 text-slate-500 hover:text-slate-300 active:text-slate-300"
            >
              <Pencil className="size-4" aria-hidden />
            </button>

            <button
              type="button"
              aria-label={`Delete ${milestone.title}`}
              onClick={() => void (confirmId === milestone.id ? deleteMilestone(milestone.id) : setConfirmId(milestone.id))}
              className={`tap rounded-md p-1.5 ${
                confirmId === milestone.id ? 'bg-danger/15 text-danger' : 'text-slate-500 hover:text-slate-300 active:text-slate-300'
              }`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-surface-2 px-3 py-2.5">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <span className="shrink-0">Milestone deadline</span>
            <input
              type="date"
              value={milestone.deadline ?? ''}
              onChange={(e) => void updateMilestone(milestone.id, { deadline: e.target.value || null })}
              className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-surface px-2 py-1 text-xs text-slate-200 outline-none focus:border-brand"
            />
          </label>

          {subtasks.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {subtasks.map((s) =>
                editId === s.id ? (
                  <li key={s.id} className="flex items-center gap-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveEdit();
                        if (e.key === 'Escape') setEditId(null);
                      }}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
                    />
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-32 shrink-0 rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      aria-label="Save sub-task"
                      className="tap rounded-md p-1.5 text-brand hover:text-brand-strong active:text-brand-strong"
                    >
                      <Check className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      aria-label="Cancel edit"
                      className="tap rounded-md p-1.5 text-slate-500 hover:text-slate-300 active:text-slate-300"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ) : (
                  <li key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={s.completed ? `Mark ${s.title} incomplete` : `Mark ${s.title} complete`}
                      aria-pressed={s.completed}
                      onClick={() => void toggleSubtask(s.id)}
                      className={`tap flex size-5 shrink-0 items-center justify-center rounded border-2 ${
                        s.completed ? 'border-transparent text-white' : 'border-surface-2 text-transparent'
                      }`}
                      style={s.completed ? { backgroundColor: color } : undefined}
                    >
                      <Check className="size-3" aria-hidden />
                    </button>
                    <span className={`min-w-0 flex-1 whitespace-normal break-words text-sm ${s.completed ? 'text-slate-500 line-through' : ''}`}>
                      {s.title}
                    </span>
                    {s.deadline && <DeadlineChip deadline={s.deadline} completed={s.completed} />}
                    <button
                      type="button"
                      aria-label={`Edit ${s.title}`}
                      onClick={() => startEdit(s.id, s.title, s.deadline)}
                      className="tap rounded-md p-1 text-slate-500 hover:text-slate-300 active:text-slate-300"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${s.title}`}
                      onClick={() => void handleDeleteSubtask(s.id)}
                      className={`tap rounded-md p-1 ${
                        confirmId === s.id ? 'bg-danger/15 text-danger' : 'text-slate-500 hover:text-slate-300 active:text-slate-300'
                      }`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddSubtask();
              }}
              placeholder="Add a sub-task"
              className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              aria-label="Sub-task deadline"
              className="w-32 shrink-0 rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => void handleAddSubtask()}
              disabled={newTitle.trim().length === 0}
              aria-label="Add sub-task"
              className="tap flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-strong active:bg-brand-strong disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Project detail sheet: progress, milestone + sub-task management, and manual progress. */
export function ProjectDetail({ open, project, onClose }: ProjectDetailProps) {
  const milestones = useMilestones(project.id);
  const progress = useProjectProgress(project);
  const linked = useLinkedHabitContribution(project.id);
  const [newTitle, setNewTitle] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const Icon = getIcon(project.icon);
  const percent = progress?.percent ?? 0;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    await addMilestone(project.id, title);
    setNewTitle('');
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
              <p className="mt-0.5 whitespace-normal break-words text-sm text-slate-400">{project.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {progress && progress.milestonesTotal > 0
                ? `${progress.milestonesCompleted}/${progress.milestonesTotal} milestones`
                : linked.total > 0
                  ? 'Progress from linked habits'
                  : 'No milestones — using manual progress'}
              {progress && progress.subtasksTotal > 0 && (
                <span>
                  {' · '}
                  {progress.subtasksCompleted}/{progress.subtasksTotal} sub-tasks
                </span>
              )}
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
            className="tap rounded-full p-2 text-slate-400 hover:bg-surface-2 hover:text-slate-100 active:bg-surface-2 active:text-slate-100"
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
                <MilestoneRow key={m.id} milestone={m} color={project.color} />
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
              className="tap flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-strong active:bg-brand-strong disabled:opacity-40"
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
