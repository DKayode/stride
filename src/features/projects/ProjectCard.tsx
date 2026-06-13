import { ChevronRight } from 'lucide-react';
import { ProgressRing } from '../../components/ProgressRing';
import { useProjectProgress } from '../../hooks';
import { getIcon } from '../../lib/appearance';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
}

/** Compact project row with a progress ring; tap to open the detail sheet. */
export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const progress = useProjectProgress(project);
  const Icon = getIcon(project.icon);
  const percent = progress?.percent ?? 0;

  const parts: string[] = [];
  if (progress && progress.milestonesTotal > 0) {
    parts.push(`${progress.milestonesCompleted}/${progress.milestonesTotal} milestones`);
  }
  if (progress && progress.linkedHabits > 0) {
    parts.push(`${progress.linkedHabits} linked habit${progress.linkedHabits === 1 ? '' : 's'}`);
  }
  const subtitle = parts.length > 0 ? parts.join(' · ') : 'Manual progress';

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="tap flex w-full items-center gap-3.5 rounded-2xl border border-surface-2 bg-surface p-3.5 text-left"
      >
        <ProgressRing fraction={progress?.fraction ?? 0} color={project.color} size={52} stroke={6}>
          <span className="text-[11px] font-bold tabular-nums">{percent}%</span>
        </ProgressRing>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <Icon className="size-4 shrink-0" style={{ color: project.color }} aria-hidden />
            <span className="truncate font-medium">{project.name}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-400">{subtitle}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-500" aria-hidden />
      </button>
    </li>
  );
}
