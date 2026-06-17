/**
 * Time-unit helpers for the habit timer (D5). A quantified habit whose unit
 * denotes a duration gets a start/stop timer; on stop the elapsed time is
 * converted to the habit's unit and accrued into the day's value. Detection
 * and conversion are kept pure here so they're easy to test.
 */

/** Unit labels treated as hours when accruing timer elapsed time. */
const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours']);
/** Unit labels treated as minutes when accruing timer elapsed time. */
const MINUTE_UNITS = new Set(['m', 'min', 'mins', 'minute', 'minutes']);

/** Trim + lowercase a unit label for case-insensitive matching. */
function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

/** Whether a quantified habit's unit denotes a duration (hours or minutes). */
export function isTimeUnit(unit: string): boolean {
  const u = normalizeUnit(unit);
  return HOUR_UNITS.has(u) || MINUTE_UNITS.has(u);
}

/** Whether a time unit is expressed in hours (vs minutes). */
export function isHourUnit(unit: string): boolean {
  return HOUR_UNITS.has(normalizeUnit(unit));
}

/**
 * Convert an elapsed duration in milliseconds to a habit's time unit (hours
 * or minutes). Returns `0` for non-time units. Fractional by design — a
 * 90-second run is `1.5` minutes or `0.025` hours.
 */
export function elapsedToUnit(elapsedMs: number, unit: string): number {
  if (!isTimeUnit(unit)) return 0;
  const minutes = Math.max(0, elapsedMs) / 60_000;
  return isHourUnit(unit) ? minutes / 60 : minutes;
}

/** Format an elapsed duration (ms) as `H:MM:SS` past an hour, else `M:SS`. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Format a logged amount for display: integers as-is, fractions to ≤2 dp. */
export function formatAmount(value: number): string {
  return Number.isInteger(value) ? `${value}` : `${Math.round(value * 100) / 100}`;
}
