/**
 * Shared scalar aliases used across the Stride domain model.
 *
 * These are intentionally plain `string`/`number` aliases (not branded types)
 * so they serialize transparently into IndexedDB via Dexie while still
 * documenting intent at call sites.
 */

/** Stable unique identifier (UUID v4 string) for a persisted entity. */
export type ID = string;

/** Full ISO-8601 timestamp, e.g. `2026-06-13T09:30:00.000Z`. */
export type ISODateString = string;

/**
 * A local calendar day key in `YYYY-MM-DD` form (no time, no timezone).
 * Streaks and the weekly grid are computed in the user's local timezone, so
 * completions are bucketed by this local day key rather than a UTC instant.
 */
export type DayKey = string;
