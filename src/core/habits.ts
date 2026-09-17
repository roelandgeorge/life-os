/**
 * Habits: the one shape §1.3 replaced `DomainTicks` and `CustomTask` with.
 * Everything here is pure and habit-shaped — cadence arithmetic, streaks,
 * the CRUD `app/useLifeOS.ts` wires to the store (§1.6).
 *
 * Replaces the old `core/customTasks.ts`; its streak/colour logic survives
 * here, generalised from `CustomTask` to `UserHabit`.
 */

import { diffDays, type DateKey } from './dates';
import type { Cadence, CatalogItem } from './catalog';
import { DOMAINS, getDomain, type DomainKey } from './domains';
import { completedPeriods, currentPeriod, hitInRange, periodAt } from './periods';
import type { DayLog, UserHabit } from './types';

export const MAX_HABIT_TITLE_LENGTH = 60;
/** A cap on self-written (domain-less) habits — catalogue habits are not capped. */
export const MAX_CUSTOM_HABITS = 10;

/**
 * The line between "part of the daily rhythm" and "a commitment on a long
 * cycle". `due.ts` and `atRisk.ts` both need it and must agree: the lapse
 * warning only nags about the long ones, only the short ones can have a rest
 * day, and only the short ones have to be ticked for a day to count as finished.
 */
export const WEEKLY_PERIOD_DAYS = 7;

/**
 * The recurring period a cadence implies, in days — or `null` for a cadence
 * with no periodic notion at all (`situational`, `once`). `monthly` has a
 * period (30 days) for due-ness and streaks, and — since phase 4 — for
 * `drivesPanel` below too: they are no longer different questions.
 */
export function cadencePeriodDays(cadence: Cadence): number | null {
  if (cadence === 'daily') return 1;
  if (cadence === 'weekly') return 7;
  if (cadence === 'monthly') return 30;
  if (cadence === 'situational' || cadence === 'once') return null;
  return cadence.everyDays;
}

/**
 * Whether a habit on this cadence can move a panel (§1.5 of docs/plan/phase-1.md,
 * reversed by phase 4 — see README's "Departures from the spec"): daily,
 * weekly, monthly and every-N-days all count towards the picture;
 * `situational`/`once` are reminders and milestones, not a recurring
 * commitment, and stay excluded.
 */
export function drivesPanel(cadence: Cadence): boolean {
  return cadence !== 'situational' && cadence !== 'once';
}

/** A habit still asks something of the user on `date` — before removal, on or after it started. */
export function isActiveOn(habit: UserHabit, date: DateKey): boolean {
  return date >= habit.startDate && (habit.removedDate === undefined || date < habit.removedDate);
}

export function habitHitDates(logs: readonly DayLog[], habitId: string): Set<DateKey> {
  const out = new Set<DateKey>();
  for (const log of logs) if (log.ticks[habitId]) out.add(log.date);
  return out;
}

/** Blank falls back to a placeholder rather than rendering a nameless row. */
export function habitTitle(habit: UserHabit, fallback: string): string {
  const trimmed = habit.title.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function isHabitTicked(log: DayLog | undefined, habitId: string): boolean {
  return log?.ticks[habitId] === true;
}

export function toggleHabitTick(log: DayLog, habitId: string): DayLog {
  const ticks = { ...log.ticks };
  if (ticks[habitId]) delete ticks[habitId];
  else ticks[habitId] = true;
  return { ...log, ticks };
}

// ---------------------------------------------------------------------------
// Streaks — consecutive satisfied periods, counting back from the one in
// progress. The current period only counts once it has a hit, so a young,
// still-empty period never reads as a broken streak.
// ---------------------------------------------------------------------------

export function habitStreak(logs: readonly DayLog[], habit: UserHabit, today: DateKey): number {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null || diffDays(today, habit.startDate) < 0) return 0;

  const hits = habitHitDates(logs, habit.id);
  let index = completedPeriods(habit.startDate, today, period);
  if (!hitInRange(hits, periodAt(habit.startDate, index, period), today)) index -= 1;

  let streak = 0;
  while (index >= 0 && hitInRange(hits, periodAt(habit.startDate, index, period), today)) {
    streak++;
    index--;
  }
  return streak;
}

/** Days since the most recent tick, or null if it has never been ticked. */
export function daysSinceHabitHit(logs: readonly DayLog[], habitId: string, today: DateKey): number | null {
  let last: DateKey | null = null;
  for (const log of logs) {
    if (log.ticks[habitId] && (last === null || log.date > last)) last = log.date;
  }
  return last === null ? null : diffDays(today, last);
}

/** The day the current period runs out — the last chance to keep the streak. */
export function habitDeadline(habit: UserHabit, today: DateKey): DateKey {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null) return today;
  return currentPeriod(habit.startDate, today, period).to;
}

/** Whether the period in progress has already been satisfied. */
export function habitDoneThisPeriod(logs: readonly DayLog[], habit: UserHabit, today: DateKey): boolean {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null) return false;
  return hitInRange(habitHitDates(logs, habit.id), currentPeriod(habit.startDate, today, period), today);
}

// ---------------------------------------------------------------------------
// Colour — a filing label, never a link back to a domain (see README).
// ---------------------------------------------------------------------------

export const HABIT_COLOR_PALETTE: readonly { color: string; label: string }[] = DOMAINS.map((d) => ({
  color: d.color,
  label: d.label,
}));

/** The colour a habit reads as: its own, or its domain's when it has one and no override. */
export function effectiveColor(habit: UserHabit): string | undefined {
  if (habit.color !== undefined) return habit.color;
  if (habit.domain !== undefined) return getDomain(habit.domain).color;
  return undefined;
}

/**
 * Palette order first (so a coloured habit sorts near the domain it reads
 * as belonging to), then creation order; uncoloured, domain-less habits last.
 */
export function byColor(habits: readonly UserHabit[]): UserHabit[] {
  const order = HABIT_COLOR_PALETTE.map((p) => p.color);
  const rank = (habit: UserHabit) => {
    const color = effectiveColor(habit);
    if (color === undefined) return order.length + 1;
    const i = order.indexOf(color);
    return i < 0 ? order.length : i;
  };
  return habits
    .map((habit, i) => ({ habit, i }))
    .sort((a, b) => rank(a.habit) - rank(b.habit) || a.i - b.i)
    .map(({ habit }) => habit);
}

// ---------------------------------------------------------------------------
// CRUD (§1.6) — pure array transforms; `app/useLifeOS.ts` is the only place
// that generates ids and calls the clock, then saves the result.
// ---------------------------------------------------------------------------

/** Own habits default to weight 3 — the middle of the scale, same reasoning as the v1 migration. */
export const DEFAULT_IMPORTANCE = 3;

export function newHabitFromCatalog(item: CatalogItem, id: string, startDate: DateKey): UserHabit {
  return {
    id,
    catalogId: item.id,
    title: item.title,
    domain: item.domain,
    cadence: item.cadence,
    importance: item.importance,
    startDate,
  };
}

export function newCustomHabit(id: string, title: string, startDate: DateKey): UserHabit {
  return {
    id,
    title: title.slice(0, MAX_HABIT_TITLE_LENGTH),
    cadence: 'daily',
    importance: DEFAULT_IMPORTANCE,
    startDate,
  };
}

export function canAddCustomHabit(habits: readonly UserHabit[]): boolean {
  const activeCustom = habits.filter((h) => h.domain === undefined && h.removedDate === undefined);
  return activeCustom.length < MAX_CUSTOM_HABITS;
}

export type HabitPatch = {
  title?: string;
  importance?: number;
  cadence?: Cadence;
  /** `null` clears back to no override (a domain habit falls back to its domain's colour). */
  color?: string | null;
  /** `null` clears back to a domain-less habit. */
  domain?: DomainKey | null;
};

export function updateHabit(habits: readonly UserHabit[], id: string, patch: HabitPatch): UserHabit[] {
  return habits.map((h) => {
    if (h.id !== id) return h;
    const next: UserHabit = { ...h };
    if (patch.title !== undefined) next.title = patch.title.slice(0, MAX_HABIT_TITLE_LENGTH);
    if (patch.importance !== undefined) next.importance = patch.importance;
    if (patch.cadence !== undefined) next.cadence = patch.cadence;
    if (patch.color !== undefined) {
      if (patch.color === null) delete next.color;
      else next.color = patch.color;
    }
    if (patch.domain !== undefined) {
      if (patch.domain === null) delete next.domain;
      else next.domain = patch.domain;
    }
    return next;
  });
}

/** A soft delete: history and streaks up to `removedDate` stay correct. */
export function removeHabit(habits: readonly UserHabit[], id: string, removedDate: DateKey): UserHabit[] {
  return habits.map((h) => (h.id === id ? { ...h, removedDate } : h));
}
