/**
 * §6 screen 2, adapted per §1.7 of docs/plan/phase-1.md: one step track per
 * panel (was one per fixed domain) plus the Full Day strip, plus a per-habit
 * strip for every habit on a periodic cadence — the generalised form of the
 * old per-custom-task strip, now covering every habit, not just the
 * domain-less ones.
 *
 * A step chart rather than a sparkline: the value only ever moves by whole
 * steps, and drawing it as a smooth line would imply an in-between the model
 * does not have.
 */

import { addDays, rangeDates, type DateKey } from '../core/dates';
import { PANEL_KEYS } from '../core/domains';
import { fullDayStrip } from '../core/scoring';
import { MAX_STEP, panelSteps } from '../core/steps';
import type { AppState, UserHabit } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { FullDayStrip } from '../ui/FullDayStrip';
import { byColor, cadencePeriodDays, effectiveColor, habitHitDates, habitTitle, isActiveOn } from '../core/habits';
import { completedPeriods, hitInRange, periodAt } from '../core/periods';

const HISTORY_DAYS = 90;

export function HistoryScreen({ state, today }: { state: AppState; today: DateKey }) {
  const days = rangeDates(addDays(today, -(HISTORY_DAYS - 1)), today);
  const strip = fullDayStrip(state.logs, state.habits, today, 30);
  const perDay = days.map((day) => panelSteps(state.logs, state.habits, day));
  // Matches scene.ts's own requires filter: hidden once the profile says no,
  // shown while it hasn't said — the picture and the history should never disagree.
  const panels = PANEL_KEYS.filter((p) => p !== 'partner' || state.profile?.partner?.wanted !== false);

  const tracked = state.habits.filter(
    (h) => h.removedDate === undefined && isActiveOn(h, today) && cadencePeriodDays(h.cadence) !== null,
  );
  const domainHabits = tracked.filter((h) => h.domain !== undefined);
  const ownHabits = byColor(tracked.filter((h) => h.domain === undefined));

  return (
    <div className="history-screen">
      <h1 className="headline">{en['history.title']}</h1>
      <p className="subhead">{t('history.subhead', { days: HISTORY_DAYS })}</p>

      <div className="sparklines">
        {panels.map((panel) => {
          const values = perDay.map((s) => s[panel]);
          const current = values[values.length - 1] ?? 0;
          return (
            <div className="sparkline-row" key={panel}>
              <div className="sparkline-header">
                <span className="label">{en[`panel.${panel}` as I18nKey]}</span>
                <span className="num">
                  {current + 1}/{MAX_STEP + 1}
                </span>
              </div>
              <StepTrack values={values} color="var(--accent)" />
            </div>
          );
        })}
      </div>

      <h2>{en['history.fullDay']}</h2>
      <FullDayStrip strip={strip} />

      {(domainHabits.length > 0 || ownHabits.length > 0) && (
        <>
          <h2>{en['habits.own']}</h2>
          <div className="sparklines">
            {[...domainHabits, ...ownHabits].map((habit) => (
              <HabitTrack key={habit.id} habit={habit} state={state} today={today} />
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
 * One cell per period, filled when that period had a tick. Cadence-agnostic:
 * a daily habit shows its last 30 days, anything on a longer cadence its
 * last 12 periods — the same rule either way is what makes a filled cell
 * always mean "satisfied", whatever the habit's own cadence is.
 */
function HabitTrack({ habit, state, today }: { habit: UserHabit; state: AppState; today: DateKey }) {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null) return null;
  const cells = period === 1 ? 30 : 12;

  const hits = habitHitDates(state.logs, habit.id);
  const newest = completedPeriods(habit.startDate, today, period);

  // Oldest on the left, the period in progress on the right.
  const filled = Array.from({ length: cells }, (_, i) => {
    const index = newest - (cells - 1 - i);
    if (index < 0) return false;
    return hitInRange(hits, periodAt(habit.startDate, index, period), today);
  });

  const color = effectiveColor(habit);

  return (
    <div className="sparkline-row">
      <div className="sparkline-header">
        <span className="label" style={color === undefined ? undefined : { color }}>
          {habitTitle(habit, en['settings.habits.title.placeholder'])}
        </span>
        <span className="num">{period === 1 ? en['history.habit.daily'] : t('history.habit.periods', { count: cells })}</span>
      </div>
      <div className="strip">
        {filled.map((on, i) => (
          <span key={i} className={on ? 'cell filled' : 'cell'} style={on && color !== undefined ? { background: color } : undefined} />
        ))}
      </div>
    </div>
  );
}
