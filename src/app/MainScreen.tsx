/**
 * §6 screen 1. The portrait fills the upper two-thirds; below it the age
 * line, then today's checkboxes. A domain not due today collapses to its
 * last-hit date instead of a full row.
 *
 * Purely presentational — `Shell` owns the `useLifeOS` hook so History and
 * Settings can share the same live state without a second store read.
 */

import { DOMAINS, type DomainKey } from '../core/domains';
import { isDueToday, lastHit } from '../core/due';
import { fullDayStrip } from '../core/scoring';
import type { AppState, DayLog, Projection } from '../core/types';
import type { DateKey } from '../core/dates';
import { en, t, type I18nKey } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { deriveParams } from '../visual/params';
import { FullDayStrip } from './FullDayStrip';
import { useAnimatedParams } from './useAnimatedParams';

export function MainScreen({
  state,
  projection,
  today,
  todayLog,
  toggle,
}: {
  state: AppState;
  projection: Projection;
  today: DateKey;
  todayLog: DayLog | null;
  toggle: (key: DomainKey) => void;
}) {
  const target = deriveParams(projection.preview, projection.body, { fullDay: projection.fullDay });
  const params = useAnimatedParams(target);
  const strip = fullDayStrip(state.logs, today, 30);

  return (
    <div className="main-screen">
      <div className="portrait">
        <Avatar profile={state.profile} params={params} />
      </div>

      <div className="below">
        <h1 className="headline">{t('main.headline', { age: projection.projectionAge })}</h1>
        <p className="subhead">{en['main.subhead']}</p>
        {projection.warmup && <p className="warmup">{t('main.warmup', { days: projection.daysOfHistory })}</p>}
        {projection.fullDay && <p className="fullday">{en['main.fullDay']}</p>}

        <FullDayStrip strip={strip} />

        <div className="checkins">
          {DOMAINS.map((d) => {
            const due = isDueToday(d, state.logs, today);
            const checked = todayLog?.ticks[d.key as DomainKey] ?? false;
            const last = lastHit(state.logs, d.key, today);
            return (
              <label key={d.key} className={due ? 'checkin' : 'checkin collapsed'}>
                <input type="checkbox" checked={checked} onChange={() => toggle(d.key)} />
                <span className="label" style={{ color: d.color }}>
                  {t(d.label as I18nKey)}
                </span>
                {!due && <span className="lastHit">{last ? t('main.lastHit', { date: last }) : en['main.neverHit']}</span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
