/**
 * The Profile controls (§4.5 of docs/plan/phase-4.md), shared by
 * `Onboarding.tsx` and `SettingsScreen.tsx`'s Profile section — a control met
 * during onboarding is literally the same control met again in Settings.
 * Each field takes a value and an `onChange` and holds no state of its own.
 *
 * Kept under `src/app/`, not `src/ui/`: every one of these already knows
 * about `Gender`/`Hair`/`DomainKey`, and keeping that model knowledge out of
 * the primitive layer is worth more than the file location.
 */

import { orderedDomains, type DomainKey } from '../core/domains';
import type { Gender, Hair } from '../core/types';
import { en, type I18nKey } from '../i18n/en';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';

export function GenderField({ value, onChange }: { value: Gender | undefined; onChange: (v: Gender) => void }) {
  return (
    <Select value={value ?? 'male'} onChange={(e) => onChange(e.target.value as Gender)}>
      <option value="male">{en['profile.gender.male']}</option>
      <option value="female">{en['profile.gender.female']}</option>
    </Select>
  );
}

export function HairField({ value, onChange }: { value: Hair | undefined; onChange: (v: Hair) => void }) {
  return (
    <Select value={value ?? 'blond'} onChange={(e) => onChange(e.target.value as Hair)}>
      <option value="blond">{en['profile.hair.blond']}</option>
      <option value="dark">{en['profile.hair.dark']}</option>
    </Select>
  );
}

export type PartnerValue = { wanted: boolean; gender?: Gender; hair?: Hair };

/**
 * `exactOptionalPropertyTypes` means a partner patch can never carry
 * `gender: undefined` to mean "leave it be" — an absent key is the only way
 * to say that. This keeps whichever half the caller didn't just change.
 */
function withPartner(current: PartnerValue | undefined, patch: PartnerValue): PartnerValue {
  const gender = patch.gender ?? current?.gender;
  const hair = patch.hair ?? current?.hair;
  return {
    wanted: patch.wanted,
    ...(gender !== undefined ? { gender } : {}),
    ...(hair !== undefined ? { hair } : {}),
  };
}

export function PartnerFields({
  value,
  onChange,
}: {
  value: PartnerValue | undefined;
  onChange: (v: PartnerValue) => void;
}) {
  const wanted = value?.wanted === true;

  return (
    <>
      <label className="notification-row">
        <Checkbox checked={wanted} onChange={(e) => onChange(withPartner(value, { wanted: e.target.checked }))} />
        <span>{en['profile.partner.wanted']}</span>
      </label>

      {wanted && (
        <div className="row">
          <GenderField
            value={value?.gender}
            onChange={(gender) => onChange(withPartner(value, { wanted: true, gender }))}
          />
          <HairField value={value?.hair} onChange={(hair) => onChange(withPartner(value, { wanted: true, hair }))} />
        </div>
      )}
    </>
  );
}

export function ChildrenField({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label className="notification-row">
      <Checkbox checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      <span>{en['profile.children']}</span>
    </label>
  );
}

function moved(order: readonly DomainKey[], key: DomainKey, dir: -1 | 1): readonly DomainKey[] {
  const i = order.indexOf(key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  const a = next[i] as DomainKey;
  const b = next[j] as DomainKey;
  next[i] = b;
  next[j] = a;
  return next;
}

/**
 * A checkbox plus small up/down buttons per domain — no drag library, which
 * keeps the "no UI library" rule intact and is keyboard-reachable for free.
 * Renders every domain, on ones first in the chosen order (`orderedDomains`),
 * so ticking one visibly moves it up rather than leaving it where it sat.
 */
export function DomainOrderField({
  order,
  onChange,
}: {
  order: readonly DomainKey[] | undefined;
  onChange: (order: readonly DomainKey[]) => void;
}) {
  const on = order ?? [];

  function toggle(key: DomainKey) {
    onChange(on.includes(key) ? on.filter((k) => k !== key) : [...on, key]);
  }

  return (
    <div className="domain-order">
      {orderedDomains(order).map((domain) => {
        const checked = on.includes(domain.key);
        const i = on.indexOf(domain.key);
        return (
          <div className="domain-order-row" key={domain.key}>
            <label>
              <Checkbox checked={checked} onChange={() => toggle(domain.key)} />
              <span>{en[domain.label as I18nKey]}</span>
            </label>
            {checked && (
              <div className="domain-order-controls">
                <Button
                  small
                  disabled={i === 0}
                  aria-label={en['profile.domains.up']}
                  onClick={() => onChange(moved(on, domain.key, -1))}
                >
                  ↑
                </Button>
                <Button
                  small
                  disabled={i === on.length - 1}
                  aria-label={en['profile.domains.down']}
                  onClick={() => onChange(moved(on, domain.key, 1))}
                >
                  ↓
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
