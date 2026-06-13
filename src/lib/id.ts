import type { ID } from '../types';

/** Generate a fresh UUID v4 identifier for a persisted entity. */
export function newId(): ID {
  return crypto.randomUUID();
}
