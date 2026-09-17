/**
 * Settings, reduced to exactly four things (docs/onboarding/04-revisions.md
 * §10): the figure and "what you work on" each get their own redo button —
 * running one writes only its own fields (§5) — plus the daily reminder and
 * data (export/import/reset). The old Profile section, the habit editor and
 * the catalogue button are gone: profile fields are onboarding's alone now,
 * a habit is edited from its own row on Home, and the catalogue is reached
 * per domain from there too.
 */

import { useRef, useState } from 'react';
import { disablePush, enablePush, testPush, type PushResult } from './push';
import { weeklyDigest } from '../core/atRisk';
import type { DateKey } from '../core/dates';
import { FIGURE_START_NODE, LANDING_NODE, WORK_ON_START_NODE, type Answers } from '../core/onboarding';
import type { AppState } from '../core/types';
import { en } from '../i18n/en';
import { ImportError } from '../store/serialize';
import type { Store } from '../store/types';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';
import { Onboarding } from './Onboarding';

type Redo = 'figure' | 'workOn' | null;

export function SettingsScreen({
  state,
  today,
  store,
  onNotificationTimeChange,
  onCompleteWorkOnRedo,
  onCompleteFigureRedo,
}: {
  state: AppState;
  today: DateKey;
  store: Store;
  onNotificationTimeChange: (value: string | null) => void;
  onCompleteWorkOnRedo: (answers: Answers) => void;
  onCompleteFigureRedo: (answers: Answers) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const [redo, setRedo] = useState<Redo>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  if (redo === 'workOn') {
    return (
      <Onboarding
        start={WORK_ON_START_NODE}
        terminal={FIGURE_START_NODE}
        onComplete={(answers) => {
          onCompleteWorkOnRedo(answers);
          setRedo(null);
        }}
      />
    );
  }

  if (redo === 'figure') {
    return (
      <Onboarding
        start={FIGURE_START_NODE}
        terminal={LANDING_NODE}
        onComplete={(answers) => {
          onCompleteFigureRedo(answers);
          setRedo(null);
        }}
      />
    );
  }

  return (
    <div className="settings-screen">
      <h1 className="headline">{en['settings.title']}</h1>

      <section>
        <SectionHeading>{en['settings.figure']}</SectionHeading>
        <Button onClick={() => setRedo('figure')}>{en['settings.figure.redo']}</Button>
      </section>

      <section>
        <SectionHeading>{en['settings.workOn']}</SectionHeading>
        <Button onClick={() => setRedo('workOn')}>{en['settings.workOn.redo']}</Button>
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

        <Button variant="danger" onClick={() => void handleReset()}>
          {en['settings.reset']}
        </Button>
        <Note>{en['settings.reset.note']}</Note>
      </section>
    </div>
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
