/**
 * One window for the whole app. History used to mix three: 90 days of panel
 * steps, 30 days of Full Day density, and a per-habit strip that was 30 cells
 * for a daily habit and 12 periods for anything else — so a filled cell meant
 * a different span on every row and each row had to carry a label saying
 * which.
 *
 * With one window the label is redundant: 28 days is 28 daily cells, 4 weekly
 * cells, 1 monthly cell, and a row's width is its own answer.
 */
export const HISTORY_DAYS = 28;

/** How many cells a habit on this period length gets inside the window. At least one, so a monthly habit still has a row. */
export function cellsForPeriod(periodDays: number): number {
  return Math.max(1, Math.round(HISTORY_DAYS / periodDays));
}
