import { Activity, Download } from 'lucide-react';

interface HeaderProps {
  /** Whether the "Install Stride" button should be shown. */
  canInstall: boolean;
  onInstall: () => void;
}

/**
 * Slim sticky app header: the Stride wordmark plus an "Install Stride" button
 * that appears only when an install prompt is available and the app isn't
 * already running standalone / as a TWA.
 */
export function Header({ canInstall, onInstall }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-2/60 bg-ink/80 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
      <span className="flex items-center gap-2">
        <Activity className="size-5 text-brand" aria-hidden />
        <span className="text-base font-bold tracking-tight">Stride</span>
      </span>
      {canInstall && (
        <button
          type="button"
          onClick={onInstall}
          className="tap flex items-center gap-1.5 rounded-full border border-brand/50 bg-brand/15 px-3 py-1.5 text-sm font-semibold text-white active:bg-brand/30"
        >
          <Download className="size-4" aria-hidden />
          Install Stride
        </button>
      )}
    </header>
  );
}
