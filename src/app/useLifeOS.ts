/**
 * The app shell's only bridge to the `Store` and the clock. Everything else —
 * scoring, the panel engine, the components — stays pure and untouched by
 * this file's concerns.
 *
 * §1.6 of docs/plan/phase-1.md: habit CRUD lives here, as thin wiring around
 * the pure helpers in `core/habits.ts` — this file generates ids and reads
 * the clock (so the model stays deterministic and testable), then saves.
 */

import { useEffect, useMemo, useState } from 'react';
import { catalogById } from '../core/catalog';
import { dateKeyFor, type DateKey } from '../core/dates';
import { isEditable } from '../core/due';
import {
  canAddCustomHabit,
  newCustomHabit,
  newHabitFromCatalog,
  removeHabit as removeHabitPure,
  toggleHabitTick,
  updateHabit as updateHabitPure,
  type HabitPatch,
} from '../core/habits';
import { buildProjection } from '../core/projection';
import { trimLogs } from '../core/scoring';
import type { AppState, DayLog, Projection, UserHabit } from '../core/types';
import type { Store } from '../store/types';

/** Either a catalogue item to copy in, or a title for a habit the user writes themselves. */
export type NewHabitSource = { catalogId: string } | { title: string };

export type LifeOS = {
  state: AppState | null;
  projection: Projection | null;
  today: DateKey;
  /** `on` defaults to today; §5.2 allows editing up to EDIT_WINDOW_DAYS back. */
  toggleHabit: (id: string, on?: DateKey) => void;
  addHabit: (source: NewHabitSource) => void;
  updateHabit: (id: string, patch: HabitPatch) => void;
  /** A soft delete — see `core/habits.ts`. */
  removeHabit: (id: string) => void;
  updateNotificationTime: (value: string | null) => void;
};

export function useLifeOS(store: Store): LifeOS {
  const [state, setState] = useState<AppState | null>(null);
  // Fixed for the life of this mount. A rollover that happens while the app
  // sits open is picked up the next time it's opened — reading the clock
  // again mid-session would risk a second update for the same day.
  const [today] = useState<DateKey>(() => dateKeyFor(new Date()));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // App only mounts Shell (and therefore this hook) once onboarding has
      // written an initial state, so this is never null here.
      const loaded = await store.load();
      if (!loaded) throw new Error('useLifeOS mounted before onboarding wrote a state');
      // Steps are recomputed from the log on every read, so opening the app
      // needs no catch-up pass — there is no accumulated value to advance.
      const hasToday = loaded.logs.some((l) => l.date === today);
      const withToday: AppState = hasToday
        ? loaded
        : {
            ...loaded,
            logs: trimLogs([...loaded.logs, { date: today, opened: true, ticks: {} }], today),
          };
      await store.save(withToday);
      if (!cancelled) setState(withToday);
    })();
    return () => {
      cancelled = true;
    };
  }, [store, today]);

  function toggleHabit(id: string, on: DateKey = today) {
    if (!isEditable(on, today)) return;
    setState((prev) => {
      if (!prev) return prev;
      const idx = prev.logs.findIndex((l) => l.date === on);
      const current: DayLog = idx >= 0 ? (prev.logs[idx] as DayLog) : { date: on, opened: true, ticks: {} };
      const next = toggleHabitTick(current, id);
      // A retroactive entry can land before existing ones, and every panel
      // calculation walks the log from the earliest date forward, so keep it sorted.
      const logs =
        idx >= 0
          ? prev.logs.map((l, i) => (i === idx ? next : l))
          : [...prev.logs, next].sort((a, b) => (a.date < b.date ? -1 : 1));
      const nextState: AppState = { ...prev, logs: trimLogs(logs, today) };
      void store.save(nextState);
      return nextState;
    });
  }

  function mutateHabits(fn: (habits: UserHabit[]) => UserHabit[]) {
    setState((prev) => {
      if (!prev) return prev;
      const next: AppState = { ...prev, habits: fn(prev.habits) };
      void store.save(next);
      return next;
    });
  }

  function addHabit(source: NewHabitSource) {
    // The id is generated here rather than in core so the model stays pure
    // and its tests stay deterministic.
    if ('catalogId' in source) {
      const item = catalogById(source.catalogId);
      if (!item) return;
      mutateHabits((habits) => [...habits, newHabitFromCatalog(item, crypto.randomUUID(), today)]);
      return;
    }
    mutateHabits((habits) =>
      canAddCustomHabit(habits) ? [...habits, newCustomHabit(crypto.randomUUID(), source.title, today)] : habits,
    );
  }

  function updateHabit(id: string, patch: HabitPatch) {
    mutateHabits((habits) => updateHabitPure(habits, id, patch));
  }

  function removeHabit(id: string) {
    mutateHabits((habits) => removeHabitPure(habits, id, today));
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
  return {
    state,
    projection,
    today,
    toggleHabit,
    addHabit,
    updateHabit,
    removeHabit,
    updateNotificationTime,
  };
}
