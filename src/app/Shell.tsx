/**
 * §6 — "Three [screens], no more." Owns the one `useLifeOS` subscription so
 * Main, History and Settings share the same live state instead of each
 * reading the store independently, and switches between them with a plain
 * tab bar.
 */

import { useEffect, useState } from 'react';
import { en } from '../i18n/en';
import { Button } from '../ui/Button';
import { HistoryScreen } from './HistoryScreen';
import { MainScreen } from './MainScreen';
import { SettingsScreen } from './SettingsScreen';
import { store } from './store';
import { useLifeOS } from './useLifeOS';
import { weeklyDigest } from '../core/atRisk';
import { syncDigest } from './push';
import { scene } from '../visual/scene';
import { warmArtwork } from './warmArtwork';

type Tab = 'main' | 'history' | 'settings';

export function Shell() {
  const {
    state,
    projection,
    today,
    toggleHabit,
    addHabit,
    updateHabit,
    removeHabit,
    updateNotificationTime,
    updateProfile,
  } = useLifeOS(store);
  const [tab, setTab] = useState<Tab>('main');

  // Refresh what the server knows about the weekly-or-longer commitments,
  // once per open. Only ids, anchors and dates travel; see core/atRisk.ts.
  // Reminders being off makes this a no-op, so there is nothing to gate it on.
  const digestKey = state ? JSON.stringify(weeklyDigest(state.logs, state.habits, today)) : null;
  useEffect(() => {
    if (digestKey) void syncDigest({ entries: JSON.parse(digestKey) });
  }, [digestKey]);

  // Off the main path, once per distinct profile rather than once per render
  // (`projection.preview` moves every tick): the second launch should be
  // offline-capable without the first one paying for it.
  const profileKey = state ? JSON.stringify(state.profile ?? null) : null;
  useEffect(() => {
    if (!state || !projection) return;
    const run = () => void warmArtwork(scene(projection.preview, state.profile));
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, [profileKey]);

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
          <MainScreen state={state} projection={projection} today={today} toggleHabit={toggleHabit} />
        )}
        {tab === 'history' && <HistoryScreen state={state} today={today} />}
        {tab === 'settings' && (
          <SettingsScreen
            state={state}
            today={today}
            store={store}
            onNotificationTimeChange={updateNotificationTime}
            onAddHabit={addHabit}
            onUpdateHabit={updateHabit}
            onRemoveHabit={removeHabit}
            onUpdateProfile={updateProfile}
          />
        )}
      </div>

      <nav className="tabbar">
        <Button on={tab === 'main'} onClick={() => setTab('main')}>
          {en['nav.main']}
        </Button>
        <Button on={tab === 'history'} onClick={() => setTab('history')}>
          {en['nav.history']}
        </Button>
        <Button on={tab === 'settings'} onClick={() => setTab('settings')}>
          {en['nav.settings']}
        </Button>
      </nav>
    </div>
  );
}
