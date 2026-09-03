/**
 * §6 — "Three [screens], no more." Owns the one `useLifeOS` subscription so
 * Main, History and Settings share the same live state instead of each
 * reading the store independently, and switches between them with a plain
 * tab bar (the spec doesn't specify chrome beyond the three screens).
 */

import { useState } from 'react';
import { en } from '../i18n/en';
import { HistoryScreen } from './HistoryScreen';
import { MainScreen } from './MainScreen';
import { SettingsScreen } from './SettingsScreen';
import { store } from './store';
import { useLifeOS } from './useLifeOS';

type Tab = 'main' | 'history' | 'settings';

export function Shell() {
  const { state, projection, today, toggle, updateProfile, updateNotificationTime, updateTaskLabel } =
    useLifeOS(store);
  const [tab, setTab] = useState<Tab>('main');

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
          <MainScreen state={state} projection={projection} today={today} toggle={toggle} />
        )}
        {tab === 'history' && <HistoryScreen state={state} today={today} />}
        {tab === 'settings' && (
          <SettingsScreen
            state={state}
            store={store}
            onProfileChange={updateProfile}
            onNotificationTimeChange={updateNotificationTime}
            onTaskLabelChange={updateTaskLabel}
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
