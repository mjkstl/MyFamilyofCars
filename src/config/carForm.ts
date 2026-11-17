import type { CarStatus } from '@/types/database';

/** Rules for the Add / Edit car form, kept out of the screen so they can
 * be unit-tested without rendering it. */
export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_YEAR = 1885;

/** Newest first: most cars people add are recent-ish, and the sheet
 * opens scrolled to the current choice anyway. */
export const YEAR_OPTIONS: readonly string[] = Array.from({ length: CURRENT_YEAR + 1 - MIN_YEAR + 1 }, (_, i) => String(CURRENT_YEAR + 1 - i));

/** "How long…" only makes sense for cars the family actually had, and the
 * wording has to fit whether they still have it. Dream cars: no question. */
export function durationQuestion(status: CarStatus): string | null {
  if (status === 'dream') return null;
  if (status === 'current') return 'How long have you had it?';
  return 'How long was it in the family?';
}
