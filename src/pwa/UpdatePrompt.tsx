import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

/**
 * Service-worker lifecycle UI for the prompt-for-update flow.
 *
 * - When a new SW is installed and waiting, shows a toast offering reload.
 * - When the app is first cached for offline use, shows a transient notice.
 *
 * Rendered once at the app root. Uses the `virtual:pwa-register/react` hook
 * provided by vite-plugin-pwa.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[min(92%,28rem)] items-center gap-3 rounded-2xl border border-surface-2 bg-surface px-4 py-3 shadow-2xl shadow-black/40"
    >
      {needRefresh ? (
        <>
          <RefreshCw className="size-5 shrink-0 text-brand" aria-hidden />
          <span className="flex-1 text-sm">A new version of Stride is ready.</span>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="tap rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white active:bg-brand-strong"
          >
            Reload
          </button>
        </>
      ) : (
        <>
          <WifiOff className="size-5 shrink-0 text-success" aria-hidden />
          <span className="flex-1 text-sm">Stride is ready to work offline.</span>
        </>
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="tap rounded-lg p-1 text-slate-400 active:text-slate-200"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
