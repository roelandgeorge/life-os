/**
 * §6 screen 2. One step-track per domain over 90 days, plus the Full Day
 * strip. Nothing else — "additional analytics turn this into an ordinary
 * tracker."
 *
 * A step chart rather than a sparkline: the value only ever moves by whole
 * steps, and drawing it as a smooth line would imply an in-between the model
 * does not have.
 */

import { addDays, rangeDates, type DateKey } from '../core/dates';
import { VISIBLE_DOMAINS } from '../core/domains';
import { fullDayStrip } from '../core/scoring';
import { domainStep, MAX_STEP } from '../core/steps';
import type { AppState } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { FullDayStrip } from './FullDayStrip';
import { cadenceOf, customHitDates, customTaskName, periodDaysOf } from '../core/customTasks';
import { hitInRange, periodAt, completedPeriods } from '../core/periods';
import type { CustomTask } from '../core/types';

const HISTORY_DAYS = 90;

export function HistoryScreen({ state, today }: { state: AppState; today: DateKey }) {
  const days = rangeDates(addDays(today, -(HISTORY_DAYS - 1)), today);
  const strip = fullDayStrip(state.logs, today, 30);

  return (
    <div className="history-screen">
      <h1 className="headline">{en['history.title']}</h1>
      <p className="subhead">{t('history.subhead', { days: HISTORY_DAYS })}</p>

      <div className="sparklines">
        {VISIBLE_DOMAINS.map((d) => {
          const values = days.map((day) => domainStep(state.logs, d, day));
          const current = values[values.length - 1] ?? 0;
          return (
            <div className="sparkline-row" key={d.key}>
              <div className="sparkline-header">
                <span className="label" style={{ color: d.color }}>
                  {t(d.label as I18nKey)}
                </span>
                <span className="num">
                  {current + 1}/{MAX_STEP + 1}
                </span>
              </div>
              <StepTrack values={values} color={d.color} />
            </div>
          );
        })}
      </div>

      <h2>{en['history.fullDay']}</h2>
      <FullDayStrip strip={strip} />

      {(state.customTasks?.length ?? 0) > 0 && (
        <>
          <h2>{en['history.custom']}</h2>
          <div className="sparklines">
            {state.customTasks?.map((task) => (
              <CustomTrack key={task.id} task={task} state={state} today={today} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StepTrack({ values, color }: { values: number[]; color: string }) {
  const w = 300;
  const h = 36;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v: number) => h - 2 - (v / MAX_STEP) * (h - 4);

  // Horizontal run, then vertical jump: the value holds all day and changes
  // at a period boundary, and the drawing should say exactly that.
  const d = values
    .map((v, i) => (i === 0 ? `M 0 ${y(v)}` : `H ${(i * step).toFixed(1)} V ${y(v).toFixed(1)}`))
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="miter" />
    </svg>
  );
}

/**
 * One cell per period, filled when that period had a tick — days for a daily
 * task, weeks for a weekly one. Same rule either way, which is what makes the
 * two readable side by side: a filled cell always means "satisfied".
 */
function CustomTrack({
  task,
  state,
  today,
}: {
  task: CustomTask;
  state: AppState;
  today: DateKey;
}) {
  const weekly = cadenceOf(task) === 'weekly';
  const period = periodDaysOf(task);
  const cells = weekly ? 12 : 30;

  const start = state.logs[0]?.date;
  const hits = customHitDates(state.logs, task.id);
  const newest = start === undefined ? -1 : completedPeriods(start, today, period);

  // Oldest on the left, the period in progress on the right.
  const filled = Array.from({ length: cells }, (_, i) => {
    const index = newest - (cells - 1 - i);
    if (start === undefined || index < 0) return false;
    return hitInRange(hits, periodAt(start, index, period), today);
  });

  return (
    <div className="sparkline-row">
      <div className="sparkline-header">
        <span className="label">{customTaskName(task, en['settings.custom.unnamed'])}</span>
        <span className="num">
          {weekly ? en['history.custom.weekly'] : en['history.custom.daily']}
        </span>
      </div>
      <div className="strip">
        {filled.map((on, i) => (
          <span key={i} className={on ? 'cell filled' : 'cell'} />
        ))}
      </div>
    </div>
  );
}
