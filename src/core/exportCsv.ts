/**
 * The log as one flat table, for analysis outside the app (Power BI, Power
 * Query, a spreadsheet). One row per calendar day per habit active that
 * day, with the habit's attributes repeated on every row so it loads as a
 * single fact table. The JSON export stays the backup: this is never read
 * back in.
 */

import { rangeDates, type DateKey } from './dates';
import { getDomain } from './domains';
import { habitTitle, isActiveOn } from './habits';
import type { AppState, Cadence, DayLog } from './types';

export const CSV_COLUMNS = [
  'date',
  'habit_id',
  'catalog_id',
  'title',
  'domain',
  'panels',
  'cadence',
  'importance',
  'order',
  'ticked',
  'opened',
] as const;

function cadenceText(cadence: Cadence): string {
  return typeof cadence === 'string' ? cadence : `every_${cadence.everyDays}_days`;
}

/** RFC 4180: quote a field holding a comma, a quote or a line break, doubling inner quotes. */
function field(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Every calendar day from the first log to the last, not only the days that
 * have one: a day the app was never opened is a real miss to the step
 * model, so it appears with `ticked` and `opened` both 0. Without those rows
 * any adherence measure built on this file overstates.
 */
export function logCsv(state: AppState): string {
  const lines = [CSV_COLUMNS.join(',')];
  const first = state.logs[0];
  const last = state.logs[state.logs.length - 1];

  if (first && last) {
    const byDate = new Map<DateKey, DayLog>(state.logs.map((l) => [l.date, l]));
    const habits = [...state.habits].sort((a, b) => a.order - b.order);
    for (const date of rangeDates(first.date, last.date)) {
      const log = byDate.get(date);
      for (const habit of habits) {
        if (!isActiveOn(habit, date)) continue;
        lines.push(
          [
            date,
            habit.id,
            habit.catalogId ?? '',
            habitTitle(habit, ''),
            habit.domain ?? '',
            habit.domain === undefined ? '' : getDomain(habit.domain).panels.join('|'),
            cadenceText(habit.cadence),
            habit.importance,
            habit.order,
            log?.ticks[habit.id] ? 1 : 0,
            log ? 1 : 0,
          ]
            .map(field)
            .join(','),
        );
      }
    }
  }

  // The BOM is for Excel, which otherwise reads UTF-8 as the system code
  // page and mangles emoji and accents. Power BI ignores it.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
