/**
 * Bridges the log to the screen: `AppState` + a date in, `Projection` out.
 *
 * Pure — no DOM, no clock, no storage — so the app shell stays the only place
 * that touches time or IndexedDB.
 */

import type { DateKey } from './dates';
import { DOMAINS } from './domains';
import { isFullDay, indexLogs } from './scoring';
import { allSteps } from './steps';
import type { AppState, Projection } from './types';

/**
 * `preview` is what the avatar renders: the settled steps plus any hit in the
 * period still in progress, so ticking a box moves the picture in the same
 * second. `steps` is the settled value, for anything that should not jump
 * around mid-day.
 */
export function buildProjection(state: AppState, today: DateKey): Projection {
  return {
    steps: allSteps(state.logs, DOMAINS, today),
    preview: allSteps(state.logs, DOMAINS, today, { includeCurrentPeriod: true }),
    fullDay: isFullDay(indexLogs(state.logs).get(today)),
  };
}
