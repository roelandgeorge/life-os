/**
 * Export/import envelope and its validation.
 *
 * Import is the one place untrusted data enters the app, and the user reaching
 * for it has usually just lost their cache — so it either restores cleanly or
 * fails loudly with a reason. It must never half-apply.
 */

import { isDateKey } from '../core/dates';
import { DOMAIN_KEYS, emptyTicks, type DomainKey } from '../core/domains';
import type { AppState, DayLog, DomainState, Profile } from '../core/types';
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
  // Appearance fields are enums the renderer already falls back on, so they are
  // carried through as-is rather than rejected — a stale swatch index should not
  // cost the user 400 days of history.
  return { ...(v as unknown as Profile), currentAge: age };
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

  return { date: v.date, opened: v.opened !== false, ticks };
}

function parseDomains(v: unknown): DomainState[] {
  const byKey = new Map<DomainKey, number>();
  if (Array.isArray(v)) {
    for (const entry of v) {
      if (!isRecord(entry) || typeof entry.key !== 'string') continue;
      if (!(DOMAIN_KEYS as readonly string[]).includes(entry.key)) continue;
      const score = requireNumber(entry.score, `domains.${entry.key}.score`);
      if (score < 0 || score > 100) throw new ImportError(`domains.${entry.key}.score is out of range`);
      byKey.set(entry.key as DomainKey, score);
    }
  }
  // Scores are recomputed from the log on the next advance anyway; these are a
  // starting point, so a domain absent from the export gets the cold-start 50.
  return DOMAIN_KEYS.map((key) => ({ key, score: byKey.get(key) ?? 50 }));
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

  const lastEvaluatedDate = state.lastEvaluatedDate;
  if (typeof lastEvaluatedDate !== 'string' || !isDateKey(lastEvaluatedDate)) {
    throw new ImportError('lastEvaluatedDate must be "YYYY-MM-DD"');
  }

  return {
    profile: parseProfile(state.profile),
    domains: parseDomains(state.domains),
    logs,
    lastEvaluatedDate,
    // Optional (added in §9 step 7) — an export from before it existed just
    // means notifications are off, not a corrupt file.
    notificationTime: typeof state.notificationTime === 'string' ? state.notificationTime : null,
  };
}
