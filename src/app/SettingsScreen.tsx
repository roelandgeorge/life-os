/**
 * §6 screen 3, merged per §1.7 of docs/plan/phase-1.md: "What each box means"
 * and "Your own tasks" become one habit editor (title, weight, cadence,
 * domain, remove) plus a simple "Add from catalogue" picker. Everything else
 * — the reminder, export/import, reset — is unchanged mechanics.
 */

import { useRef, useState } from 'react';
import { disablePush, enablePush, testPush, type PushResult } from './push';
import { weeklyDigest } from '../core/atRisk';
import { CATALOG, catalogById } from '../core/catalog';
import { DOMAINS, type DomainKey } from '../core/domains';
import type { HabitPatch } from '../core/habits';
import { MAX_HABIT_TITLE_LENGTH, canAddCustomHabit } from '../core/habits';
import type { DateKey } from '../core/dates';
import type { AppState, Cadence, Gender, Hair, Profile } from '../core/types';
import { en, type I18nKey } from '../i18n/en';
import { ImportError } from '../store/serialize';
import type { Store } from '../store/types';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Chip, ChipRow } from '../ui/Chip';
import { Field } from '../ui/Field';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';
import { Select } from '../ui/Select';
import type { NewHabitSource } from './useLifeOS';

const NAMED_CADENCES: readonly Cadence[] = ['daily', 'weekly', 'monthly'];

function cadenceLabel(c: Cadence): I18nKey | null {
  if (c === 'daily') return 'settings.habits.cadence.daily';
  if (c === 'weekly') return 'settings.habits.cadence.weekly';
  if (c === 'monthly') return 'settings.habits.cadence.monthly';
  return null;
}

export function SettingsScreen({
  state,
  today,
  store,
  onNotificationTimeChange,
  onAddHabit,
  onUpdateHabit,
  onRemoveHabit,
  onUpdateProfile,
}: {
  state: AppState;
  today: DateKey;
  store: Store;
  onNotificationTimeChange: (value: string | null) => void;
  onAddHabit: (source: NewHabitSource) => void;
  onUpdateHabit: (id: string, patch: HabitPatch) => void;
  onRemoveHabit: (id: string) => void;
  onUpdateProfile: (patch: Partial<Profile>) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [catalogChoice, setCatalogChoice] = useState(CATALOG[0]?.id ?? '');
  const fileInput = useRef<HTMLInputElement>(null);

  const habits = state.habits.filter((h) => h.removedDate === undefined);

  async function handleReminder(wanted: boolean) {
    setPushError(null);
    if (!wanted) {
      onNotificationTimeChange(null);
      await disablePush();
      return;
    }

    setBusy(true);
    const digest = weeklyDigest(state.logs, state.habits, today);
    const result = await enablePush({ entries: digest });
    setBusy(false);

    if (result.ok) {
      onNotificationTimeChange('20:00');
      return;
    }
    setPushError(describe(result));
  }

  async function handleTest() {
    setTestResult(null);
    setTesting(true);
    setTestResult(await testPush());
    setTesting(false);
  }

  async function handleExport() {
    const json = await store.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-os-export-${state.logs[state.logs.length - 1]?.date ?? 'empty'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    setMessage(null);
    try {
      const text = await file.text();
      await store.import(text);
      // Simplest correct way to resync every screen (and App's onboarding
      // gate) with the freshly-imported state.
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof ImportError ? err.message : 'Import failed.');
    }
  }

  async function handleReset() {
    if (!window.confirm(en['settings.reset.confirm'])) return;
    await store.clear();
    window.location.reload();
  }

  function handleAddCustom() {
    const title = newTitle.trim();
    if (!title) return;
    onAddHabit({ title });
    setNewTitle('');
  }

  function handleAddFromCatalog() {
    if (!catalogChoice) return;
    onAddHabit({ catalogId: catalogChoice });
  }

  return (
    <div className="settings-screen">
      <h1 className="headline">{en['settings.title']}</h1>

      <AppearanceSection profile={state.profile} onUpdateProfile={onUpdateProfile} />

      <section>
        <SectionHeading>{en['settings.habits']}</SectionHeading>
        <Note>{en['settings.habits.note']}</Note>

        {habits.length === 0 && <Note>{en['settings.habits.empty']}</Note>}

        <div className="habit-list">
          {habits.map((habit) => (
            <div className="habit-row" key={habit.id}>
              <div className="task-label">
                <input
                  type="text"
                  maxLength={MAX_HABIT_TITLE_LENGTH}
                  placeholder={en['settings.habits.title.placeholder']}
                  value={habit.title}
                  onChange={(e) => onUpdateHabit(habit.id, { title: e.target.value })}
                />
                <Button
                  variant="danger"
                  small
                  aria-label={`${en['settings.habits.remove']}: ${habit.title}`}
                  onClick={() => onRemoveHabit(habit.id)}
                >
                  ×
                </Button>
              </div>

              <div className="habit-row-controls">
                <Field className="habit-weight" label={en['settings.habits.weight']}>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={habit.importance}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) onUpdateHabit(habit.id, { importance: Math.min(5, Math.max(1, n)) });
                    }}
                  />
                </Field>

                <Select
                  value={habit.domain ?? 'none'}
                  onChange={(e) => {
                    const value = e.target.value;
                    onUpdateHabit(habit.id, { domain: value === 'none' ? null : (value as DomainKey) });
                  }}
                >
                  <option value="none">{en['settings.habits.domain.none']}</option>
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {en[d.label as I18nKey]}
                    </option>
                  ))}
                </Select>

                <ChipRow className="chips cadence">
                  {NAMED_CADENCES.map((c) => {
                    const label = cadenceLabel(c);
                    if (!label) return null;
                    return (
                      <Chip key={String(c)} on={habit.cadence === c} onClick={() => onUpdateHabit(habit.id, { cadence: c })}>
                        {en[label]}
                      </Chip>
                    );
                  })}
                  {cadenceLabel(habit.cadence) === null && <Note>{en['settings.habits.cadence.other']}</Note>}
                </ChipRow>
              </div>
            </div>
          ))}
        </div>

        <div className="add-custom-row">
          <input
            type="text"
            maxLength={MAX_HABIT_TITLE_LENGTH}
            placeholder={en['settings.habits.add.placeholder']}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom();
            }}
          />
          <Button disabled={!canAddCustomHabit(state.habits)} onClick={handleAddCustom}>
            {en['settings.habits.add.button']}
          </Button>
        </div>
      </section>

      <section>
        <SectionHeading>{en['settings.catalog']}</SectionHeading>
        <Note>{en['settings.catalog.note']}</Note>
        <div className="row">
          <Select value={catalogChoice} onChange={(e) => setCatalogChoice(e.target.value)}>
            {DOMAINS.map((d) => (
              <optgroup key={d.key} label={en[d.label as I18nKey]}>
                {CATALOG.filter((item) => item.domain === d.key).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Button onClick={handleAddFromCatalog}>{en['settings.catalog.add']}</Button>
        </div>
        {catalogChoice && catalogById(catalogChoice) && <Note>{catalogById(catalogChoice)?.note}</Note>}
      </section>

      <section>
        <SectionHeading>{en['settings.notifications']}</SectionHeading>
        <Note>{en['settings.notifications.note']}</Note>
        <label className="notification-row">
          <Checkbox
            disabled={busy}
            checked={state.notificationTime != null}
            onChange={(e) => void handleReminder(e.target.checked)}
          />
          <span>{en['settings.notifications.enable']}</span>
        </label>
        {busy && <Note>{en['settings.notifications.working']}</Note>}
        {!busy && pushError && <Note variant="error">{pushError}</Note>}
        {!busy && !pushError && state.notificationTime != null && <Note>{en['settings.notifications.on']}</Note>}

        {state.notificationTime != null && (
          <>
            <Button disabled={testing} onClick={() => void handleTest()}>
              {testing ? en['settings.notifications.testing'] : en['settings.notifications.test']}
            </Button>
            <Note>{en['settings.notifications.test.note']}</Note>
            {testResult && (testResult.ok ? <Note>{testResult.detail}</Note> : <Note variant="error">{testResult.detail}</Note>)}
          </>
        )}
      </section>

      <section>
        <SectionHeading>{en['settings.data']}</SectionHeading>
        <div className="row">
          <Button onClick={() => void handleExport()}>{en['settings.export']}</Button>
          <Button onClick={() => fileInput.current?.click()}>{en['settings.import']}</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && <Note variant="error">{message}</Note>}
      </section>

      <section>
        <SectionHeading>{en['settings.reset']}</SectionHeading>
        <Note>{en['settings.reset.note']}</Note>
        <Button variant="danger" onClick={() => void handleReset()}>
          {en['settings.reset']}
        </Button>
      </section>
    </div>
  );
}

/**
 * A bare Appearance section (§2.5 of docs/plan/phase-2.md) — gender, hair and
 * partner, settable now rather than waiting for phase 4's onboarding, which
 * writes the same `Profile` fields and replaces this.
 */
/**
 * `exactOptionalPropertyTypes` means a partner patch can never carry
 * `gender: undefined` to mean "leave it be" — an absent key is the only way
 * to say that. This keeps whichever half the caller didn't just change.
 */
function withPartner(
  current: Profile['partner'],
  patch: { wanted: boolean; gender?: Gender; hair?: Hair },
): NonNullable<Profile['partner']> {
  const gender = patch.gender ?? current?.gender;
  const hair = patch.hair ?? current?.hair;
  return {
    wanted: patch.wanted,
    ...(gender !== undefined ? { gender } : {}),
    ...(hair !== undefined ? { hair } : {}),
  };
}

function AppearanceSection({
  profile,
  onUpdateProfile,
}: {
  profile: Profile | undefined;
  onUpdateProfile: (patch: Partial<Profile>) => void;
}) {
  const partner = profile?.partner;
  const partnerWanted = partner?.wanted === true;

  return (
    <section>
      <SectionHeading>{en['settings.appearance']}</SectionHeading>
      <Note>{en['settings.appearance.note']}</Note>

      <div className="row">
        <GenderSelect value={profile?.gender ?? 'male'} onChange={(gender) => onUpdateProfile({ gender })} />
        <HairSelect value={profile?.hair ?? 'blond'} onChange={(hair) => onUpdateProfile({ hair })} />
      </div>

      <label className="notification-row">
        <Checkbox
          checked={partnerWanted}
          onChange={(e) => onUpdateProfile({ partner: withPartner(partner, { wanted: e.target.checked }) })}
        />
        <span>{en['settings.appearance.partner.wanted']}</span>
      </label>

      {partnerWanted && (
        <div className="row">
          <GenderSelect
            value={partner?.gender ?? 'male'}
            onChange={(gender) => onUpdateProfile({ partner: withPartner(partner, { wanted: true, gender }) })}
          />
          <HairSelect
            value={partner?.hair ?? 'blond'}
            onChange={(hair) => onUpdateProfile({ partner: withPartner(partner, { wanted: true, hair }) })}
          />
        </div>
      )}
    </section>
  );
}

function GenderSelect({ value, onChange }: { value: Gender; onChange: (v: Gender) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Gender)}>
      <option value="male">{en['settings.appearance.gender.male']}</option>
      <option value="female">{en['settings.appearance.gender.female']}</option>
    </Select>
  );
}

function HairSelect({ value, onChange }: { value: Hair; onChange: (v: Hair) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Hair)}>
      <option value="blond">{en['settings.appearance.hair.blond']}</option>
      <option value="dark">{en['settings.appearance.hair.dark']}</option>
    </Select>
  );
}

function describe(result: Extract<PushResult, { ok: false }>): string {
  switch (result.reason) {
    case 'unsupported':
      return en['settings.notifications.error.unsupported'];
    case 'not-installed':
      return en['settings.notifications.error.notInstalled'];
    case 'denied':
      return en['settings.notifications.error.denied'];
    default:
      return result.detail
        ? `${en['settings.notifications.error.failed']} ${result.detail}`
        : en['settings.notifications.error.failed'];
  }
}
