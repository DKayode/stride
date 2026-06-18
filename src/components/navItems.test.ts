import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './navItems.ts';

describe('NAV_ITEMS', () => {
  it('exposes the three primary destinations in order', () => {
    expect(NAV_ITEMS.map((i) => i.tab)).toEqual(['dashboard', 'habits', 'projects']);
  });

  it('labels each destination for the nav UI', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Home', 'Habits', 'Projects']);
  });

  it('has a unique tab and an icon for every item', () => {
    const tabs = NAV_ITEMS.map((i) => i.tab);
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(NAV_ITEMS.every((i) => typeof i.icon === 'function' || typeof i.icon === 'object')).toBe(true);
  });
});
