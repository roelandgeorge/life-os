/**
 * §6 screen 3. Profile edit, notification time, export/import, reset —
 * nothing else. Export/import round-trip through the same `Store.export` /
 * `Store.import` the spec calls "the only defence against a cleared cache"
 * (§5.1); reset just clears the store and reloads, which drops the app back
 * into onboarding.
 */

import { useRef, useState } from 'react';
import type { AppState, Profile } from '../core/types';
import { en } from '../i18n/en';
import { ImportError } from '../store/serialize';
import type { Store } from '../store/types';
import { StepView } from './Onboarding';
import { ONBOARDING_STEPS } from './onboardingSteps';

export function SettingsScreen({
  state,
  store,
  onProfileChange,
  onNotificationTimeChange,
}: {
  state: AppState;
  store: Store;
  onProfileChange: (profile: Profile) => void;
  onNotificationTimeChange: (value: string | null) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    onProfileChange({ ...state.profile, [key]: value });
  }

  async function handleExport() {
    const json = await store.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-os-export-${state.lastEvaluatedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    setMessage(null);
    try {
      const text = await file.text();
      await store.import(text);
      // Simplest correct way to resync every screen (and App's onboarding
      // gate) with the freshly-imported state, rather than threading a
      // full-state reload through every hook consumer.
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

  return (
    <div className="settings-screen">
      <h1 className="headline">{en['settings.title']}</h1>

      <section>
        <h2>{en['settings.profile']}</h2>
        {ONBOARDING_STEPS.map((step) => (
          <StepView key={step.key} step={step} draft={state.profile} onSet={set} />
        ))}
      </section>

      <section>
        <h2>{en['settings.notifications']}</h2>
        <p className="note">{en['settings.notifications.note']}</p>
        <label className="notification-row">
          <input
            type="checkbox"
            checked={state.notificationTime != null}
            onChange={(e) => onNotificationTimeChange(e.target.checked ? '20:00' : null)}
          />
          <input
            type="time"
            disabled={state.notificationTime == null}
            value={state.notificationTime ?? '20:00'}
            onChange={(e) => onNotificationTimeChange(e.target.value)}
          />
        </label>
      </section>

      <section>
        <h2>{en['settings.data']}</h2>
        <div className="row">
          <button type="button" onClick={() => void handleExport()}>
            {en['settings.export']}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            {en['settings.import']}
          </button>
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
        {message && <p className="note error">{message}</p>}
      </section>

      <section>
        <h2>{en['settings.reset']}</h2>
        <p className="note">{en['settings.reset.note']}</p>
        <button type="button" className="danger" onClick={() => void handleReset()}>
          {en['settings.reset']}
        </button>
      </section>
    </div>
  );
}
