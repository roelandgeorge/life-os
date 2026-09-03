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
import { MAX_STEP } from '../core/steps';
import type { AppState, Projection } from '../core/types';
import { diffDays, type DateKey } from '../core/dates';
import { en, t } from '../i18n/en';
import { taskLabel } from './taskLabels';
import {
  cadenceOf,
  customTaskDoneThisPeriod,
  customTaskName,
  customTaskStreak,
  isCustomTicked,
} from '../core/customTasks';
import { atRiskItems, type RiskItem } from '../core/atRisk';
import { daysLeftInPeriod as daysLeftIn } from '../core/periods';
import { getDomain } from '../core/domains';
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
  toggleCustom,
}: {
  state: AppState;
  projection: Projection;
  today: DateKey;
  toggle: (key: DomainKey, on?: DateKey) => void;
  toggleCustom: (id: string, on?: DateKey) => void;
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
            <h1 className="headline">{en['main.bestVersion.headline']}</h1>
            <p className="subhead">{en['main.bestVersion.subhead']}</p>
          </>
        ) : (
          <>
            <h1 className="headline">{en['main.headline']}</h1>
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

            <RiskWarning state={state} today={today} />

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
                      {taskLabel(d, state.taskLabels)}
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

            {(state.customTasks?.length ?? 0) > 0 && (
              <div className="custom-tasks">
                <h2 className="custom-heading">{en['main.custom.title']}</h2>
                {state.customTasks?.map((task) => {
                  const weekly = cadenceOf(task) === 'weekly';
                  const streak = customTaskStreak(state.logs, task, today);
                  return (
                    <label key={task.id} className={weekly ? 'checkin custom weekly' : 'checkin custom'}>
                      <input
                        type="checkbox"
                        checked={isCustomTicked(editingLog ?? undefined, task.id)}
                        onChange={() => toggleCustom(task.id, editing)}
                      />
                      <span className="label">
                        {customTaskName(task, en['settings.custom.unnamed'])}
                      </span>
                      <span className="lastHit">{customNote(state, task, today, streak)}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {editing !== today && (
              <p className="note editing-past">{t('main.editingPast', { day: dayLabel(editing, today) })}</p>
            )}
            <p className="note next-move">{nextMove(projection)}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Relative names for the near past, for prose. */
function dayLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  if (age === 0) return en['main.day.today'];
  if (age === 1) return en['main.day.yesterday'];
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Button captions: today is named, the days behind it are chevrons. Four
 * weekday names in a row read as a menu of equals, when in fact one of them
 * is where you almost always want to be.
 */
function pickerLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  return age === 0 ? en['main.day.today'] : '<'.repeat(age);
}

/**
 * §5.2's three-day window. Without it a day the app was not opened is an
 * unfixable -1, even when the thing was actually done — which would punish
 * forgetting to log rather than forgetting to live.
 *
 * Laid out oldest-to-newest so today sits on the right, where the thumb is
 * and where it is selected by default.
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
          title={dayLabel(day, today)}
          aria-label={dayLabel(day, today)}
          onClick={() => onPick(day)}
        >
          {pickerLabel(day, today)}
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
function nextMove(projection: Projection): string {
  const climbing = VISIBLE_DOMAINS.filter(
    (d) => projection.preview[d.key] > projection.steps[d.key],
  ).length;
  if (climbing > 0) return t('main.nextMove.gained', { count: climbing });

  return en['main.nextMove.waiting'];
}

/**
 * A weekly task shows the state of its week, not a day count: "done this
 * week" or how long is left. A daily task keeps the plain streak.
 */
function customNote(
  state: AppState,
  task: Parameters<typeof cadenceOf>[0],
  today: DateKey,
  streak: number,
): string {
  if (cadenceOf(task) !== 'daily') {
    if (customTaskDoneThisPeriod(state.logs, task, today)) {
      return streak > 1
        ? t('main.custom.streakWeeks', { weeks: streak })
        : en['main.custom.weeklyDone'];
    }
    const start = state.logs[0]?.date ?? today;
    const left = daysLeftIn(start, today, 7);
    // English has no plural machinery in `t`, and "1 day(s)" is worse than
    // two keys.
    return left <= 1 ? en['main.custom.weeklyLast'] : t('main.custom.weeklyLeft', { days: left });
  }
  return streak > 1 ? t('main.custom.streak', { days: streak }) : '';
}

/**
 * The one warning the app gives. A weekly thing changes nothing on screen for
 * six days and then drops a step — the only case where the picture alone is
 * not enough feedback in time to act on.
 */
function RiskWarning({ state, today }: { state: AppState; today: DateKey }) {
  const risks = atRiskItems(state.logs, VISIBLE_DOMAINS, state.customTasks, today);
  if (risks.length === 0) return null;

  const first = risks[0] as RiskItem;
  const text =
    risks.length === 1
      ? t('main.risk.one', { name: riskName(state, first), when: whenText(first.daysLeft) })
      : t('main.risk.many', { count: risks.length });

  return <p className="risk-warning">{text}</p>;
}

function riskName(state: AppState, risk: RiskItem): string {
  if (risk.kind === 'domain') return taskLabel(getDomain(risk.id as DomainKey), state.taskLabels);
  const task = state.customTasks?.find((t2) => t2.id === risk.id);
  return task ? customTaskName(task, en['settings.custom.unnamed']) : '';
}

function whenText(daysLeft: number): string {
  return daysLeft <= 1 ? en['main.risk.today'] : en['main.risk.tomorrow'];
}
