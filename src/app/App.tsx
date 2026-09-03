/**
 * §7 — onboarding runs once, before the store holds any state. This is the
 * one place that decides which screen that implies; MainScreen and
 * Onboarding otherwise know nothing about each other.
 */

import { useEffect, useState } from 'react';
import type { AppState } from '../core/types';
import { en } from '../i18n/en';
import { Onboarding } from './Onboarding';
import { Shell } from './Shell';
import { requestPersistentStorage, store } from './store';

type Phase =
  | { kind: 'loading' }
  | { kind: 'onboarding' }
  | { kind: 'ready' }
  | { kind: 'failed'; message: string };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    requestPersistentStorage();
    let cancelled = false;
    void store
      .load()
      .then((state) => {
        if (!cancelled) setPhase(state ? { kind: 'ready' } : { kind: 'onboarding' });
      })
      .catch((err: unknown) => {
        // Never leave the user on a loading screen with no explanation: if the
        // store cannot be reached, say so and offer the one thing that helps.
        if (!cancelled) {
          setPhase({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function finishOnboarding() {
    const initial: AppState = { logs: [], notificationTime: null };
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

  if (phase.kind === 'failed') {
    return (
      <div className="main-screen">
        <section className="storage-error">
          <h2>{en['error.storage.title']}</h2>
          <p className="note">{phase.message}</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            {en['error.storage.retry']}
          </button>
        </section>
      </div>
    );
  }

  if (phase.kind === 'onboarding') {
    return <Onboarding onComplete={() => void finishOnboarding()} />;
  }

  return <Shell />;
}
