import { useState } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav, type Tab } from './components/BottomNav.tsx';
import { DashboardScreen } from './features/dashboard/DashboardScreen.tsx';
import { HabitsScreen } from './features/habits/HabitsScreen.tsx';
import { ProjectsScreen } from './features/projects/ProjectsScreen.tsx';
import { usePwaInstall } from './pwa/usePwaInstall.ts';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

/**
 * App shell: a sticky header with the conditional install button, the active
 * screen (Dashboard is home), and a sticky bottom navigation. Mobile-first and
 * safe-area aware; pull-to-refresh is suppressed globally in index.css.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { canInstall, promptInstall } = usePwaInstall();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Header canInstall={canInstall} onInstall={() => void promptInstall()} />

      {/* Bottom padding clears the fixed bottom nav. */}
      <main className="flex-1 pb-24">
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'habits' && <HabitsScreen />}
        {tab === 'projects' && <ProjectsScreen />}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
      <UpdatePrompt />
    </div>
  );
}
