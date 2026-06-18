import { NAV_ITEMS, type Tab } from './navItems.ts';

export type { Tab };

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

/**
 * Sticky bottom navigation, pinned to the viewport bottom and safe-area
 * aware. Three destinations; the active one is highlighted. No text selection;
 * tap feedback via the shared `.tap` utility. Mobile-only — hidden at lg where
 * the sidebar takes over.
 */
export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-stretch border-t border-surface-2 bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map(({ tab: t, label, icon: Icon }) => {
        const active = tab === t;
        return (
          <button
            key={t}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(t)}
            className={`tap flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              active ? 'text-brand' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
