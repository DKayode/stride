import { LayoutDashboard, ListChecks, Target, type LucideIcon } from 'lucide-react';

export type Tab = 'dashboard' | 'habits' | 'projects';

export interface NavItem {
  tab: Tab;
  label: string;
  icon: LucideIcon;
}

/**
 * The three primary destinations, shared by the mobile bottom nav and the
 * desktop sidebar so both stay in lockstep (same order, labels, and icons).
 */
export const NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { tab: 'habits', label: 'Habits', icon: ListChecks },
  { tab: 'projects', label: 'Projects', icon: Target },
];
