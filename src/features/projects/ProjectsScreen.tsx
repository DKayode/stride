import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useProjects } from '../../hooks';
import { ProjectCard } from './ProjectCard';
import { ProjectForm } from './ProjectForm';
import { ProjectDetail } from './ProjectDetail';
import type { Project } from '../../types';

/** Project advancement screen: projects with progress + milestone management. */
export function ProjectsScreen() {
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<Project | undefined>(undefined);

  // Keep the open detail bound to the latest project record (reactive updates).
  const activeProject = active ? projects.find((p) => p.id === active.id) : undefined;

  return (
    <section className="flex flex-col gap-4 p-4 lg:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Projects</h1>
          <p className="text-sm text-slate-400">Advance toward your bigger goals.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="tap flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-white active:bg-brand-strong"
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-400 lg:mx-auto lg:max-w-sm">
          <Target className="size-12 text-surface-2" aria-hidden />
          <p className="font-medium text-slate-300">No projects yet</p>
          <p className="max-w-xs text-sm">
            Create a project, break it into milestones, and watch your progress climb.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="tap mt-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand-strong"
          >
            Create a project
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={setActive} />
          ))}
        </ul>
      )}

      {/* Key by the create session so the form remounts with fresh state each
          time it opens — otherwise ProjectForm's useState initializers (seeded
          from `project`) run only once and a reopened "New project" form keeps
          the previously entered values. Mirrors the HabitForm fix (9c3d82d). */}
      <ProjectForm
        key={createOpen ? 'new' : 'closed'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {activeProject && (
        <ProjectDetail open project={activeProject} onClose={() => setActive(undefined)} />
      )}
    </section>
  );
}
