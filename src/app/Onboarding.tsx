/**
 * §7 onboarding. Runs once, before any score exists, and only builds the
 * fixed identity — the portrait shown here always renders at the neutral
 * midpoint params (score 50 everywhere), never a real score, so answering
 * "broad frame" is never confused with an achievement.
 */

import { useState } from 'react';
import { uniformScores } from '../core/domains';
import type { Profile } from '../core/types';
import { en, t } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { deriveParams } from '../visual/params';
import { DEFAULT_DRAFT, ONBOARDING_STEPS, type OnboardingStep } from './onboardingSteps';

const IDLE_PARAMS = deriveParams(uniformScores(50), 50);
const TOTAL_STEPS = ONBOARDING_STEPS.length + 1; // + the closing screen

export function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Profile>(DEFAULT_DRAFT);

  const step = index < ONBOARDING_STEPS.length ? (ONBOARDING_STEPS[index] as OnboardingStep) : null;

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar profile={draft} params={IDLE_PARAMS} />
      </div>

      <div className="below">
        <p className="progress">{t('onboarding.step', { n: index + 1, total: TOTAL_STEPS })}</p>

        {step ? <StepView step={step} draft={draft} onSet={set} /> : <Closing onStart={() => onComplete(draft)} />}

        {(index > 0 || step) && (
          <div className="onboarding-nav">
            {index > 0 && (
              <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                {en['onboarding.back']}
              </button>
            )}
            {step && (
              <button type="button" className="primary" onClick={() => setIndex((i) => i + 1)}>
                {en['onboarding.next']}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Also used by SettingsScreen's profile editor — one question at a time
 * there is the wizard's job, but the question rendering itself is shared. */
export function StepView({
  step,
  draft,
  onSet,
}: {
  step: OnboardingStep;
  draft: Profile;
  onSet: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}) {
  if (step.kind === 'age') {
    return (
      <section>
        <h2>{t(step.questionKey)}</h2>
        <p className="note">{t(step.noteKey)}</p>
        <input
          type="range"
          min={16}
          max={80}
          step={1}
          value={draft.currentAge}
          onChange={(e) => onSet('currentAge', Number(e.target.value))}
        />
        <p className="ageValue">{draft.currentAge}</p>
      </section>
    );
  }

  if (step.kind === 'swatch') {
    const currentIndex = draft[step.key] as number;
    return (
      <section>
        <h2>{t(step.questionKey)}</h2>
        <div className="swatches">
          {step.swatches.map((color, i) => (
            <button
              key={color}
              type="button"
              className={i === currentIndex ? 'swatch on' : 'swatch'}
              style={{ background: color }}
              onClick={() => onSet(step.key, i as never)}
              aria-label={`option ${i + 1}`}
            />
          ))}
        </div>
      </section>
    );
  }

  const current = String(draft[step.key]);
  return (
    <section>
      <h2>{t(step.questionKey)}</h2>
      {step.kind === 'choice' && step.noteKey && <p className="note">{t(step.noteKey)}</p>}
      <div className="chips">
        {step.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={current === opt.value ? 'on' : ''}
            onClick={() => onSet(step.key, (step.kind === 'boolean' ? opt.value === 'true' : opt.value) as never)}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </section>
  );
}

function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section>
      <h2>{en['onboarding.closing.title']}</h2>
      <p>{en['onboarding.closing.line1']}</p>
      <p>{en['onboarding.closing.line2']}</p>
      <p>{en['onboarding.closing.line3']}</p>
      <p className="note">{en['onboarding.closing.iosNote']}</p>
      <button type="button" className="primary start" onClick={onStart}>
        {en['onboarding.closing.start']}
      </button>
    </section>
  );
}
