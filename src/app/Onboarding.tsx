/**
 * §7 onboarding, rebuilt as the decision tree phase 4 was waiting to build
 * (docs/plan/phase-4.md §4.6). A renderer over `steps(answers)`: this
 * component holds `Answers` plus an index into that array, and re-derives
 * the sequence — and clamps the index against it — on every render, because
 * going back and turning a domain off shortens the sequence underneath it.
 *
 * The avatar is recomputed every render from `profileFrom(answers)` rather
 * than a fixed constant, so the figure answers the appearance questions
 * live — the whole reason appearance goes first.
 */

import { useState, type ReactNode } from 'react';
import { catalogFor, startersFor } from '../core/catalog';
import { getDomain, PANEL_KEYS, type DomainKey, type PanelSteps } from '../core/domains';
import { catalogFilterFor } from '../core/habits';
import { profileFrom, steps as onboardingSteps, type Answers, type Step } from '../core/onboarding';
import { PERSONAS } from '../core/personas';
import { START_STEP } from '../core/steps';
import { en, t, type I18nKey } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { scene } from '../visual/scene';
import { HabitPicker, type PickerItem } from './HabitPicker';
import { DomainOrderField, GenderField, HairField } from './ProfileFields';
import { Button } from '../ui/Button';
import { Chip, ChipRow } from '../ui/Chip';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';

const START_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, START_STEP])) as PanelSteps;

export function Onboarding({ onComplete }: { onComplete: (answers: Answers) => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);

  const sequence = onboardingSteps(answers);
  const clampedIndex = Math.min(index, sequence.length - 1);
  const current: Step = sequence[clampedIndex] ?? { kind: 'closing' };

  const avatarScene = scene(START_STEPS, profileFrom(answers));

  function next() {
    setIndex((i) => Math.min(i + 1, sequence.length - 1));
  }
  function back() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  /**
   * Turning a domain on seeds it with its starter ids (once — a later
   * customisation is never overwritten); turning one off drops its picks
   * entirely, so a habit from a domain the user unchecked never sneaks into
   * the seeded state.
   */
  function updateDomains(nextDomains: readonly DomainKey[]) {
    setAnswers((prev) => {
      const filter = catalogFilterFor(profileFrom(prev));
      const picked: Record<string, readonly string[]> = { ...prev.picked };
      for (const key of nextDomains) {
        if (picked[key] === undefined) picked[key] = startersFor(key, filter).map((i) => i.id);
      }
      for (const key of Object.keys(picked)) {
        if (!nextDomains.includes(key as DomainKey)) delete picked[key];
      }
      return { ...prev, domains: nextDomains, picked };
    });
  }

  function togglePicked(domain: DomainKey, id: string) {
    setAnswers((prev) => {
      const ids = new Set(prev.picked?.[domain] ?? []);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, picked: { ...prev.picked, [domain]: [...ids] } };
    });
  }

  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar scene={avatarScene} />
      </div>

      <div className="below">
        {current.kind === 'gender' && (
          <StepSection title={en['onboarding.gender.title']} note={en['onboarding.gender.note']}>
            <GenderField value={answers.gender} onChange={(gender) => setAnswers((prev) => ({ ...prev, gender }))} />
          </StepSection>
        )}

        {current.kind === 'hair' && (
          <StepSection title={en['onboarding.hair.title']} note={en['onboarding.hair.note']}>
            <HairField value={answers.hair} onChange={(hair) => setAnswers((prev) => ({ ...prev, hair }))} />
          </StepSection>
        )}

        {current.kind === 'partner' && (
          <StepSection title={en['onboarding.partner.title']} note={en['onboarding.partner.note']}>
            <YesNo
              value={answers.partnerWanted}
              onChange={(partnerWanted) => setAnswers((prev) => ({ ...prev, partnerWanted }))}
              yesLabel={en['onboarding.partner.yes']}
              noLabel={en['onboarding.partner.no']}
            />
          </StepSection>
        )}

        {current.kind === 'partnerLooks' && (
          <StepSection title={en['onboarding.partnerLooks.title']} note={en['onboarding.partnerLooks.note']}>
            <div className="row">
              <GenderField
                value={answers.partnerGender}
                onChange={(partnerGender) => setAnswers((prev) => ({ ...prev, partnerGender }))}
              />
              <HairField
                value={answers.partnerHair}
                onChange={(partnerHair) => setAnswers((prev) => ({ ...prev, partnerHair }))}
              />
            </div>
          </StepSection>
        )}

        {current.kind === 'children' && (
          <StepSection title={en['onboarding.children.title']} note={en['onboarding.children.note']}>
            <YesNo
              value={answers.children}
              onChange={(children) => setAnswers((prev) => ({ ...prev, children }))}
              yesLabel={en['onboarding.children.yes']}
              noLabel={en['onboarding.children.no']}
            />
          </StepSection>
        )}

        {current.kind === 'domains' && (
          <StepSection title={en['onboarding.domains.title']} note={en['onboarding.domains.note']}>
            <DomainOrderField order={answers.domains} onChange={updateDomains} />
          </StepSection>
        )}

        {current.kind === 'starters' && (
          <StartersStep domain={current.domain} answers={answers} onToggle={togglePicked} />
        )}

        {current.kind === 'persona' && (
          <StepSection title={en['onboarding.persona.title']} note={en['onboarding.persona.note']}>
            <PersonaPicker value={answers.personaId} onChange={(personaId) => setAnswers((prev) => withPersona(prev, personaId))} />
          </StepSection>
        )}

        {current.kind === 'closing' && (
          <section className="closing">
            <SectionHeading>{en['onboarding.closing.title']}</SectionHeading>
            <p>{en['onboarding.closing.line1']}</p>
            <p>{en['onboarding.closing.line2']}</p>
            <p>{en['onboarding.closing.line3']}</p>
            <Note>{en['onboarding.closing.iosNote']}</Note>
            <div className="onboarding-nav">
              <Button variant="primary" onClick={() => onComplete(answers)}>
                {en['onboarding.closing.start']}
              </Button>
            </div>
          </section>
        )}

        {current.kind !== 'closing' && (
          <div className="onboarding-nav">
            <Button onClick={back} disabled={clampedIndex === 0}>
              {en['onboarding.nav.back']}
            </Button>
            <Note className="onboarding-step">
              {t('onboarding.nav.step', { current: clampedIndex + 1, total: sequence.length })}
            </Note>
            <Button variant="primary" onClick={next}>
              {en['onboarding.nav.next']}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One question's chrome: heading, note, the control, all inside a `<section>`. */
function StepSection({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      <Note>{note}</Note>
      {children}
    </section>
  );
}

function YesNo({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <ChipRow className="chips">
      <Chip on={value === true} onClick={() => onChange(true)}>
        {yesLabel}
      </Chip>
      <Chip on={value === false} onClick={() => onChange(false)}>
        {noLabel}
      </Chip>
    </ChipRow>
  );
}

function StartersStep({
  domain,
  answers,
  onToggle,
}: {
  domain: DomainKey;
  answers: Answers;
  onToggle: (domain: DomainKey, id: string) => void;
}) {
  const filter = catalogFilterFor(profileFrom(answers));
  const items = catalogFor(domain, filter);
  const picked = new Set(answers.picked?.[domain] ?? startersFor(domain, filter).map((i) => i.id));
  const pickerItems: PickerItem[] = items.map((item) => ({ item, checked: picked.has(item.id) }));

  return (
    <StepSection
      title={t('onboarding.starters.title', { domain: en[getDomain(domain).label as I18nKey] })}
      note={en['onboarding.starters.note']}
    >
      <HabitPicker items={pickerItems} onToggle={(id) => onToggle(domain, id)} />
    </StepSection>
  );
}

/** `exactOptionalPropertyTypes` means clearing a persona has to drop the key, not set it to `undefined`. */
function withPersona(answers: Answers, personaId: string | undefined): Answers {
  if (personaId === undefined) {
    const { personaId: _dropped, ...rest } = answers;
    return rest;
  }
  return { ...answers, personaId };
}

function PersonaPicker({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  const selected = PERSONAS.find((p) => p.id === value);
  return (
    <>
      <ChipRow className="chips">
        {PERSONAS.map((persona) => (
          <Chip key={persona.id} on={value === persona.id} onClick={() => onChange(value === persona.id ? undefined : persona.id)}>
            {persona.name}
          </Chip>
        ))}
      </ChipRow>
      {selected && <Note>{selected.blurb}</Note>}
    </>
  );
}
