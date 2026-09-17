/**
 * The onboarding decision tree, as data (§4.3 of docs/plan/phase-4.md). Pure:
 * no DOM, no clock, no storage, in the same sense as the rest of `core/`.
 *
 * `app/Onboarding.tsx` holds an index into `steps(answers)` and renders
 * whatever step sits there; this module only decides what the sequence is,
 * what `Profile` it describes so far, and — once the user finishes — what
 * `AppState` it seeds.
 */

import type { DateKey } from './dates';
import type { DomainKey } from './domains';
import { catalogById } from './catalog';
import { newHabitFromCatalog } from './habits';
import type { AppState, Gender, Hair, Profile, UserHabit } from './types';

export type Answers = {
  gender?: Gender;
  hair?: Hair;
  partnerWanted?: boolean;
  partnerGender?: Gender;
  partnerHair?: Hair;
  children?: boolean;
  /** The domains turned on, in the order the user chose them. */
  domains?: readonly DomainKey[];
  /** Catalogue ids picked, per domain key. */
  picked?: Readonly<Record<string, readonly string[]>>;
};

export type Step =
  | { kind: 'gender' }
  | { kind: 'hair' }
  | { kind: 'partner' }
  | { kind: 'partnerLooks' }
  | { kind: 'children' }
  | { kind: 'domains' }
  | { kind: 'starters'; domain: DomainKey };

/**
 * The whole visible sequence, given the answers so far. `partnerLooks` only
 * appears once a partner is actually wanted, and one `starters` step is
 * appended per domain the `domains` step turned on, in the order it was
 * turned on — a `starters` step carries its domain rather than an index, so
 * nothing downstream has to branch on one. The last of those is the end of
 * the tree: turning no domain on at all leaves `domains` as the final step.
 */
export function steps(answers: Answers): readonly Step[] {
  const out: Step[] = [{ kind: 'gender' }, { kind: 'hair' }, { kind: 'partner' }];
  if (answers.partnerWanted === true) out.push({ kind: 'partnerLooks' });
  out.push({ kind: 'children' }, { kind: 'domains' });
  for (const domain of answers.domains ?? []) out.push({ kind: 'starters', domain });
  return out;
}

/**
 * The `Profile` these answers describe. Keys are omitted, never written as
 * `undefined` — `exactOptionalPropertyTypes` means those are different
 * things, and a store round trip must not have to tell them apart.
 */
export function profileFrom(answers: Answers): Profile {
  const profile: Profile = {};
  if (answers.gender !== undefined) profile.gender = answers.gender;
  if (answers.hair !== undefined) profile.hair = answers.hair;

  if (answers.partnerWanted !== undefined) {
    const partner: NonNullable<Profile['partner']> = { wanted: answers.partnerWanted };
    if (answers.partnerWanted) {
      if (answers.partnerGender !== undefined) partner.gender = answers.partnerGender;
      if (answers.partnerHair !== undefined) partner.hair = answers.partnerHair;
    }
    profile.partner = partner;
  }

  if (answers.children !== undefined) profile.children = answers.children;
  if (answers.domains !== undefined) profile.domainOrder = answers.domains;
  return profile;
}

/**
 * Seeded and ready to save. An unknown catalogue id is dropped rather than
 * thrown — the same silent return `useLifeOS.addHabit` already makes for a
 * bad id — and every habit is built through the existing
 * `newHabitFromCatalog`, anchored at `today` like any habit added later.
 * With nothing picked and nothing answered, this returns a state identical
 * in shape to the literal `App.tsx` wrote before onboarding existed.
 */
export function buildInitialState(answers: Answers, newId: () => string, today: DateKey): AppState {
  const habits: UserHabit[] = [];
  for (const ids of Object.values(answers.picked ?? {})) {
    for (const id of ids) {
      const item = catalogById(id);
      if (!item) continue;
      habits.push(newHabitFromCatalog(item, newId(), today));
    }
  }

  const state: AppState = { schemaVersion: 2, logs: [], habits, notificationTime: null };
  const profile = profileFrom(answers);
  if (Object.keys(profile).length > 0) state.profile = profile;
  return state;
}
