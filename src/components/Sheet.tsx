import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Mobile-first bottom sheet modal. Slides up from the bottom, dims the
 * backdrop, locks body scroll while open, and closes on backdrop tap or Esc.
 * Responsive: at lg it centers as a dialog (max-w-lg, fully rounded, internal
 * scroll) instead of a bottom sheet — same component, behaviour unchanged.
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-surface-2 bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 lg:max-w-lg lg:rounded-3xl lg:border lg:pb-4">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap rounded-full p-1.5 text-slate-400 active:bg-surface-2 active:text-slate-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-2">{children}</div>
      </div>
    </div>
  );
}
