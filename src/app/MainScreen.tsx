/**
 * §6 screen 1, minimally adapted for §1.7 of docs/plan/phase-1.md: the
 * portrait fills the upper two-thirds; below it the age line, then today's
 * check-ins — the user's own habit list, grouped by domain.
 *
 * Reworked again for the onboarding rebuild (docs/onboarding/04-revisions.md):
 * a domain group's heading is now the only way into that domain's catalogue
 * (§6); a habit row's own menu offers Remove for everyone and Edit for one
 * the user wrote (§9), since the old cross-screen habit editor is gone; and,
 * for the one session right after onboarding, the headline and an offers row
 * replace the everyday copy (§6's landing screen, docs/onboarding/01-onboarding-spec.md).
 *
 * Purely presentational — `Shell` owns the `useLifeOS` hook so History and
 * Settings can share the same live state without a second store read.
 */

import { useEffect, useRef, useState } from 'react';
import type { CatalogItem } from '../core/catalog';
import { orderedDomains, PANEL_KEYS, type DomainConfig, type DomainKey, type PanelSteps } from '../core/domains';
import { dailyTasksDone, editableDays, isDueToday, isRestDay, lastHit } from '../core/due';
import { fullDayStrip } from '../core/scoring';
import { MAX_STEP } from '../core/steps';
import type { AppState, Projection, UserHabit } from '../core/types';
import { diffDays, type DateKey } from '../core/dates';
import { en, t, type I18nKey } from '../i18n/en';
import {
  effectiveColor,
  habitStreak,
  habitTitle,
  isActiveOn,
  isHabitTicked,
  type HabitPatch,
} from '../core/habits';
import { atRiskItems, type RiskItem } from '../core/atRisk';
import { Avatar } from '../visual/Avatar';
import { scene as buildScene } from '../visual/scene';
import { Celebration } from './Celebration';
import { DomainCatalog, WriteHabitForm } from './DomainCatalog';
import type { NewHabitSource } from './useLifeOS';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Chip, ChipRow } from '../ui/Chip';
import { FullDayStrip } from '../ui/FullDayStrip';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';

/** How long the confetti stays up once every box for today is ticked. */
const CELEBRATION_MS = 3000;

/** Every panel at its ceiling — the same scene, maximally adherent. */
const BEST_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, MAX_STEP])) as PanelSteps;

const LANDING_COUNT_KEY: readonly I18nKey[] = [
  'main.landing.count.0',
  'main.landing.count.1',
  'main.landing.count.2',
  'main.landing.count.3',
  'main.landing.count.4',
];

type Group = { domain: DomainConfig | null; habits: UserHabit[] };

function groupHabits(
  habits: readonly UserHabit[],
  today: DateKey,
  domainOrder: readonly DomainKey[] | undefined,
): Group[] {
  const active = habits.filter((h) => isActiveOn(h, today));
  const groups: Group[] = [];
  for (const domain of orderedDomains(domainOrder)) {
    const inDomain = active.filter((h) => h.domain === domain.key);
    if (inDomain.length > 0) groups.push({ domain, habits: inDomain });
  }
  const own = active.filter((h) => h.domain === undefined);
  if (own.length > 0) groups.push({ domain: null, habits: own });
  return groups;
}

export function MainScreen({
  state,
  projection,
  today,
  toggleHabit,
  onAddHabit,
  onUpdateHabit,
  onRemoveHabit,
  landingDailyCount,
  landingOffers,
  onAddLandingOffer,
}: {
  state: AppState;
  projection: Projection;
  today: DateKey;
  toggleHabit: (id: string, on?: DateKey) => void;
  onAddHabit: (source: NewHabitSource) => void;
  onUpdateHabit: (id: string, patch: HabitPatch) => void;
  onRemoveHabit: (id: string) => void;
  /** Set only for the session right after onboarding — see App.tsx's `JustOnboarded`. */
  landingDailyCount?: number;
  landingOffers: readonly CatalogItem[];
  onAddLandingOffer: (catalogId: string) => void;
}) {
  const [showBest, setShowBest] = useState(false);
  const [catalogDomain, setCatalogDomain] = useState<DomainKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // §5.2 — which day the check-ins are writing to. The picture always shows
  // today; filling in a past day changes today's standing, it does not
  // rewind the app to that day.
  const [editing, setEditing] = useState<DateKey>(today);
  const editingLog = state.logs.find((l) => l.date === editing) ?? null;
  const avatarScene = buildScene(showBest ? BEST_STEPS : projection.preview, state.profile);
  const strip = fullDayStrip(state.logs, state.habits, today, 30);
  const groups = groupHabits(state.habits, today, state.profile?.domainOrder);

  const allDone = dailyTasksDone(state.logs, state.habits, today);
  const wasAllDone = useRef(allDone);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const justFinished = allDone && !wasAllDone.current;
    wasAllDone.current = allDone;
    if (!justFinished) return;
    setCelebrate(true);
    const timer = setTimeout(() => setCelebrate(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [allDone]);

  if (catalogDomain) {
    return (
      <DomainCatalog
        domain={catalogDomain}
        state={state}
        onAddHabit={(catalogId) => onAddHabit({ catalogId })}
        onAddCustom={onAddHabit}
        onClose={() => setCatalogDomain(null)}
      />
    );
  }

  return (
    <div className="main-screen">
      {celebrate && <Celebration />}

      <div className="portrait">
        <Avatar scene={avatarScene} />
      </div>

      <div className="below">
        {showBest ? (
          <>
            <h1 className="headline">{en['main.bestVersion.headline']}</h1>
            <Note variant="subhead">{en['main.bestVersion.subhead']}</Note>
          </>
        ) : landingDailyCount !== undefined ? (
          <>
            <h1 className="headline">{en['main.landing.headline']}</h1>
            <Note variant="subhead">
              {en[(LANDING_COUNT_KEY[Math.min(landingDailyCount, 4)] ?? 'main.landing.count.0') as I18nKey]}
            </Note>
          </>
        ) : (
          <>
            <h1 className="headline">{en['main.headline']}</h1>
            <Note variant="subhead">{en['main.subhead']}</Note>
            {projection.fullDay && <p className="fullday">{en['main.fullDay']}</p>}
          </>
        )}

        <Button className="best-version-toggle" onClick={() => setShowBest((v) => !v)}>
          {showBest ? en['main.bestVersion.hide'] : en['main.bestVersion.show']}
        </Button>

        {!showBest && (
          <>
            <FullDayStrip strip={strip} />

            <RiskWarning state={state} today={today} />

            <DayPicker today={today} editing={editing} onPick={setEditing} />

            {groups.length === 0 && <Note>{en['settings.habits.empty']}</Note>}

            {groups.map(({ domain, habits }) => (
              <div className="checkins" key={domain?.key ?? 'own'}>
                <div className="domain-heading-row">
                  <SectionHeading className={domain ? 'domain-heading' : 'custom-heading'}>
                    {domain ? en[domain.label as I18nKey] : en['habits.own']}
                  </SectionHeading>
                  {domain && (
                    <Button
                      small
                      aria-label={t('main.domain.browse', { domain: en[domain.label as I18nKey] })}
                      onClick={() => setCatalogDomain(domain.key)}
                    >
                      +
                    </Button>
                  )}
                </div>
                {habits.map((habit) =>
                  editingId === habit.id && habit.domain !== undefined ? (
                    <WriteHabitForm
                      key={habit.id}
                      domain={habit.domain}
                      initial={{
                        title: habit.title,
                        importance: habit.importance,
                        cadence: habit.cadence,
                        ...(habit.emoji ? { emoji: habit.emoji } : {}),
                      }}
                      onCancel={() => setEditingId(null)}
                      onSave={(input) => {
                        onUpdateHabit(habit.id, {
                          title: input.title,
                          importance: input.importance,
                          cadence: input.cadence,
                          emoji: input.emoji ?? null,
                        });
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      state={state}
                      today={today}
                      editingLog={editingLog}
                      onToggle={() => toggleHabit(habit.id, editing)}
                      onEdit={
                        habit.catalogId === undefined && habit.domain !== undefined
                          ? () => setEditingId(habit.id)
                          : undefined
                      }
                      onRemove={() => onRemoveHabit(habit.id)}
                    />
                  ),
                )}
              </div>
            ))}

            {landingOffers.length > 0 && (
              <div className="checkins landing-offers">
                {landingOffers.map((item) => (
                  <Card key={item.id} className="checkin offer">
                    <span className="label">{item.title}</span>
                    <Button
                      small
                      variant="primary"
                      aria-label={t('main.landing.offer.add', { title: item.title })}
                      onClick={() => onAddLandingOffer(item.id)}
                    >
                      +
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {editing !== today && <Note className="editing-past">{t('main.editingPast', { day: dayLabel(editing, today) })}</Note>}
            <Note className="next-move">{nextMove(projection)}</Note>
          </>
        )}
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  state,
  today,
  editingLog,
  onToggle,
  onEdit,
  onRemove,
}: {
  habit: UserHabit;
  state: AppState;
  today: DateKey;
  editingLog: AppState['logs'][number] | null;
  onToggle: () => void;
  onEdit: (() => void) | undefined;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const due = isDueToday(habit, state.logs, today);
  const checked = isHabitTicked(editingLog ?? undefined, habit.id);
  const last = lastHit(state.logs, habit.id, today);
  // Left tickable on purpose. The box writes to whichever day the picker is
  // on, so disabling it on today's rest day would also block filling in a
  // session you forgot to log — and a second tick inside one period changes
  // nothing anyway.
  const rest = !due && isRestDay(habit, state.logs, today);
  const streak = habitStreak(state.logs, habit, today);
  const color = effectiveColor(habit);

  return (
    <Card className={due ? 'checkin' : 'checkin collapsed'}>
      <label className="checkin-tap">
        <Checkbox checked={checked} onChange={onToggle} />
        <span className="label" style={color === undefined ? undefined : { color }}>
          {habit.emoji ? `${habit.emoji} ` : ''}
          {habitTitle(habit, en['settings.habits.title.placeholder'])}
        </span>
      </label>
      {!due && (
        <span className={rest ? 'lastHit rest' : 'lastHit'}>
          {rest ? en['main.restDay'] : last ? t('main.lastHit', { date: last }) : en['main.neverHit']}
        </span>
      )}
      {due && streak > 1 && <span className="lastHit">{t('habits.streak', { count: streak })}</span>}

      <div className="habit-menu">
        <Button small aria-label={en['habits.menu.open']} onClick={() => setMenuOpen((v) => !v)}>
          ⋯
        </Button>
        {menuOpen && (
          <div className="habit-menu-popover">
            {onEdit && (
              <Button
                small
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                {en['habits.menu.edit']}
              </Button>
            )}
            <Button
              small
              variant="danger"
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
            >
              {en['settings.habits.remove']}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Relative names for the near past, for prose. */
function dayLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  if (age === 0) return en['main.day.today'];
  if (age === 1) return en['main.day.yesterday'];
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Button captions: today is named, the days behind it are chevrons. Four
 * weekday names in a row read as a menu of equals, when in fact one of them
 * is where you almost always want to be.
 */
function pickerLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  return age === 0 ? en['main.day.today'] : '<'.repeat(age);
}

/**
 * §5.2's three-day window. Without it a day the app was not opened is an
 * unfixable -1, even when the thing was actually done.
 */
function DayPicker({
  today,
  editing,
  onPick,
}: {
  today: DateKey;
  editing: DateKey;
  onPick: (d: DateKey) => void;
}) {
  return (
    <ChipRow className="day-picker">
      {editableDays(today).map((day) => (
        <Chip
          key={day}
          on={day === editing}
          title={dayLabel(day, today)}
          aria-label={dayLabel(day, today)}
          onClick={() => onPick(day)}
        >
          {pickerLabel(day, today)}
        </Chip>
      ))}
    </ChipRow>
  );
}

/**
 * With five states, most days change nothing on screen. Naming how many of
 * the five panels today's ticks have already moved up keeps the daily
 * action worth taking.
 */
function nextMove(projection: Projection): string {
  const climbing = PANEL_KEYS.filter((p) => projection.preview[p] > projection.steps[p]).length;
  if (climbing > 0) return t('main.nextMove.gained', { count: climbing });
  return en['main.nextMove.waiting'];
}

/**
 * The one warning the app gives. A weekly-or-longer habit changes nothing on
 * screen for days and then drops a step — the only case where the picture
 * alone is not enough feedback in time to act on.
 */
function RiskWarning({ state, today }: { state: AppState; today: DateKey }) {
  const risks = atRiskItems(state.logs, state.habits, today);
  if (risks.length === 0) return null;

  const first = risks[0] as RiskItem;
  const text =
    risks.length === 1
      ? t('main.risk.one', { name: riskName(state, first), when: whenText(first.daysLeft) })
      : t('main.risk.many', { count: risks.length });

  return <Card className="risk-warning">{text}</Card>;
}

function riskName(state: AppState, risk: RiskItem): string {
  const habit = state.habits.find((h) => h.id === risk.id);
  return habit ? habitTitle(habit, en['settings.habits.title.placeholder']) : '';
}

function whenText(daysLeft: number): string {
  return daysLeft <= 1 ? en['main.risk.today'] : en['main.risk.tomorrow'];
}
