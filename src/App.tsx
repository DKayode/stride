import { useState } from 'react';
import { DashboardScreen } from './features/dashboard/DashboardScreen.tsx';
import { HabitsScreen } from './features/habits/HabitsScreen.tsx';
import { ProjectsScreen } from './features/projects/ProjectsScreen.tsx';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

type Tab = 'dashboard' | 'habits' | 'projects';

/**
 * App root. Dashboard is the home view. The sticky bottom navigation and the
 * install button arrive in deliverable 9; until then a temporary segmented
 * control keeps the Habits and Projects screens reachable.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <>
      <div className="mx-auto min-h-dvh max-w-md">
        <div className="grid grid-cols-3 gap-2 p-4 pb-0">
          {(['dashboard', 'habits', 'projects'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`tap rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                tab === t ? 'bg-brand text-white' : 'bg-surface text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'habits' && <HabitsScreen />}
        {tab === 'projects' && <ProjectsScreen />}
      </div>
      <UpdatePrompt />
    </>
  );
}
