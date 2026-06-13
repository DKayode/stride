import { useState } from 'react';
import { HabitsScreen } from './features/habits/HabitsScreen.tsx';
import { ProjectsScreen } from './features/projects/ProjectsScreen.tsx';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

type Tab = 'habits' | 'projects';

/**
 * App root. The unified shell with sticky bottom navigation and the install
 * button is built in deliverable 9; for now a temporary segmented control
 * switches between the Habits and Projects screens so both are exercisable.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('habits');

  return (
    <>
      <div className="mx-auto min-h-dvh max-w-md">
        <div className="grid grid-cols-2 gap-2 p-4 pb-0">
          {(['habits', 'projects'] as const).map((t) => (
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
        {tab === 'habits' ? <HabitsScreen /> : <ProjectsScreen />}
      </div>
      <UpdatePrompt />
    </>
  );
}
