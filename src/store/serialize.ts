/**
 * Export/import envelope and its validation.
 *
 * Import is the one place untrusted data enters the app, and the user reaching
 * for it has usually just lost their cache — so it either restores cleanly or
 * fails loudly with a reason. It must never half-apply.
 */

import { isDateKey } from '../core/dates';
import { DOMAIN_KEYS, emptyTicks, type DomainKey } from '../core/domains';
import { MAX_CUSTOM_TASKS, MAX_TASK_NAME_LENGTH } from '../core/customTasks';
import type { AppState, CustomTask, DayLog, Profile } from '../core/types';
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

function requireNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ImportError(`${path} must be a finite number`);
  }
  return v;
}

function parseProfile(v: unknown): Profile {
  if (!isRecord(v)) throw new ImportError('profile is missing');
  const age = requireNumber(v.currentAge, 'profile.currentAge');
  if (age < 0 || age > 120) throw new ImportError('profile.currentAge is out of range');
  // Any appearance fields from an export predating the artwork layers are
  // dropped rather than rejected — they no longer drive anything, and they
  // should not cost the user 400 days of history.
  return { currentAge: age };
}

/**
 * Renamed check-ins. Unknown keys and non-strings are dropped rather than
 * rejected: a label is cosmetic, and losing 400 days of history over one is
 * a bad trade.
 */
function parseTaskLabels(v: unknown): Partial<Record<DomainKey, string>> {
  const out: Partial<Record<DomainKey, string>> = {};
  if (!isRecord(v)) return out;
  for (const key of DOMAIN_KEYS) {
    const raw = v[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, 60);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

/**
 * User-added tasks. Anything malformed is dropped rather than rejected: these
 * are a side list, and losing the history over one bad row is a bad trade.
 */
function parseCustomTasks(v: unknown): CustomTask[] {
  if (!Array.isArray(v)) return [];
  const out: CustomTask[] = [];
  const seen = new Set<string>();
  for (const entry of v) {
    if (!isRecord(entry)) continue;
    const { id, name } = entry;
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    if (typeof name !== 'string') continue;
    seen.add(id);
    out.push({ id, name: name.trim().slice(0, MAX_TASK_NAME_LENGTH) });
    if (out.length >= MAX_CUSTOM_TASKS) break;
  }
  return out;
}

function parseCustomTicks(v: unknown, known: ReadonlySet<string>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isRecord(v)) return out;
  // Ticks for a task that no longer exists are dropped on import: they would
  // never be read again, and carrying them forward grows the file for nothing.
  for (const [id, value] of Object.entries(v)) {
    if (value === true && known.has(id)) out[id] = true;
  }
  return out;
}

function parseDayLog(v: unknown, i: number): DayLog {
  if (!isRecord(v)) throw new ImportError(`logs[${i}] is not an object`);
  if (typeof v.date !== 'string' || !isDateKey(v.date)) {
    throw new ImportError(`logs[${i}].date must be "YYYY-MM-DD"`);
  }
  const rawTicks = isRecord(v.ticks) ? v.ticks : {};
  const ticks = emptyTicks();
  // Unknown keys are dropped and missing keys default to false, so an export
  // from a build with a different domain set still imports.
  for (const key of DOMAIN_KEYS) ticks[key] = rawTicks[key] === true;

  return { date: v.date, opened: v.opened !== false, ticks, customTicks: {} };
}

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

  const state = parsed.state;
  if (!isRecord(state)) throw new ImportError('Export contains no state');

  const rawLogs = Array.isArray(state.logs) ? state.logs : [];
  const logs = rawLogs
    .map(parseDayLog)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // A duplicated date would double-count in the rolling window.
  const seen = new Set<string>();
  for (const log of logs) {
    if (seen.has(log.date)) throw new ImportError(`Duplicate log entry for ${log.date}`);
    seen.add(log.date);
  }

  const customTasks = parseCustomTasks(state.customTasks);
  const knownTaskIds = new Set(customTasks.map((task) => task.id));
  const rawById = new Map(
    rawLogs.filter(isRecord).map((l) => [String(l.date), l.customTicks]),
  );
  for (const log of logs) log.customTicks = parseCustomTicks(rawById.get(log.date), knownTaskIds);

  return {
    profile: parseProfile(state.profile),
    logs,
    customTasks,
    taskLabels: parseTaskLabels(state.taskLabels),
    // Optional — an export from before it existed just means notifications
    // are off, not a corrupt file.
    notificationTime: typeof state.notificationTime === 'string' ? state.notificationTime : null,
  };
}
