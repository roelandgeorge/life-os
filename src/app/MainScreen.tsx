/**
 * §6 screen 1. The portrait fills the upper two-thirds; below it the age
 * line, then today's check-ins.
 *
 * Purely presentational — `Shell` owns the `useLifeOS` hook so History and
 * Settings can share the same live state without a second store read.
 *
 * The "best version" toggle is a deliberate reversal of §3's "no idealised
 * self for comparison"; see README.
 */

import { useState } from 'react';
import { VISIBLE_DOMAINS, type DomainKey } from '../core/domains';
import { editableDays, isDueToday, lastHit } from '../core/due';
import { fullDayStrip } from '../core/scoring';
import { daysLeftInPeriod, MAX_STEP } from '../core/steps';
import type { AppState, Projection } from '../core/types';
import { diffDays, type DateKey } from '../core/dates';
import { en, t, type I18nKey } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { LAYER_KEYS, layerSteps, type LayerSteps } from '../visual/layers';
import { FullDayStrip } from './FullDayStrip';

/** Every layer at its ceiling — the same scene, maximally adherent. */
const BEST: LayerSteps = Object.fromEntries(LAYER_KEYS.map((k) => [k, MAX_STEP])) as LayerSteps;

export function MainScreen({
  state,
  projection,
  today,
  toggle,
}: {
  state: AppState;
  projection: Projection;
  today: DateKey;
  toggle: (key: DomainKey, on?: DateKey) => void;
}) {
  const [showBest, setShowBest] = useState(false);
  // §5.2 — which day the check-ins are writing to. The picture always shows
  // today; filling in a past day changes today's standing, it does not
  // rewind the app to that day.
  const [editing, setEditing] = useState<DateKey>(today);
  const editingLog = state.logs.find((l) => l.date === editing) ?? null;
  const steps = showBest ? BEST : layerSteps(projection.preview);
  const strip = fullDayStrip(state.logs, today, 30);

  return (
    <div className="main-screen">
      <div className="portrait">
        <Avatar steps={steps} />
      </div>

      <div className="below">
        {showBest ? (
          <>
            <h1 className="headline">{t('main.bestVersion.headline', { age: projection.projectionAge })}</h1>
            <p className="subhead">{en['main.bestVersion.subhead']}</p>
          </>
        ) : (
          <>
            <h1 className="headline">{t('main.headline', { age: projection.projectionAge })}</h1>
            <p className="subhead">{en['main.subhead']}</p>
            {projection.fullDay && <p className="fullday">{en['main.fullDay']}</p>}
          </>
        )}

        <button type="button" className="best-version-toggle" onClick={() => setShowBest((v) => !v)}>
          {showBest ? en['main.bestVersion.hide'] : en['main.bestVersion.show']}
        </button>

        {!showBest && (
          <>
            <FullDayStrip strip={strip} />

            <DayPicker today={today} editing={editing} onPick={setEditing} />

            <div className="checkins">
              {VISIBLE_DOMAINS.map((d) => {
                const due = isDueToday(d, state.logs, today);
                const checked = editingLog?.ticks[d.key] ?? false;
                const last = lastHit(state.logs, d.key, today);
                return (
                  <label key={d.key} className={due ? 'checkin' : 'checkin collapsed'}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(d.key, editing)} />
                    <span className="label" style={{ color: d.color }}>
                      {t(d.label as I18nKey)}
                    </span>
                    <StepPips step={projection.preview[d.key]} color={d.color} />
                    {!due && (
                      <span className="lastHit">
                        {last ? t('main.lastHit', { date: last }) : en['main.neverHit']}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {editing !== today && (
              <p className="note editing-past">{t('main.editingPast', { day: dayLabel(editing, today) })}</p>
            )}
            <p className="note next-move">{nextMove(state, today, projection)}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Relative names for the near past; anything older is just its date. */
function dayLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  if (age === 0) return en['main.day.today'];
  if (age === 1) return en['main.day.yesterday'];
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * §5.2's three-day window. Without it a day the app was not opened is an
 * unfixable -1, even when the thing was actually done — which would punish
 * forgetting to log rather than forgetting to live.
 */
function DayPicker({
  today,
  editing,
  onPick,
}: {
  today: DateKey;
  editing: DateKey;
  onPick: (d: DateKey) => void;
}) {
  return (
    <div className="day-picker">
      {editableDays(today).map((day) => (
        <button
          key={day}
          type="button"
          className={day === editing ? 'on' : ''}
          onClick={() => onPick(day)}
        >
          {dayLabel(day, today)}
        </button>
      ))}
    </div>
  );
}

/** Five pips, one per artwork state, so the step is legible without the picture. */
function StepPips({ step, color }: { step: number; color: string }) {
  return (
    <span className="pips" aria-label={`step ${step + 1} of ${MAX_STEP + 1}`}>
      {Array.from({ length: MAX_STEP + 1 }, (_, i) => (
        <span key={i} className="pip" style={i <= step ? { background: color } : undefined} />
      ))}
    </span>
  );
}

/**
 * With five states, most days change nothing on screen — the one thing this
 * model costs versus the old continuous one. Naming what today's ticks have
 * already bought, or how soon the next period closes, keeps the daily action
 * worth taking.
 */
function nextMove(state: AppState, today: DateKey, projection: Projection): string {
  const climbing = VISIBLE_DOMAINS.filter(
    (d) => projection.preview[d.key] > projection.steps[d.key],
  ).length;
  if (climbing > 0) return t('main.nextMove.gained', { count: climbing });

  const soonest = VISIBLE_DOMAINS.map((d) => daysLeftInPeriod(state.logs, d, today)).sort(
    (a, b) => a - b,
  )[0];
  return soonest === undefined ? '' : t('main.nextMove.waiting', { days: soonest });
}
