import { Activity } from 'lucide-react';
import { UpdatePrompt } from './pwa/UpdatePrompt.tsx';

/**
 * Scaffold shell. The full application shell (sticky bottom nav, install
 * button, unified habits + projects view) is built in deliverable 9.
 */
export default function App() {
  return (
    <>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <Activity className="size-12 text-brand" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">Stride</h1>
        <p className="max-w-xs text-sm text-slate-400">
          Offline-first habit &amp; project tracker. PWA service worker active.
        </p>
      </main>
      <UpdatePrompt />
    </>
  );
}
