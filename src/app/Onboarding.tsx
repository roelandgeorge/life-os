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
import { scene } from '../visual/scene';
import { PANEL_KEYS, type PanelSteps } from '../core/domains';
import { START_STEP } from '../core/steps';
import { Button } from '../ui/Button';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';

const START_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, START_STEP])) as PanelSteps;
const START_SCENE = scene(START_STEPS, undefined);

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar scene={START_SCENE} />
      </div>

      <div className="below">
        <section>
          <SectionHeading>{en['onboarding.closing.title']}</SectionHeading>
          <p>{en['onboarding.closing.line1']}</p>
          <p>{en['onboarding.closing.line2']}</p>
          <p>{en['onboarding.closing.line3']}</p>
          <Note>{en['onboarding.closing.iosNote']}</Note>
          <div className="onboarding-nav">
            <Button variant="primary" onClick={onComplete}>
              {en['onboarding.closing.start']}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
