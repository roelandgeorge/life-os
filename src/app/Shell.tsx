/**
 * §6 — "Three [screens], no more." Owns the one `useLifeOS` subscription so
 * Main, History and Settings share the same live state instead of each
 * reading the store independently, and switches between them with a plain
 * tab bar (the spec doesn't specify chrome beyond the three screens).
 */

import { useEffect, useState } from 'react';
import { en } from '../i18n/en';
import { HistoryScreen } from './HistoryScreen';
import { MainScreen } from './MainScreen';
import { SettingsScreen } from './SettingsScreen';
import { store } from './store';
import { useLifeOS } from './useLifeOS';
import { weeklyDigest } from '../core/atRisk';
import { VISIBLE_DOMAINS } from '../core/domains';
import { syncDigest } from './push';

type Tab = 'main' | 'history' | 'settings';

export function Shell() {
  const {
    state,
    projection,
    today,
    toggle,
    updateNotificationTime,
    updateTaskLabel,
    toggleCustom,
    addCustom,
    renameCustom,
    removeCustom,
    setCustomCadence,
  } = useLifeOS(store);
  const [tab, setTab] = useState<Tab>('main');

  // Refresh what the server knows about the weekly commitments, once per open.
  // Only ids and dates travel; see core/atRisk.ts. Reminders being off makes
  // this a no-op, so there is nothing to gate it on.
  const digestKey = state ? JSON.stringify(weeklyDigest(state.logs, VISIBLE_DOMAINS, state.customTasks, state.logs[0]?.date ?? null)) : null;
  useEffect(() => {
    if (digestKey) void syncDigest(JSON.parse(digestKey));
  }, [digestKey]);

  if (!state || !projection) {
    return (
      <div className="main-screen">
        <p className="loading">{en['main.loading']}</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="shell-body">
        {tab === 'main' && (
          <MainScreen
            state={state}
            projection={projection}
            today={today}
            toggle={toggle}
            toggleCustom={toggleCustom}
          />
        )}
        {tab === 'history' && <HistoryScreen state={state} today={today} />}
        {tab === 'settings' && (
          <SettingsScreen
            state={state}
            store={store}
            onNotificationTimeChange={updateNotificationTime}
            onTaskLabelChange={updateTaskLabel}
            onAddCustom={addCustom}
            onRenameCustom={renameCustom}
            onRemoveCustom={removeCustom}
            onSetCustomCadence={setCustomCadence}
          />
        )}
      </div>

      <nav className="tabbar">
        <button type="button" className={tab === 'main' ? 'on' : ''} onClick={() => setTab('main')}>
          {en['nav.main']}
        </button>
        <button type="button" className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
          {en['nav.history']}
        </button>
        <button type="button" className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>
          {en['nav.settings']}
        </button>
      </nav>
    </div>
  );
}
