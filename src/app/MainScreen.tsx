/**
 * §6 screen 1: the portrait fills the upper two-thirds, below it the age
 * line, then today's check-ins as one list in the user's own order of the
 * day (`UserHabit.order`, docs/plan/phase-5.md §5.1). No domain groups: the
 * title's colour is the only place the domain shows here.
 *
 * A habit row's own menu offers Edit and Remove for every habit, catalogue
 * or not (docs/onboarding/06-revisions.md §2), and the editor that opens in
 * the row moves it up or down. The `+` row at the bottom is the way into the
 * catalogue: a picker over all ten domains, then that domain's own list
 * (phase-5.md §5.4). For the one session right after onboarding, the
 * headline replaces the everyday copy (docs/onboarding/01-onboarding-spec.md).
 *
 * Purely presentational: `Shell` owns the `useLifeOS` hook so History and
 * Settings can share the same live state without a second store read.
 */

import { useEffect, useRef, useState } from 'react';
import { PANEL_KEYS, type DomainKey, type PanelSteps } from '../core/domains';
import { dailyTasksDone, editableDays, isDueToday, isRestDay, lastHit } from '../core/due';
import { fullDayStrip } from '../core/scoring';
import { MAX_STEP } from '../core/steps';
import type { AppState, Projection, UserHabit } from '../core/types';
import { diffDays, type DateKey } from '../core/dates';
import { en, t } from '../i18n/en';
import {
  activeInOrder,
  effectiveColor,
  habitStreak,
  habitTitle,
  isHabitTicked,
  type HabitPatch,
  type WrittenHabitFields,
} from '../core/habits';
import { atRiskItems, type RiskItem } from '../core/atRisk';
import { Avatar } from '../visual/Avatar';
import { scene as buildScene } from '../visual/scene';
import { Celebration } from './Celebration';
import { catalogById } from '../core/catalog';
import { HISTORY_DAYS } from './history';
import { DomainCatalog, DomainPicker, HabitEditor } from './DomainCatalog';
import type { NewHabitSource } from './useLifeOS';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Chip, ChipRow } from '../ui/Chip';
import { FullDayStrip } from '../ui/FullDayStrip';
import { Note } from '../ui/Note';
import { PencilGlyph, PlusGlyph, TrashGlyph } from '../ui/Glyph';

/** How long the confetti stays up once every box for today is ticked. */
const CELEBRATION_MS = 3000;

/** Every panel at its ceiling — the same scene, maximally adherent. */
const BEST_STEPS: PanelSteps = Object.fromEntries(PANEL_KEYS.map((k) => [k, MAX_STEP])) as PanelSteps;

export function MainScreen({
  state,
  projection,
  today,
  toggleHabit,
  onAddHabit,
  onUpdateHabit,
  onMoveHabit,
  onRemoveHabit,
  justOnboarded,
}: {
  state: AppState;
  projection: Projection;
  today: DateKey;
  toggleHabit: (id: string, on?: DateKey) => void;
  onAddHabit: (source: NewHabitSource) => void;
  onUpdateHabit: (id: string, patch: HabitPatch) => void;
  onMoveHabit: (id: string, direction: -1 | 1) => void;
  onRemoveHabit: (id: string) => void;
  /** Set only for the session right after onboarding, which gets the landing's headline instead of the everyday one. */
  justOnboarded?: true;
}) {
  const [showBest, setShowBest] = useState(false);
  // The way into the catalogue: the domain picker, then one domain's own list.
  const [adding, setAdding] = useState<'picker' | DomainKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // §5.2 — which day the check-ins are writing to. The picture always shows
  // today; filling in a past day changes today's standing, it does not
  // rewind the app to that day.
  const [editing, setEditing] = useState<DateKey>(today);
  const editingLog = state.logs.find((l) => l.date === editing) ?? null;
  const avatarScene = buildScene(showBest ? BEST_STEPS : projection.preview, state.profile);
  const strip = fullDayStrip(state.logs, state.habits, today, HISTORY_DAYS);
  const habits = activeInOrder(state.habits, today);

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

  if (adding === 'picker') {
    return <DomainPicker state={state} today={today} onPick={setAdding} onClose={() => setAdding(null)} />;
  }

  if (adding) {
    return (
      <DomainCatalog
        domain={adding}
        state={state}
        onAddHabit={(catalogId) => onAddHabit({ catalogId })}
        onAddCustom={onAddHabit}
        onClose={() => setAdding('picker')}
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
        <div className="below-head">
          <div className="below-copy">
            {showBest ? (
              <>
                <h1 className="headline">{en['main.bestVersion.headline']}</h1>
                <Note variant="subhead">{en['main.bestVersion.subhead']}</Note>
              </>
            ) : justOnboarded ? (
              <h1 className="headline">{en['main.landing.headline']}</h1>
            ) : (
              <>
                <h1 className="headline">{en['main.headline']}</h1>
                <Note variant="subhead">{en['main.subhead']}</Note>
                {projection.fullDay && <p className="fullday">{en['main.fullDay']}</p>}
              </>
            )}
          </div>

          {/* One glyph, one place: the full-width labelled button it replaces
              was the widest thing on the screen for a view most sessions
              never open. */}
          <Button
            className="best-version-toggle"
            aria-label={showBest ? en['main.bestVersion.hide'] : en['main.bestVersion.show']}
            aria-pressed={showBest}
            onClick={() => setShowBest((v) => !v)}
          >
            {showBest ? '↺' : '★'}
          </Button>
        </div>

        {!showBest && (
          <>
            <FullDayStrip strip={strip} />

            <RiskWarning state={state} today={today} />

            <DayPicker today={today} editing={editing} onPick={setEditing} />

            {editing !== today && (
              <Note className="editing-past">{t('main.editingPast', { day: dayLabel(editing, today) })}</Note>
            )}

            {habits.length === 0 && <Note>{en['settings.habits.empty']}</Note>}

            <div className="checkins">
              {habits.map((habit, i) =>
                editingId === habit.id ? (
                  <HabitEditor
                    key={habit.id}
                    initial={editableFields(habit)}
                    {...(effectiveColor(habit) === undefined ? {} : { color: effectiveColor(habit) as string })}
                    move={{
                      ...(i > 0 ? { up: () => onMoveHabit(habit.id, -1) } : {}),
                      ...(i < habits.length - 1 ? { down: () => onMoveHabit(habit.id, 1) } : {}),
                    }}
                    onCancel={() => setEditingId(null)}
                    onSave={(input) => {
                      onUpdateHabit(habit.id, {
                        title: input.title,
                        importance: input.importance,
                        cadence: input.cadence,
                        emoji: input.emoji ?? null,
                        note: input.note ?? null,
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
                    onEdit={() => setEditingId(habit.id)}
                    onRemove={() => onRemoveHabit(habit.id)}
                  />
                ),
              )}

              <button type="button" className="checkin add-habit" onClick={() => setAdding('picker')}>
                <span className="checkin-box">
                  <PlusGlyph />
                </span>
                <span className="checkin-main">
                  <span className="label">{en['main.add']}</span>
                </span>
              </button>
            </div>
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
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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

  // Two tap targets, not one (docs/onboarding/05-revisions.md §3): the box
  // ticks, the title expands. The same split DomainCatalog's rows use, so a
  // row reads the same in both places.
  const note = habitNote(habit);

  return (
    <Card className={[due ? 'checkin' : 'checkin collapsed', expanded ? 'expanded' : ''].join(' ').trim()}>
      <label className="checkin-box" aria-label={habitTitle(habit, en['settings.habits.title.placeholder'])}>
        <Checkbox checked={checked} onChange={onToggle} />
      </label>

      <button type="button" className="checkin-main" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
        <span className="label" style={color === undefined ? undefined : { color }}>
          {habit.emoji ? `${habit.emoji} ` : ''}
          {habitTitle(habit, en['settings.habits.title.placeholder'])}
        </span>
        {!expanded && !due && (
          <span className={rest ? 'lastHit rest' : 'lastHit'}>
            {rest ? en['main.restDay'] : last ? t('main.lastHit', { date: last }) : en['main.neverHit']}
          </span>
        )}
        {!expanded && due && streak > 1 && <span className="lastHit">{t('habits.streak', { count: streak })}</span>}
      </button>

      {/* On the row's own line, where the streak was: the two actions are
          what the row was opened for, and the streak is decoration. Putting
          them beside it instead would squeeze the title, which is the one
          thing expanding must not move. */}
      {expanded && (
        <div className="habit-menu">
          <Button small className="icon-action" aria-label={en['habits.menu.edit']} onClick={onEdit}>
            <PencilGlyph />
          </Button>
          <Button small className="icon-action" aria-label={en['settings.habits.remove']} onClick={onRemove}>
            <TrashGlyph />
          </Button>
        </div>
      )}

      {expanded && note && <Note>{note}</Note>}
    </Card>
  );
}

/**
 * The line a row expands to: the user's own if they have written one,
 * otherwise the catalogue's. Editing a catalogue habit copies the catalogue
 * note into the form, so clearing the field is how you get back to no line
 * at all rather than silently restoring the original.
 */
function habitNote(habit: UserHabit): string | undefined {
  if (habit.note !== undefined) return habit.note;
  return habit.catalogId === undefined ? undefined : catalogById(habit.catalogId)?.note;
}

function editableFields(habit: UserHabit): WrittenHabitFields {
  const fields: WrittenHabitFields = {
    title: habit.title,
    importance: habit.importance,
    cadence: habit.cadence,
  };
  if (habit.emoji !== undefined) fields.emoji = habit.emoji;
  const note = habitNote(habit);
  if (note !== undefined) fields.note = note;
  return fields;
}

/** Relative names for the near past, for prose. */
function dayLabel(date: DateKey, today: DateKey): string {
  const age = diffDays(today, date);
  if (age === 0) return en['main.day.today'];
  if (age === 1) return en['main.day.yesterday'];
  // Pinned to en-GB rather than the device locale: every other string in the
  // app is English, and a Dutch phone was rendering "zondag" inside an
  // English sentence.
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
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
