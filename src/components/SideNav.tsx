import {
  Activity,
  Download,
  LayoutDashboard,
  ListChecks,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { Tab } from './BottomNav.tsx';

interface NavItem {
  tab: Tab;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { tab: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { tab: 'habits', label: 'Habits', icon: ListChecks },
  { tab: 'projects', label: 'Projects', icon: Target },
];

interface SideNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  /** Whether the "Install Stride" button should be shown. */
  canInstall: boolean;
  onInstall: () => void;
}

/**
 * Persistent desktop sidebar navigation (lg+ only). The Stride wordmark, the
 * three destinations as full-width buttons with active highlighting, and the
 * conditional install button pinned near the bottom. Mirrors BottomNav's tab
 * API; hover states stand in for the mobile tap feedback. Hidden below lg.
 */
export function SideNav({ tab, onChange, canInstall, onInstall }: SideNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-surface-2 bg-surface/40 px-3 py-5 lg:flex"
    >
      <span className="flex items-center gap-2 px-3 pb-6">
        <Activity className="size-6 text-brand" aria-hidden />
        <span className="text-lg font-bold tracking-tight">Stride</span>
      </span>

      <div className="flex flex-col gap-1">
        {ITEMS.map(({ tab: t, label, icon: Icon }) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(t)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand/15 text-brand'
                  : 'text-slate-400 hover:bg-surface-2 hover:text-slate-200'
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {canInstall && (
        <button
          type="button"
          onClick={onInstall}
          className="mt-auto flex items-center gap-2 rounded-xl border border-brand/50 bg-brand/15 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/30"
        >
          <Download className="size-4" aria-hidden />
          Install Stride
        </button>
      )}
    </nav>
  );
}
