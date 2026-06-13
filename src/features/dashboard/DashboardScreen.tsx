import { useState } from 'react';
import { CalendarDays, Target } from 'lucide-react';
import { useProjects } from '../../hooks';
import { WeekGrid } from './WeekGrid';
import { ProjectCard } from '../projects/ProjectCard';
import { ProjectDetail } from '../projects/ProjectDetail';
import type { Project } from '../../types';

/**
 * Unified home view: the current week's habit completion grid alongside a
 * visual progress indicator for each project. Fully reactive — toggling a
 * habit updates the grid and any linked project's ring instantly.
 */
export function DashboardScreen() {
  const projects = useProjects();
  const [active, setActive] = useState<Project | undefined>(undefined);
  const activeProject = active ? projects.find((p) => p.id === active.id) : undefined;

  return (
    <section className="flex flex-col gap-6 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400">Your week at a glance.</p>
      </header>

      <div className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <CalendarDays className="size-4 text-brand" aria-hidden />
          This week
        </h2>
        <WeekGrid />
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Target className="size-4 text-accent" aria-hidden />
          Projects
        </h2>
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-2 px-4 py-6 text-center text-sm text-slate-500">
            No projects yet — create one to see its progress here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={setActive} />
            ))}
          </ul>
        )}
      </div>

      {activeProject && (
        <ProjectDetail open project={activeProject} onClose={() => setActive(undefined)} />
      )}
    </section>
  );
}
