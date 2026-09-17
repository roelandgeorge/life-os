/**
 * Habits: the one shape §1.3 replaced `DomainTicks` and `CustomTask` with.
 * Everything here is pure and habit-shaped — cadence arithmetic, streaks,
 * the CRUD `app/useLifeOS.ts` wires to the store (§1.6).
 *
 * Replaces the old `core/customTasks.ts`; its streak/colour logic survives
 * here, generalised from `CustomTask` to `UserHabit`.
 */

import { diffDays, type DateKey } from './dates';
import type { CatalogFilter, CatalogItem, Cadence, Requirement } from './catalog';
import { DOMAINS, getDomain, type DomainKey } from './domains';
import { completedPeriods, currentPeriod, hitInRange, periodAt } from './periods';
import type { DayLog, Profile, UserHabit } from './types';

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

/** Catalogue ids ticked at least once — gates a habit-id `requires` entry on the discovery screens. */
export function completedCatalogIds(habits: readonly UserHabit[], logs: readonly DayLog[]): Set<string> {
  const out = new Set<string>();
  for (const habit of habits) {
    if (habit.catalogId !== undefined && habitHitDates(logs, habit.id).size > 0) out.add(habit.catalogId);
  }
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

/**
 * The profile-to-catalogue bridge: `has` is set the moment any of the
 * questions it can answer has an answer, so a "no" hides a requiring item
 * just as a "yes" reveals one — only a profile that has answered *none of
 * them* leaves `has` undefined, which `catalogFor` reads as unknown and
 * filters permissively. That is the one case a record written before
 * onboarding existed needs.
 */
export function catalogFilterFor(profile: Profile | undefined): CatalogFilter {
  const filter: CatalogFilter = {};
  if (profile?.gender !== undefined) filter.audience = profile.gender;

  const answered =
    profile?.partner?.wanted !== undefined ||
    profile?.children !== undefined ||
    profile?.hair !== undefined ||
    profile?.gym !== undefined ||
    profile?.employed !== undefined ||
    profile?.selfEmployed !== undefined;

  if (answered) {
    const has: Requirement[] = [];
    if (profile?.partner?.wanted === true) has.push('partner');
    if (profile?.partner?.wanted === false) has.push('single');
    if (profile?.children === true) has.push('children');
    if (profile?.hair !== undefined && profile.hair !== 'none') has.push('hair');
    if (profile?.gym === true) has.push('gym');
    if (profile?.employed === true) has.push('employed');
    if (profile?.selfEmployed === true) has.push('self-employed');
    filter.has = has;
  }
  return filter;
}

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

/**
 * The three choices a user-written habit's weight offers on screen
 * (docs/onboarding/04-revisions.md §9) — never a free 1-5 number.
 */
export const CUSTOM_IMPORTANCE: readonly { value: number; key: 'important' | 'medium' | 'notImportant' }[] = [
  { value: 5, key: 'important' },
  { value: 3, key: 'medium' },
  { value: 1, key: 'notImportant' },
];

export type NewCustomHabitInput = {
  title: string;
  importance: number;
  cadence: Cadence;
  /** Pre-filled from the domain catalogue screen the form was opened from. */
  domain: DomainKey;
  emoji?: string;
};

/**
 * A habit the user writes themselves, opened from a domain's catalogue
 * screen (§9) — it always carries that domain, unlike the old bare "add a
 * habit of your own" field. `color` is left unset: no colour picker is
 * offered here, `emoji` is the one filing mark this form gives instead.
 */
export function newCustomHabit(id: string, input: NewCustomHabitInput, startDate: DateKey): UserHabit {
  const habit: UserHabit = {
    id,
    title: input.title.slice(0, MAX_HABIT_TITLE_LENGTH),
    domain: input.domain,
    cadence: input.cadence,
    importance: input.importance,
    startDate,
  };
  if (input.emoji !== undefined) habit.emoji = input.emoji;
  return habit;
}

export function canAddCustomHabit(habits: readonly UserHabit[]): boolean {
  const activeCustom = habits.filter((h) => h.catalogId === undefined && h.removedDate === undefined);
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
  /** `null` clears the filing emoji. */
  emoji?: string | null;
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
    if (patch.emoji !== undefined) {
      if (patch.emoji === null) delete next.emoji;
      else next.emoji = patch.emoji;
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
