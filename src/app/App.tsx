/**
 * §7 — onboarding runs once, before the store holds any state. This is the
 * one place that decides which screen that implies; MainScreen and
 * Onboarding otherwise know nothing about each other.
 */

import { useEffect, useState } from 'react';
import type { AppState, Profile } from '../core/types';
import { en } from '../i18n/en';
import { Onboarding } from './Onboarding';
import { Shell } from './Shell';
import { store } from './store';

type Phase = { kind: 'loading' } | { kind: 'onboarding' } | { kind: 'ready' };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void store.load().then((state) => {
      if (!cancelled) setPhase(state ? { kind: 'ready' } : { kind: 'onboarding' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function finishOnboarding(profile: Profile) {
    const initial: AppState = { profile, logs: [], notificationTime: null };
    await store.save(initial);
    setPhase({ kind: 'ready' });
  }

  if (phase.kind === 'loading') {
    return (
      <div className="main-screen">
        <p className="loading">{en['main.loading']}</p>
      </div>
    );
  }

  if (phase.kind === 'onboarding') {
    return <Onboarding onComplete={(profile) => void finishOnboarding(profile)} />;
  }

  return <Shell />;
}
