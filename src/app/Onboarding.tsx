/**
 * §7 onboarding. Runs once, and is now a single screen.
 *
 * Everything it used to ask has been removed rather than answered elsewhere.
 * The twelve appearance questions went with the parametric figure; the age
 * went when the headline stopped naming a number. What is left is worth
 * keeping on its own: the app's rules are unusual enough that meeting them
 * cold would be confusing.
 *
 * The preview renders at the starting step, which is where day 1 genuinely
 * begins. Showing anything better would be a promise the app has not earned.
 */

import { en } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { LAYER_KEYS, type LayerSteps } from '../visual/layers';
import { START_STEP } from '../core/steps';

const START: LayerSteps = Object.fromEntries(LAYER_KEYS.map((k) => [k, START_STEP])) as LayerSteps;

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar steps={START} />
      </div>

      <div className="below">
        <section>
          <h2>{en['onboarding.closing.title']}</h2>
          <p>{en['onboarding.closing.line1']}</p>
          <p>{en['onboarding.closing.line2']}</p>
          <p>{en['onboarding.closing.line3']}</p>
          <p className="note">{en['onboarding.closing.iosNote']}</p>
          <div className="onboarding-nav">
            <button type="button" className="primary" onClick={onComplete}>
              {en['onboarding.closing.start']}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
