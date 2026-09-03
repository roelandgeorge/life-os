/**
 * §6 screen 3. Profile edit, notification time, export/import, reset —
 * nothing else. Export/import round-trip through the same `Store.export` /
 * `Store.import` the spec calls "the only defence against a cleared cache"
 * (§5.1); reset just clears the store and reloads, which drops the app back
 * into onboarding.
 */

import { useRef, useState } from 'react';
import { disablePush, enablePush, type PushResult } from './push';
import type { AppState, Profile } from '../core/types';
import { en } from '../i18n/en';
import { ImportError } from '../store/serialize';
import type { Store } from '../store/types';

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
  const [pushError, setPushError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * The permission prompt must come from this click — browsers refuse it
   * otherwise, and iOS refuses it entirely unless the app was launched from
   * the home screen. The stored time only records that reminders are on; the
   * schedule itself lives in vercel.json, because the free plan allows one
   * fixed daily cron and no more.
   */
  async function handleReminder(wanted: boolean) {
    setPushError(null);
    if (!wanted) {
      onNotificationTimeChange(null);
      await disablePush();
      return;
    }

    setBusy(true);
    const result = await enablePush();
    setBusy(false);

    if (result.ok) {
      onNotificationTimeChange('20:00');
      return;
    }
    setPushError(describe(result));
  }

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    onProfileChange({ ...state.profile, [key]: value });
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
        <p className="note">{en['onboarding.currentAge.note']}</p>
        <input
          type="range"
          min={16}
          max={80}
          step={1}
          value={state.profile.currentAge}
          onChange={(e) => set('currentAge', Number(e.target.value))}
        />
        <p className="ageValue">{state.profile.currentAge}</p>
      </section>

      <section>
        <h2>{en['settings.notifications']}</h2>
        <p className="note">{en['settings.notifications.note']}</p>
        <label className="notification-row">
          <input
            type="checkbox"
            disabled={busy}
            checked={state.notificationTime != null}
            onChange={(e) => void handleReminder(e.target.checked)}
          />
          <span>{en['settings.notifications.enable']}</span>
        </label>
        {busy && <p className="note">{en['settings.notifications.working']}</p>}
        {!busy && pushError && <p className="note error">{pushError}</p>}
        {!busy && !pushError && state.notificationTime != null && (
          <p className="note">{en['settings.notifications.on']}</p>
        )}
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
