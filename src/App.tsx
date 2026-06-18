import { useState } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav, type Tab } from './components/BottomNav.tsx';
import { SideNav } from './components/SideNav.tsx';
import { DashboardScreen } from './features/dashboard/DashboardScreen.tsx';
import { HabitsScreen } from './features/habits/HabitsScreen.tsx';
import { ProjectsScreen } from './features/projects/ProjectsScreen.tsx';
import { usePwaInstall } from './pwa/usePwaInstall.ts';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

/**
 * App shell. On mobile (default) it is a centered max-w-md column with a sticky
 * header and a fixed bottom nav. On desktop (lg:) it becomes a two-region
 * layout: a persistent left sidebar plus a wider, centered content region with
 * the bottom-nav clearance removed. Both navs drive the same tab state.
 * Safe-area aware; pull-to-refresh is suppressed globally in index.css.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { canInstall, promptInstall } = usePwaInstall();
  const onInstall = () => void promptInstall();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <SideNav tab={tab} onChange={setTab} canInstall={canInstall} onInstall={onInstall} />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:mx-0 lg:max-w-none">
        <Header canInstall={canInstall} onInstall={onInstall} />

        {/* Bottom padding clears the fixed bottom nav on mobile; on desktop the
            sidebar replaces it, so the clearance is removed. */}
        <main className="flex-1 pb-24 lg:pb-0">
          <div className="lg:mx-auto lg:max-w-5xl lg:px-6 xl:px-8">
            {tab === 'dashboard' && <DashboardScreen />}
            {tab === 'habits' && <HabitsScreen />}
            {tab === 'projects' && <ProjectsScreen />}
          </div>
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>

      <UpdatePrompt />
    </div>
  );
}
