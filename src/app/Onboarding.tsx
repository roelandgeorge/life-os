/**
 * The onboarding renderer (docs/onboarding/01-onboarding-spec.md), a thin
 * shell over `core/onboarding.ts`'s tree walk: this component holds
 * `Answers` and renders whatever `currentNode(answers)` resolves to. It
 * knows four things to draw — a button screen (`S0`), a question or
 * profile node with a static option list, a drawing-choice profile node
 * (`FIG_gender`/`FIG_hair`), and nothing at all once the tree reaches
 * `LAND`, which has no screen of its own (§6): reaching it seeds the
 * initial state and hands straight off to the real app.
 *
 * Copy comes straight off the tree data, not through `en.ts` — the same way
 * a catalogue item's own title is data, not i18n (see `en.ts`'s
 * `onboarding.tree.*` block, which exists as an audit trail, not a lookup
 * table).
 */

import { useEffect, useRef, useState } from 'react';
import {
  chooseDrawing,
  chooseOption,
  currentNode,
  advanceScreen,
  initialAnswers,
  profileFrom,
  visibleOptions,
  GENDER_VALUES,
  HAIR_VALUES,
  type Answers,
  type CurrentNode,
  type OptionJson,
} from '../core/onboarding';
import { PANEL_KEYS, type PanelKey, type PanelSteps } from '../core/domains';
import { START_STEP } from '../core/steps';
import type { Gender, Hair, Profile } from '../core/types';
import { Avatar } from '../visual/Avatar';
import { getSlot, scene as buildScene, type Rect, type Scene } from '../visual/scene';
import { Button } from '../ui/Button';

const START_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, START_STEP])) as PanelSteps;

/** Q1's option ids to the panel each names — "People" and "Money" read differently on screen than in code (§4.4). */
const Q1_PANEL: Readonly<Record<string, PanelKey>> = {
  body: 'body',
  head: 'head',
  people: 'network',
  partner: 'partner',
  money: 'wealth',
};

/** The box slot each panel's preview is cropped to — `head` and `partner` are overlays drawn on `body`/`network`. */
const PANEL_BOX: Readonly<Record<PanelKey, string>> = {
  body: 'body',
  head: 'body',
  network: 'network',
  partner: 'network',
  wealth: 'wealth',
};

const pct = (n: number, of: number) => `${(100 * n) / of}%`;

/** A crop of `scene` down to one panel's own box (plus its overlay, if any) — Q1's "panel drawing at step 2". */
function PanelThumb({ scene, panel }: { scene: Scene; panel: PanelKey }) {
  const boxSlot = PANEL_BOX[panel];
  const rect: Rect = getSlot(boxSlot).rect;
  const layers = scene.filter((s) => s.slot === boxSlot || getSlot(s.slot).panel === panel);
  return (
    <div className="onboarding-thumb" style={{ aspectRatio: `${rect.w} / ${rect.h}` }}>
      {layers.map((l) => (
        <img
          key={l.slot}
          src={l.src}
          alt=""
          draggable={false}
          style={{
            left: pct(l.rect.x - rect.x, rect.w),
            top: pct(l.rect.y - rect.y, rect.h),
            width: pct(l.rect.w, rect.w),
            height: pct(l.rect.h, rect.h),
          }}
        />
      ))}
    </div>
  );
}

function Lines({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p className={className} key={i}>
          {line}
        </p>
      ))}
    </>
  );
}

export function Onboarding({ onComplete }: { onComplete: (answers: Answers) => void }) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers());
  const current = currentNode(answers);
  const completed = useRef(false);

  useEffect(() => {
    if (current.id === 'LAND' && !completed.current) {
      completed.current = true;
      onComplete(answers);
    }
  }, [current.id, answers, onComplete]);

  const profile: Profile = profileFrom(answers);
  const avatarScene = buildScene(START_STEPS, profile);

  if (current.id === 'LAND') return null;

  return (
    <div className="main-screen onboarding">
      <div className="portrait">
        <Avatar scene={avatarScene} />
      </div>
      <div className="below">
        {current.header !== undefined && <Lines className="onboarding-header" text={current.header} />}
        <Lines className="onboarding-text" text={current.node.text} />

        {current.node.kind === 'screen' ? (
          <Button variant="primary" onClick={() => setAnswers(advanceScreen(answers, current))}>
            {current.node.button}
          </Button>
        ) : current.node.kind === 'profile' && current.node.optionsFrom === 'drawings' ? (
          <DrawingOptions
            current={current}
            profile={profile}
            onChoose={(value) => setAnswers(chooseDrawing(answers, current, value))}
          />
        ) : (
          <OptionList
            current={current}
            answers={answers}
            avatarScene={avatarScene}
            onChoose={(option) => setAnswers(chooseOption(answers, current, option))}
          />
        )}
      </div>
    </div>
  );
}

function OptionList({
  current,
  answers,
  avatarScene,
  onChoose,
}: {
  current: CurrentNode;
  answers: Answers;
  avatarScene: Scene;
  onChoose: (option: OptionJson) => void;
}) {
  return (
    <div className="onboarding-options">
      {visibleOptions(current, answers).map((option, i) => {
        const panel = current.id === 'Q1' && option.id !== undefined ? Q1_PANEL[option.id] : undefined;
        return (
          <button
            key={option.id ?? option.label ?? i}
            type="button"
            className={panel !== undefined ? 'onboarding-option' : 'onboarding-option onboarding-option-text'}
            onClick={() => onChoose(option)}
          >
            {panel !== undefined && <PanelThumb scene={avatarScene} panel={panel} />}
            <span className="onboarding-option-body">
              <span className="onboarding-option-label">{option.label}</span>
              {option.sub !== undefined && <span className="onboarding-option-sub">{option.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DrawingOptions({
  current,
  profile,
  onChoose,
}: {
  current: CurrentNode;
  profile: Profile;
  onChoose: (value: Gender | Hair) => void;
}) {
  if (current.node.kind !== 'profile') return null;
  const isGender = current.node.field === 'gender';
  const values: readonly (Gender | Hair)[] = isGender ? GENDER_VALUES : HAIR_VALUES;

  return (
    <div className="onboarding-drawings">
      {values.map((value) => {
        const candidate: Profile = isGender ? { ...profile, gender: value as Gender } : { ...profile, hair: value as Hair };
        return (
          <button key={value} type="button" className="onboarding-drawing" onClick={() => onChoose(value)}>
            <Avatar scene={buildScene(START_STEPS, candidate)} />
          </button>
        );
      })}
    </div>
  );
}
