/**
 * §9 step 3's debug harness.
 *
 * Three drive modes, because the renderer has three independent input axes and
 * each needs isolating:
 *   scores    — the seven domains through `deriveParams`; verifies the §4 formulas
 *   params    — the 26 parameters written directly; verifies §9's "independently
 *               drivable" requirement, which is the gate before wiring anything
 *   identity  — the §7 profile; verifies that it is the same person in every state
 */

import { useMemo, useState } from 'react';
import { DOMAINS, uniformScores, type DomainKey, type DomainScores } from '../core/domains';
import { computeBody } from '../core/scoring';
import type { Profile } from '../core/types';
import { Avatar } from '../visual/Avatar';
import {
  deriveParams,
  getParamSpec,
  PARAM_GROUPS,
  PARAM_KEYS,
  PARAM_SPECS,
  type AvatarParams,
  type ParamGroup,
  type ParamKey,
} from '../visual/params';

const GROUP_LABELS: Record<ParamGroup, string> = {
  faceAndLight: '§4.1 SLEEP — face and light',
  massAndDecay: '§4.2 FOOD — mass and decay',
  buildAndPosture: '§4.3 SPORT — build and posture',
  aging: '§4.4 aging overlay — BODY',
  clothingAndRoom: '§4.5 ORDER — clothing and room',
  environment: '§4.6 environment layers',
  fullDay: '§4.7 Full Day',
};

export const DEFAULT_PROFILE: Profile = {
  currentAge: 35,
  bodyFrame: 'average',
  height: 'average',
  skinTone: 2,
  hairColor: 1,
  hairType: 'straight',
  hairLength: 'short',
  hairline: 'full',
  facialHair: 'stubble',
  eyeColor: 0,
  glasses: false,
  faceShape: 'oval',
  presentation: 'masculine',
};

const CHOICES = {
  bodyFrame: ['slight', 'average', 'broad'],
  height: ['short', 'average', 'tall'],
  hairType: ['straight', 'wavy', 'curly', 'coily'],
  hairLength: ['shaved', 'short', 'medium', 'long'],
  hairline: ['full', 'slight', 'receding', 'baldCrown'],
  facialHair: ['none', 'stubble', 'shortBeard', 'fullBeard', 'moustache'],
  faceShape: ['oval', 'round', 'square', 'long'],
  presentation: ['masculine', 'feminine', 'neutral'],
} as const;

type Mode = 'scores' | 'params' | 'identity';

export function DebugScreen() {
  const [mode, setMode] = useState<Mode>('scores');
  const [scores, setScores] = useState<DomainScores>(() => uniformScores(50));
  const [fullDay, setFullDay] = useState(false);
  const [manual, setManual] = useState<AvatarParams>(() => deriveParams(uniformScores(50), 50));
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  const body = useMemo(() => computeBody(scores), [scores]);
  const derived = useMemo(() => deriveParams(scores, body, { fullDay }), [scores, body, fullDay]);
  const params = mode === 'params' ? manual : derived;

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="debug">
      <aside className="stage">
        <Avatar profile={profile} params={params} />
        <p className="disclaimer">
          This is you at {profile.currentAge + 15}. If your current average holds.
        </p>
      </aside>

      <main className="controls">
        <header>
          <h1>Parameter debug</h1>
          <div className="modes">
            <button className={mode === 'scores' ? 'on' : ''} onClick={() => setMode('scores')} type="button">
              Scores
            </button>
            <button
              className={mode === 'params' ? 'on' : ''}
              onClick={() => {
                setManual(derived);
                setMode('params');
              }}
              type="button"
            >
              Parameters
            </button>
            <button className={mode === 'identity' ? 'on' : ''} onClick={() => setMode('identity')} type="button">
              Identity
            </button>
          </div>
        </header>

        {mode === 'scores' && (
          <section>
            <h2>Domain scores</h2>
            {DOMAINS.map((d) => (
              <Slider
                key={d.key}
                label={d.key}
                hint={`r = ${d.r.n}/${d.r.per} per day · W = ${d.W}`}
                min={0}
                max={100}
                step={0.5}
                value={scores[d.key]}
                color={d.color}
                onChange={(v) => setScores((prev) => ({ ...prev, [d.key as DomainKey]: v }))}
              />
            ))}
            <div className="row">
              <span className="derived">
                BODY = <strong>{body.toFixed(1)}</strong>
              </span>
              <label className="check">
                <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} />
                Full Day (§4.7)
              </label>
              <button type="button" onClick={() => setScores(uniformScores(0))}>
                All 0
              </button>
              <button type="button" onClick={() => setScores(uniformScores(50))}>
                All 50
              </button>
              <button type="button" onClick={() => setScores(uniformScores(100))}>
                All 100
              </button>
            </div>
            <h2>Derived parameters</h2>
            <ReadOnlyParams params={derived} />
          </section>
        )}

        {mode === 'params' &&
          PARAM_GROUPS.map((group) => (
            <section key={group}>
              <h2>{GROUP_LABELS[group]}</h2>
              {PARAM_SPECS.filter((s) => s.group === group).map((spec) => (
                <Slider
                  key={spec.key}
                  label={spec.key}
                  hint={spec.formula}
                  min={spec.min}
                  max={spec.max}
                  step={(spec.max - spec.min) / 200}
                  value={manual[spec.key]}
                  extremes={[spec.atMin, spec.atMax]}
                  onChange={(v) => setManual((prev) => ({ ...prev, [spec.key as ParamKey]: v }))}
                />
              ))}
            </section>
          ))}

        {mode === 'identity' && (
          <section>
            <h2>§7 fixed identity — never touched by scores</h2>
            <Slider
              label="currentAge"
              hint={`projection age ${profile.currentAge + 15}`}
              min={16}
              max={80}
              step={1}
              value={profile.currentAge}
              onChange={(v) => set('currentAge', Math.round(v))}
            />
            {(Object.keys(CHOICES) as (keyof typeof CHOICES)[]).map((key) => (
              <div className="slider" key={key}>
                <label>
                  <span className="name">{key}</span>
                </label>
                <div className="chips">
                  {CHOICES[key].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={profile[key] === opt ? 'on' : ''}
                      onClick={() => set(key, opt as never)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Slider label="skinTone" min={0} max={5} step={1} value={profile.skinTone} onChange={(v) => set('skinTone', v)} />
            <Slider label="hairColor" min={0} max={6} step={1} value={profile.hairColor} onChange={(v) => set('hairColor', v)} />
            <Slider label="eyeColor" min={0} max={4} step={1} value={profile.eyeColor} onChange={(v) => set('eyeColor', v)} />
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={profile.glasses} onChange={(e) => set('glasses', e.target.checked)} />
                glasses
              </label>
              <button type="button" onClick={() => setProfile(DEFAULT_PROFILE)}>
                Reset
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ReadOnlyParams({ params }: { params: AvatarParams }) {
  return (
    <table className="readout">
      <tbody>
        {PARAM_KEYS.map((key) => {
          const spec = getParamSpec(key);
          const t = (params[key] - spec.min) / (spec.max - spec.min);
          return (
            <tr key={key}>
              <th>{key}</th>
              <td>
                <div className="bar">
                  <span style={{ width: `${t * 100}%` }} />
                </div>
              </td>
              <td className="num">{params[key].toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  color,
  extremes,
  onChange,
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  color?: string;
  extremes?: [string, string];
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider">
      <label>
        <span className="name" style={color ? { color } : undefined}>
          {label}
        </span>
        <span className="num">{value.toFixed(2)}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <code>{hint}</code>}
      {extremes && (
        <p className="extremes">
          <span>{extremes[0]}</span>
          <span>{extremes[1]}</span>
        </p>
      )}
    </div>
  );
}
