/**
 * Date arithmetic on bare "YYYY-MM-DD" strings.
 *
 * The app never stores timestamps (§5.2). A day is an opaque calendar label;
 * the only place a real clock touches the model is `dateKeyFor`, which decides
 * which label "now" belongs to.
 *
 * All arithmetic goes through UTC day numbers so that a local DST shift can
 * never make a day 23 or 25 hours long and skew a diff.
 */

export type DateKey = string; // "YYYY-MM-DD"

/** Day boundary is 04:00 local (§5.2): 02:30 still belongs to the previous day. */
export const DAY_BOUNDARY_HOUR = 4;

const MS_PER_DAY = 86_400_000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isDateKey(value: string): value is DateKey {
  return DATE_KEY_RE.test(value);
}

function parse(date: DateKey): { y: number; m: number; d: number } {
  if (!isDateKey(date)) throw new Error(`Not a date key: "${date}"`);
  return {
    y: Number(date.slice(0, 4)),
    m: Number(date.slice(5, 7)),
    d: Number(date.slice(8, 10)),
  };
}

/** Days since the Unix epoch. Stable, monotonic, DST-proof. */
export function toDayNumber(date: DateKey): number {
  const { y, m, d } = parse(date);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): DateKey {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function addDays(date: DateKey, n: number): DateKey {
  return fromDayNumber(toDayNumber(date) + n);
}

/** `a - b` in whole days. Positive when `a` is later. */
export function diffDays(a: DateKey, b: DateKey): number {
  return toDayNumber(a) - toDayNumber(b);
}

export function compareDates(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: DateKey, b: DateKey): DateKey {
  return a <= b ? a : b;
}

export function maxDate(a: DateKey, b: DateKey): DateKey {
  return a >= b ? a : b;
}

/** Inclusive range [from, to]. Empty when `to` precedes `from`. */
export function rangeDates(from: DateKey, to: DateKey): DateKey[] {
  const start = toDayNumber(from);
  const end = toDayNumber(to);
  const out: DateKey[] = [];
  for (let n = start; n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

/**
 * Which calendar day does this instant belong to, in local time,
 * with the boundary at `boundaryHour` (§5.2)?
 */
export function dateKeyFor(now: Date, boundaryHour: number = DAY_BOUNDARY_HOUR): DateKey {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - boundaryHour);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}-${pad2(shifted.getDate())}`;
}
