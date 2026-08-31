/**
 * §6 screen 2. One sparkline per domain over 90 days, plus the Full Day
 * strip. Nothing else — "additional analytics turn this into an ordinary
 * tracker."
 */

import type { DateKey } from '../core/dates';
import { DOMAINS } from '../core/domains';
import { fullDayStrip, scoreHistory } from '../core/scoring';
import type { AppState } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { FullDayStrip } from './FullDayStrip';

const HISTORY_DAYS = 90;

export function HistoryScreen({ state, today }: { state: AppState; today: DateKey }) {
  const series = scoreHistory(state.logs, today, HISTORY_DAYS);
  const strip = fullDayStrip(state.logs, today, 30);

  return (
    <div className="history-screen">
      <h1 className="headline">{en['history.title']}</h1>
      <p className="subhead">{t('history.subhead', { days: HISTORY_DAYS })}</p>

      <div className="sparklines">
        {DOMAINS.map((d) => {
          const values = series.map((point) => point.scores[d.key]);
          const current = values[values.length - 1] ?? 0;
          return (
            <div className="sparkline-row" key={d.key}>
              <div className="sparkline-header">
                <span className="label" style={{ color: d.color }}>
                  {t(d.label as I18nKey)}
                </span>
                <span className="num">{Math.round(current)}</span>
              </div>
              <Sparkline values={values} color={d.color} />
            </div>
          );
        })}
      </div>

      <h2>{en['history.fullDay']}</h2>
      <FullDayStrip strip={strip} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 300;
  const h = 36;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - (v / 100) * h).toFixed(1)}`).join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
