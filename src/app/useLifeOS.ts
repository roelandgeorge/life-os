/**
 * The app shell's only bridge to the `Store` and the clock. Everything else —
 * scoring, the parameter derivation, the components — stays pure and untouched
 * by this file's concerns.
 */

import { useEffect, useMemo, useState } from 'react';
import { dateKeyFor, type DateKey } from '../core/dates';
import { emptyTicks, type DomainKey } from '../core/domains';
import { buildProjection } from '../core/projection';
import { trimLogs } from '../core/scoring';
import type { AppState, DayLog, Profile, Projection } from '../core/types';
import type { Store } from '../store/types';

export type LifeOS = {
  state: AppState | null;
  projection: Projection | null;
  today: DateKey;
  todayLog: DayLog | null;
  toggle: (key: DomainKey) => void;
  updateProfile: (profile: Profile) => void;
  updateNotificationTime: (value: string | null) => void;
};

export function useLifeOS(store: Store): LifeOS {
  const [state, setState] = useState<AppState | null>(null);
  // Fixed for the life of this mount. A rollover that happens while the app
  // sits open is picked up the next time it's opened (§2.3) — reading the
  // clock again mid-session would risk a second update for the same day.
  const [today] = useState<DateKey>(() => dateKeyFor(new Date()));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // §7 — App only mounts MainScreen (and therefore this hook) once
      // onboarding has written an initial state, so this is never null here.
      const loaded = await store.load();
      if (!loaded) throw new Error('useLifeOS mounted before onboarding wrote a state');
      // Steps are recomputed from the log on every read, so opening the app
      // needs no catch-up pass — there is no accumulated value to advance.
      const advanced = loaded;
      // §2.2 — opening the app marks the day as not-amnestiable, even before
      // any box is ticked.
      const hasToday = advanced.logs.some((l) => l.date === today);
      const withToday: AppState = hasToday
        ? advanced
        : {
            ...advanced,
            logs: trimLogs([...advanced.logs, { date: today, opened: true, ticks: emptyTicks() }], today),
          };
      await store.save(withToday);
      if (!cancelled) setState(withToday);
    })();
    return () => {
      cancelled = true;
    };
  }, [store, today]);

  function toggle(key: DomainKey) {
    setState((prev) => {
      if (!prev) return prev;
      const idx = prev.logs.findIndex((l) => l.date === today);
      const current: DayLog = idx >= 0 ? (prev.logs[idx] as DayLog) : { date: today, opened: true, ticks: emptyTicks() };
      const next: DayLog = { ...current, opened: true, ticks: { ...current.ticks, [key]: !current.ticks[key] } };
      const logs = idx >= 0 ? prev.logs.map((l, i) => (i === idx ? next : l)) : [...prev.logs, next];
      const nextState: AppState = { ...prev, logs: trimLogs(logs, today) };
      void store.save(nextState);
      return nextState;
    });
  }

  function updateProfile(profile: Profile) {
    setState((prev) => {
      if (!prev) return prev;
      const next: AppState = { ...prev, profile };
      void store.save(next);
      return next;
    });
  }

  function updateNotificationTime(value: string | null) {
    setState((prev) => {
      if (!prev) return prev;
      const next: AppState = { ...prev, notificationTime: value };
      void store.save(next);
      return next;
    });
  }

  const projection = useMemo(() => (state ? buildProjection(state, today) : null), [state, today]);
  const todayLog = useMemo(() => state?.logs.find((l) => l.date === today) ?? null, [state, today]);

  return { state, projection, today, todayLog, toggle, updateProfile, updateNotificationTime };
}
