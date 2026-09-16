/**
 * Export/import envelope and its validation.
 *
 * Import is the one place untrusted data enters the app, and the user reaching
 * for it has usually just lost their cache — so it either restores cleanly or
 * fails loudly with a reason. It must never half-apply.
 *
 * A v1 export (schema 1) is parsed into the old shape and run through
 * `migrateV1ToV2` (§1.4); a v2 export is parsed directly.
 */

import { isDateKey } from '../core/dates';
import { DOMAIN_KEYS, type DomainKey } from '../core/domains';
import { isHexColor } from '../core/types';
import type { AppState, Cadence, DayLog, Profile, UserHabit } from '../core/types';
import { migrateV1ToV2, V1_DOMAIN_KEYS, type V1AppState, type V1CustomTask, type V1DayLog } from './migrate';
import { SCHEMA_VERSION, type Envelope } from './types';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function serialize(state: AppState): string {
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const MAX_HABIT_TITLE_LENGTH = 60;
const FALLBACK_START_DATE = '1970-01-01';

// ---------------------------------------------------------------------------
// v2 parsing
// ---------------------------------------------------------------------------

function parseCadence(v: unknown): Cadence {
  if (v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'situational' || v === 'once') return v;
  if (isRecord(v) && typeof v.everyDays === 'number' && Number.isFinite(v.everyDays) && v.everyDays > 0) {
    return { everyDays: v.everyDays };
  }
  return 'daily';
}

function parseImportance(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Malformed habits are dropped rather than rejected: losing 400 days of history over one bad row is a bad trade. */
function parseHabit(v: unknown): UserHabit | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== 'string' || v.id.length === 0) return null;
  if (typeof v.title !== 'string') return null;

  const habit: UserHabit = {
    id: v.id,
    title: v.title.trim().slice(0, MAX_HABIT_TITLE_LENGTH),
    cadence: parseCadence(v.cadence),
    importance: parseImportance(v.importance),
    startDate: typeof v.startDate === 'string' && isDateKey(v.startDate) ? v.startDate : FALLBACK_START_DATE,
  };
  if (typeof v.catalogId === 'string' && v.catalogId.length > 0) habit.catalogId = v.catalogId;
  if (typeof v.domain === 'string' && (DOMAIN_KEYS as readonly string[]).includes(v.domain)) {
    habit.domain = v.domain as DomainKey;
  }
  if (typeof v.removedDate === 'string' && isDateKey(v.removedDate)) habit.removedDate = v.removedDate;
  if (isHexColor(v.color)) habit.color = v.color;
  return habit;
}

function parseHabits(v: unknown): UserHabit[] {
  if (!Array.isArray(v)) return [];
  const out: UserHabit[] = [];
  const seen = new Set<string>();
  for (const entry of v) {
    const habit = parseHabit(entry);
    if (!habit || seen.has(habit.id)) continue;
    seen.add(habit.id);
    out.push(habit);
  }
  return out;
}

function parseDayLogV2(v: unknown, i: number, knownHabitIds: ReadonlySet<string>): DayLog {
  if (!isRecord(v)) throw new ImportError(`logs[${i}] is not an object`);
  if (typeof v.date !== 'string' || !isDateKey(v.date)) {
    throw new ImportError(`logs[${i}].date must be "YYYY-MM-DD"`);
  }
  const rawTicks = isRecord(v.ticks) ? v.ticks : {};
  const ticks: Record<string, true> = {};
  // Ticks for a habit that no longer exists are dropped: they would never be
  // read again, and carrying them forward grows the file for nothing.
  for (const [id, hit] of Object.entries(rawTicks)) {
    if (hit === true && knownHabitIds.has(id)) ticks[id] = true;
  }
  return { date: v.date, opened: v.opened !== false, ticks };
}

function parseProfile(v: unknown): Profile | undefined {
  if (!isRecord(v)) return undefined;
  const profile: Profile = {};
  if (v.gender === 'male' || v.gender === 'female') profile.gender = v.gender;
  if (typeof v.hair === 'string') profile.hair = v.hair;
  if (isRecord(v.partner) && typeof v.partner.wanted === 'boolean') {
    const partner: NonNullable<Profile['partner']> = { wanted: v.partner.wanted };
    if (v.partner.gender === 'male' || v.partner.gender === 'female') partner.gender = v.partner.gender;
    if (typeof v.partner.hair === 'string') partner.hair = v.partner.hair;
    profile.partner = partner;
  }
  if (typeof v.children === 'boolean') profile.children = v.children;
  if (Array.isArray(v.domainOrder)) {
    const order = v.domainOrder.filter(
      (d): d is DomainKey => typeof d === 'string' && (DOMAIN_KEYS as readonly string[]).includes(d),
    );
    if (order.length > 0) profile.domainOrder = order;
  }
  if (typeof v.personaId === 'string') profile.personaId = v.personaId;
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function parseV2(rawState: Record<string, unknown>): AppState {
  const habits = parseHabits(rawState.habits);
  const knownIds = new Set(habits.map((h) => h.id));

  const rawLogs = Array.isArray(rawState.logs) ? rawState.logs : [];
  const logs = rawLogs
    .map((l, i) => parseDayLogV2(l, i, knownIds))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const seenDates = new Set<string>();
  for (const log of logs) {
    if (seenDates.has(log.date)) throw new ImportError(`Duplicate log entry for ${log.date}`);
    seenDates.add(log.date);
  }

  const state: AppState = {
    schemaVersion: 2,
    logs,
    habits,
    notificationTime: typeof rawState.notificationTime === 'string' ? rawState.notificationTime : null,
  };
  const profile = parseProfile(rawState.profile);
  if (profile) state.profile = profile;
  return state;
}

// ---------------------------------------------------------------------------
// v1 parsing, feeding `migrateV1ToV2`
// ---------------------------------------------------------------------------

function parseTaskLabelsV1(v: unknown): NonNullable<V1AppState['taskLabels']> {
  const out: NonNullable<V1AppState['taskLabels']> = {};
  if (!isRecord(v)) return out;
  for (const key of V1_DOMAIN_KEYS) {
    const raw = v[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, 60);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

function parseCustomTasksV1(v: unknown): V1CustomTask[] {
  if (!Array.isArray(v)) return [];
  const out: V1CustomTask[] = [];
  const seen = new Set<string>();
  for (const entry of v) {
    if (!isRecord(entry)) continue;
    const { id, name } = entry;
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    if (typeof name !== 'string') continue;
    seen.add(id);
    const cadence = entry.cadence === 'weekly' ? 'weekly' : 'daily';
    const task: V1CustomTask = { id, name: name.trim().slice(0, MAX_HABIT_TITLE_LENGTH), cadence };
    if (isHexColor(entry.color)) task.color = entry.color;
    out.push(task);
  }
  return out;
}

function parseCustomTicksV1(v: unknown, known: ReadonlySet<string>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isRecord(v)) return out;
  for (const [id, value] of Object.entries(v)) {
    if (value === true && known.has(id)) out[id] = true;
  }
  return out;
}

function parseDayLogV1(v: unknown, i: number): V1DayLog {
  if (!isRecord(v)) throw new ImportError(`logs[${i}] is not an object`);
  if (typeof v.date !== 'string' || !isDateKey(v.date)) {
    throw new ImportError(`logs[${i}].date must be "YYYY-MM-DD"`);
  }
  const rawTicks = isRecord(v.ticks) ? v.ticks : {};
  const ticks: V1DayLog['ticks'] = {};
  for (const key of V1_DOMAIN_KEYS) ticks[key] = rawTicks[key] === true;
  return { date: v.date, opened: v.opened !== false, ticks, customTicks: {} };
}

function parseV1(rawState: Record<string, unknown>): V1AppState {
  const rawLogs = Array.isArray(rawState.logs) ? rawState.logs : [];
  const logs = rawLogs
    .map((l, i) => parseDayLogV1(l, i))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const seen = new Set<string>();
  for (const log of logs) {
    if (seen.has(log.date)) throw new ImportError(`Duplicate log entry for ${log.date}`);
    seen.add(log.date);
  }

  const customTasks = parseCustomTasksV1(rawState.customTasks);
  const knownTaskIds = new Set(customTasks.map((t) => t.id));
  const rawById = new Map(rawLogs.filter(isRecord).map((l) => [String(l.date), l.customTicks]));
  for (const log of logs) log.customTicks = parseCustomTicksV1(rawById.get(log.date), knownTaskIds);

  return {
    logs,
    customTasks,
    taskLabels: parseTaskLabelsV1(rawState.taskLabels),
    notificationTime: typeof rawState.notificationTime === 'string' ? rawState.notificationTime : null,
  };
}

// ---------------------------------------------------------------------------

export function deserialize(json: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError('Not valid JSON');
  }
  if (!isRecord(parsed)) throw new ImportError('Not a Life OS export');

  const version = parsed.schemaVersion;
  if (typeof version !== 'number') throw new ImportError('Not a Life OS export');
  if (version > SCHEMA_VERSION) {
    throw new ImportError(
      `This export is from a newer version (schema ${version}, this build reads ${SCHEMA_VERSION})`,
    );
  }

  const rawState = parsed.state;
  if (!isRecord(rawState)) throw new ImportError('Export contains no state');

  return version < SCHEMA_VERSION ? migrateV1ToV2(parseV1(rawState)) : parseV2(rawState);
}
