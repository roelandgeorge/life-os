/**
 * §6 screen 3, merged per §1.7 of docs/plan/phase-1.md: "What each box means"
 * and "Your own tasks" become one habit editor (title, weight, cadence,
 * domain, remove) plus a simple "Add from catalogue" picker. Everything else
 * — the reminder, export/import, reset — is unchanged mechanics.
 */

import { useRef, useState } from 'react';
import { disablePush, enablePush, testPush, type PushResult } from './push';
import { weeklyDigest } from '../core/atRisk';
import { DOMAINS, type DomainKey } from '../core/domains';
import type { HabitPatch } from '../core/habits';
import { MAX_HABIT_TITLE_LENGTH, canAddCustomHabit } from '../core/habits';
import type { DateKey } from '../core/dates';
import type { AppState, Cadence, Profile } from '../core/types';
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
import { DiscoverScreen } from './DiscoverScreen';
import { ChildrenField, DomainOrderField, GenderField, HairField, PartnerFields } from './ProfileFields';
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
  const [discoverOpen, setDiscoverOpen] = useState(false);
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

  if (discoverOpen) {
    return <DiscoverScreen state={state} onAddHabit={onAddHabit} onClose={() => setDiscoverOpen(false)} />;
  }

  return (
    <div className="settings-screen">
      <h1 className="headline">{en['settings.title']}</h1>

      <ProfileSection profile={state.profile} onUpdateProfile={onUpdateProfile} />

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
        <Button onClick={() => setDiscoverOpen(true)}>{en['settings.catalog.discover']}</Button>
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
 * The Profile section (§4.8 of docs/plan/phase-4.md) — gender, hair, partner,
 * children and domain order, replacing the old bare Appearance section.
 * Built from the same ProfileFields onboarding uses, so a control changed
 * here is literally the same control met during onboarding.
 */
function ProfileSection({
  profile,
  onUpdateProfile,
}: {
  profile: Profile | undefined;
  onUpdateProfile: (patch: Partial<Profile>) => void;
}) {
  return (
    <section>
      <SectionHeading>{en['settings.appearance']}</SectionHeading>
      <Note>{en['settings.appearance.note']}</Note>

      <div className="row">
        <GenderField value={profile?.gender} onChange={(gender) => onUpdateProfile({ gender })} />
        <HairField value={profile?.hair} onChange={(hair) => onUpdateProfile({ hair })} />
      </div>

      <PartnerFields value={profile?.partner} onChange={(partner) => onUpdateProfile({ partner })} />
      <ChildrenField value={profile?.children} onChange={(children) => onUpdateProfile({ children })} />

      <SectionHeading>{en['settings.domainOrder']}</SectionHeading>
      <Note>{en['settings.domainOrder.note']}</Note>
      <DomainOrderField order={profile?.domainOrder} onChange={(domainOrder) => onUpdateProfile({ domainOrder })} />
    </section>
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
