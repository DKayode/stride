import {
  Activity,
  BookOpen,
  Brain,
  Coffee,
  Droplet,
  Dumbbell,
  Flag,
  Footprints,
  Heart,
  Leaf,
  Moon,
  PenLine,
  Rocket,
  Sparkles,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react';

/**
 * Curated icon + color palettes used when creating habits and projects.
 * A fixed set keeps the bundle small (vs. shipping every lucide icon) and
 * gives a clean, typed picker.
 */
export const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  droplet: Droplet,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  moon: Moon,
  sun: Sun,
  heart: Heart,
  brain: Brain,
  footprints: Footprints,
  'pen-line': PenLine,
  coffee: Coffee,
  leaf: Leaf,
  target: Target,
  flag: Flag,
  rocket: Rocket,
  sparkles: Sparkles,
};

export const ICON_NAMES = Object.keys(ICONS);

/** Resolve a stored icon name to its component, falling back to Activity. */
export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Activity;
}

/** Accent color palette (hex). First entry is the default. */
export const COLORS = [
  '#6366f1', // indigo (brand)
  '#22d3ee', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#14b8a6', // teal
] as const;
