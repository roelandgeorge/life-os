/**
 * §9 step 4 — wires scores to parameters.
 *
 * `deriveParams` (visual/params.ts) has been pure and tested since step 3, but
 * nothing built the `Projection` it needs from real `AppState`: persisted
 * scores, today's preview, BODY, warmup, Full Day. This module is that bridge,
 * kept in `core` and free of the DOM/clock/store so the app shell (step 5) is
 * the only place that touches time or IndexedDB.
 *
 * `buildProjection` does not mutate or persist anything — advancing
 * `lastEvaluatedDate` and saving the result stays the caller's job (§2.3: run
 * the rollover at most once per day).
 */

import { computeBody, daysOfHistory, indexLogs, isFullDay, isWarmup, previewScores, scoresAsOf } from './scoring';
import type { AppState, Projection } from './types';
import type { DateKey } from './dates';

/**
 * §2.7 — the avatar renders `preview`, not `scores`: yesterday's persisted
 * value advanced by today's ticks, so a tick moves the figure within the
 * second it's made. `scores` is kept on the projection for screens (history)
 * that want the settled value instead.
 */
export function buildProjection(state: AppState, today: DateKey): Projection {
  const scores = scoresAsOf(state.logs, today);
  const preview = previewScores(state.logs, today);
  const todayLog = indexLogs(state.logs).get(today);

  return {
    scores,
    preview,
    body: computeBody(preview),
    fullDay: isFullDay(todayLog),
    warmup: isWarmup(state.logs, today),
    daysOfHistory: daysOfHistory(state.logs, today),
    projectionAge: state.profile.currentAge + 15,
  };
}
