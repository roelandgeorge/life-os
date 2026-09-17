/**
 * §7 — onboarding runs once, before the store holds any state. This is the
 * one place that decides which screen that implies; MainScreen and
 * Onboarding otherwise know nothing about each other.
 */

import { useEffect, useState } from 'react';
import type { CatalogItem } from '../core/catalog';
import { dateKeyFor } from '../core/dates';
import {
  buildInitialState,
  dailySeedCount,
  LANDING_NODE,
  offeredCatalogItems,
  START_NODE,
  type Answers,
} from '../core/onboarding';
import { en } from '../i18n/en';
import { Button } from '../ui/Button';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';
import { Onboarding } from './Onboarding';
import { Shell } from './Shell';
import { requestPersistentStorage, store } from './store';

/** What the landing screen shows once, right after the first run (docs/onboarding/01-onboarding-spec.md §6) — lost on reload, which is fine: it is a first-session nicety, not state. */
export type JustOnboarded = { offers: readonly CatalogItem[]; dailyCount: number };

type Phase =
  | { kind: 'loading' }
  | { kind: 'onboarding' }
  | { kind: 'ready'; justOnboarded?: JustOnboarded }
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

  async function finishOnboarding(answers: Answers) {
    const initial = buildInitialState(answers, () => crypto.randomUUID(), dateKeyFor(new Date()));
    await store.save(initial);
    const justOnboarded: JustOnboarded = {
      offers: offeredCatalogItems(answers),
      dailyCount: dailySeedCount(answers),
    };
    setPhase({ kind: 'ready', justOnboarded });
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
          <SectionHeading>{en['error.storage.title']}</SectionHeading>
          <Note>{phase.message}</Note>
          <Button variant="primary" onClick={() => window.location.reload()}>
            {en['error.storage.retry']}
          </Button>
        </section>
      </div>
    );
  }

  if (phase.kind === 'onboarding') {
    return (
      <Onboarding start={START_NODE} terminal={LANDING_NODE} onComplete={(answers) => void finishOnboarding(answers)} />
    );
  }

  return <Shell {...(phase.justOnboarded ? { justOnboarded: phase.justOnboarded } : {})} />;
}
