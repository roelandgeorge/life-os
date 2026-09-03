/**
 * §7 onboarding. Runs once.
 *
 * The twelve appearance questions are gone with the parametric figure — the
 * artwork is a drawing of one specific person now, so there is nothing to
 * configure. Age remains because §3 needs it: the projection is always +15.
 *
 * The preview renders at the starting step, which is where day 1 genuinely
 * begins. Showing anything better here would be a promise the app has not
 * yet earned.
 */

import { useState } from 'react';
import type { Profile } from '../core/types';
import { en, t } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { LAYER_KEYS, type LayerSteps } from '../visual/layers';
import { START_STEP } from '../core/steps';

/** Where day 1 actually begins, so onboarding promises nothing it will not show. */
const START: LayerSteps = Object.fromEntries(LAYER_KEYS.map((k) => [k, START_STEP])) as LayerSteps;

const DEFAULT_AGE = 30;

export function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [age, setAge] = useState(DEFAULT_AGE);
  const [closing, setClosing] = useState(false);

  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar steps={START} />
      </div>

      <div className="below">
        {closing ? (
          <section>
            <h2>{en['onboarding.closing.title']}</h2>
            <p>{en['onboarding.closing.line1']}</p>
            <p>{en['onboarding.closing.line2']}</p>
            <p>{t('onboarding.closing.line3', { age: age + 15 })}</p>
            <p className="note">{en['onboarding.closing.iosNote']}</p>
            <div className="onboarding-nav">
              <button type="button" onClick={() => setClosing(false)}>
                {en['onboarding.back']}
              </button>
              <button type="button" className="primary" onClick={() => onComplete({ currentAge: age })}>
                {en['onboarding.closing.start']}
              </button>
            </div>
          </section>
        ) : (
          <section>
            <h2>{en['onboarding.currentAge.question']}</h2>
            <p className="note">{en['onboarding.currentAge.note']}</p>
            <input
              type="range"
              min={16}
              max={80}
              step={1}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
            <p className="ageValue">{age}</p>
            <div className="onboarding-nav">
              <button type="button" className="primary" onClick={() => setClosing(true)}>
                {en['onboarding.next']}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
