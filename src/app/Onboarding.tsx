/**
 * A renderer over the tree (docs/onboarding/01-onboarding-spec.md,
 * docs/onboarding/04-revisions.md) — a plain (nodeId, Answers) state machine.
 * There is no back button and no Next: every option is a single tap that
 * both answers the question and advances, matching "one thumb, standing up"
 * and 00-brief.md's rule against adding chrome the spec doesn't ask for.
 *
 * `start`/`terminal` let the same component serve three independent entries
 * (docs/onboarding/04-revisions.md §5): the full run (`App.tsx`, S0 to LAND),
 * "Redo what you work on" (Q1 to FIG_gender, the figure untouched) and "Redo
 * the figure" (FIG_gender to LAND, the work-on panels untouched) — Settings
 * holds both. `onComplete` fires the moment the chosen option's own
 * resolution reaches `terminal`, before that node is ever rendered: LAND and
 * the FIG_gender hand-off are hooks for the caller, not screens of their own.
 */

import { useState, type ReactNode } from 'react';
import {
  advanceScreen,
  choose,
  chooseDrawing,
  profileFrom,
  step,
  type Advance,
  type Answers,
  type StepOption,
} from '../core/onboarding';
import { PANEL_KEYS, type PanelSteps } from '../core/domains';
import { START_STEP } from '../core/steps';
import type { Gender, Hair, Profile } from '../core/types';
import { en } from '../i18n/en';
import { Avatar } from '../visual/Avatar';
import { scene } from '../visual/scene';
import { Button } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';

const MID_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, START_STEP])) as PanelSteps;

/** Q1's own panel vocabulary against the slot `scene()` resolves for a preview — "people" and "money" are what Q1 calls the network and wealth panels. */
const Q1_SLOT: Record<string, string> = {
  body: 'body',
  head: 'head',
  people: 'network',
  partner: 'partner',
  money: 'wealth',
};

function previewSrc(slot: string, profile: Profile | undefined): string | undefined {
  return scene(MID_STEPS, profile).find((s) => s.slot === slot)?.src;
}

const GENDER_VALUES: readonly Gender[] = ['male', 'female'];
const HAIR_VALUES: readonly Hair[] = ['blond', 'dark', 'none'];

const GENDER_LABEL: Record<Gender, 'profile.gender.male' | 'profile.gender.female'> = {
  male: 'profile.gender.male',
  female: 'profile.gender.female',
};
const HAIR_LABEL: Record<Hair, 'profile.hair.blond' | 'profile.hair.dark' | 'profile.hair.none'> = {
  blond: 'profile.hair.blond',
  dark: 'profile.hair.dark',
  none: 'profile.hair.none',
};

export function Onboarding({
  start,
  terminal,
  onComplete,
}: {
  start: string;
  terminal: string;
  onComplete: (answers: Answers) => void;
}) {
  const [nodeId, setNodeId] = useState(start);
  const [answers, setAnswers] = useState<Answers>({});

  const current = step(nodeId, answers);
  const profile = profileFrom(answers);
  // "One thumb, standing up: nothing below the fold" (00-brief.md) rules out
  // the full 64% portrait on a question with several options — S0 and the
  // two drawing questions are the only steps where seeing the figure is the
  // point, so every other step gets a small strip instead.
  const compact = current.kind !== 'screen' && current.optionsFrom !== 'drawings';

  function advance(result: Advance) {
    // The terminal node is a hand-off, never rendered — LAND is the app's
    // real main screen and FIG_gender is where "redo what you work on" stops
    // short of touching the figure.
    if (result.nextId === terminal) {
      onComplete(result.answers);
      return;
    }
    setAnswers(result.answers);
    setNodeId(result.nextId);
  }

  return (
    <div className={compact ? 'main-screen onboarding compact' : 'main-screen onboarding'}>
      <div className="portrait">
        <Avatar scene={scene(MID_STEPS, profile)} />
      </div>

      <div className="below">
        {current.kind === 'screen' && (
          <section>
            {current.text.split('\n').map((line, i) => (
              <p className={i === 0 ? 'onboarding-lede' : 'note'} key={i}>
                {line}
              </p>
            ))}
            <Button variant="primary" className="onboarding-go" onClick={() => advance(advanceScreen(nodeId, answers))}>
              {current.button}
            </Button>
          </section>
        )}

        {current.kind !== 'screen' && current.optionsFrom === 'drawings' && current.field === 'gender' && (
          <DrawingQuestion text={current.text}>
            {GENDER_VALUES.map((value) => (
              <DrawingTile
                key={value}
                label={en[GENDER_LABEL[value]]}
                src={previewSrc('body', { ...profile, gender: value })}
                onPick={() => advance(chooseDrawing(nodeId, answers, value))}
              />
            ))}
          </DrawingQuestion>
        )}

        {current.kind !== 'screen' && current.optionsFrom === 'drawings' && current.field === 'hair' && (
          <DrawingQuestion text={current.text}>
            {HAIR_VALUES.map((value) => (
              <DrawingTile
                key={value}
                label={en[HAIR_LABEL[value]]}
                src={previewSrc('head', { ...profile, hair: value })}
                onPick={() => advance(chooseDrawing(nodeId, answers, value))}
              />
            ))}
          </DrawingQuestion>
        )}

        {current.kind !== 'screen' && current.optionsFrom !== 'drawings' && (
          <OptionsQuestion
            nodeId={nodeId}
            text={current.text}
            options={current.options ?? []}
            {...(nodeId === 'Q1' ? { panelPreview: (id: string) => previewSrc(Q1_SLOT[id] ?? '', undefined) } : {})}
            onPick={(index) => advance(choose(nodeId, answers, index))}
          />
        )}
      </div>
    </div>
  );
}

function DrawingQuestion({ text, children }: { text: string; children: ReactNode }) {
  return (
    <section>
      <SectionHeading>{text}</SectionHeading>
      <div className="drawing-picker">{children}</div>
    </section>
  );
}

function DrawingTile({ label, src, onPick }: { label: string; src: string | undefined; onPick: () => void }) {
  return (
    <button type="button" className="drawing-tile" aria-label={label} onClick={onPick}>
      {src ? <img src={src} alt="" draggable={false} /> : <span className="drawing-tile-fallback">{label}</span>}
    </button>
  );
}

function OptionsQuestion({
  nodeId,
  text,
  options,
  panelPreview,
  onPick,
}: {
  nodeId: string;
  text: string;
  options: readonly StepOption[];
  panelPreview?: (id: string) => string | undefined;
  onPick: (index: number) => void;
}) {
  const cards = nodeId === 'Q1' ? options.filter((o) => o.id !== 'none') : [];
  const rows = nodeId === 'Q1' ? options.filter((o) => o.id === 'none') : options;

  return (
    <section>
      <SectionHeading>{text}</SectionHeading>

      {cards.length > 0 && (
        <div className="panel-cards">
          {cards.map((option) => {
            const src = panelPreview?.(option.id ?? '');
            return (
              <button type="button" key={option.index} className="panel-card" onClick={() => onPick(option.index)}>
                <span className="panel-card-art">{src && <img src={src} alt="" draggable={false} />}</span>
                <span className="panel-card-text">
                  <span className="panel-card-label">{option.label}</span>
                  {option.sub && <span className="note panel-card-sub">{option.sub}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <div className="onboarding-rows">
          {rows.map((option) => (
            <Button key={option.index} className="onboarding-row" onClick={() => onPick(option.index)}>
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
