/**
 * The way into the catalogue (docs/plan/phase-5.md §5.4): Home's `+` row
 * opens `DomainPicker`, a list of all ten domains with the ones the user
 * already works on first, and picking one opens that domain's own catalogue.
 *
 * A row is the same `.checkin` shape Home uses (docs/onboarding/05-revisions.md
 * §4): the add button where Home puts its checkbox, then the title with the
 * catalogue `note` under it, always shown, since the note is what a choice
 * is made on. Cadence, importance and evidence stay out of view entirely
 * (§7, §8). Rows are listed most important first (`byImportance`).
 *
 * A habit already on the list is not shown at all, so this screen is only
 * ever what is still on offer. "Write your own" at the bottom is a
 * `HabitEditor` in standby: one empty field until it is tapped.
 * `MainScreen` uses the same component in place of a habit's own row to
 * edit it.
 */

import { useEffect, useRef, useState } from 'react';
import { byImportance, catalogFor, type Cadence, type CatalogItem } from '../core/catalog';
import { getDomain, orderedDomains, type DomainKey } from '../core/domains';
import {
  CADENCE_CHOICES,
  canAddCustomHabit,
  DEFAULT_IMPORTANCE,
  catalogFilterFor,
  completedCatalogIds,
  isActiveOn,
  MAX_HABIT_NOTE_LENGTH,
  MAX_HABIT_TITLE_LENGTH,
  sameCadence,
} from '../core/habits';
import type { NewCustomHabitInput, WrittenHabitFields } from '../core/habits';
import type { DateKey } from '../core/dates';
import type { AppState } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip, ChipRow } from '../ui/Chip';
import { Note } from '../ui/Note';
import { CheckGlyph, ChevronDownGlyph, ChevronUpGlyph, CrossGlyph, PlusGlyph } from '../ui/Glyph';

/**
 * Editing happens in the row, not in a panel under it
 * (docs/onboarding/07-revisions.md §3). The card keeps its surface, its
 * shape and its typography: the title and the line under it simply become
 * carets in the place they already occupied, and the only thing that
 * appears is the cadence. A dark form box below the row changed everything
 * about the row except the thing being edited.
 *
 * The same component writes a new habit, where the fields start empty. It
 * does not know the domain: the caller adds it when creating, and editing
 * never moves a habit between domains, because the domain decides which
 * panel the habit moves.
 */
/**
 * A field that is the text it replaces: no box, no background, and it wraps
 * and grows exactly as that text does. A single-line `<input>` scrolls a
 * long title out of view instead of wrapping it, which is the one thing the
 * read-mode row never does.
 */
function GrowField({
  className,
  value,
  onChange,
  onKey,
  maxLength,
  label,
  color,
  autoFocus,
  onFocus,
}: {
  className: string;
  value: string;
  onChange: (v: string) => void;
  onKey: (e: { key: string; preventDefault: () => void }) => void;
  maxLength: number;
  label: string;
  color?: string;
  autoFocus?: true;
  onFocus?: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);

  // Height follows content on every keystroke; reset to auto first or it can
  // only ever grow.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // The caret lands at the end of the existing text rather than selecting it:
  // this is an edit of something, not a replacement of it.
  useEffect(() => {
    if (!autoFocus) return;
    const el = field.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  return (
    <textarea
      ref={field}
      className={className}
      rows={1}
      maxLength={maxLength}
      placeholder={label}
      aria-label={label}
      value={value}
      style={color === undefined ? undefined : { color }}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => onKey(e)}
      onFocus={onFocus}
    />
  );
}

/**
 * Editing happens in the row, not in a panel under it
 * (docs/onboarding/07-revisions.md §3). The card keeps its surface, its
 * shape and its typography: the title and the line under it become carets
 * in the place they already occupied, and the only thing that appears is
 * the cadence. A dark form box below the row changed everything about the
 * row except the thing being edited.
 *
 * The same component writes a new habit, where the fields start empty. It
 * does not know the domain: the caller adds it when creating, and editing
 * never moves a habit between domains, because the domain decides which
 * panel the habit moves.
 */
export function HabitEditor({
  initial,
  color,
  move,
  standby,
  onCancel,
  onSave,
}: {
  initial?: WrittenHabitFields;
  /** The row's own title colour, so editing it does not repaint it. */
  color?: string;
  /**
   * Present when editing a habit already on the list. A direction left out
   * is a move that cannot happen (the first row up, the last down), drawn
   * disabled rather than hidden so the row does not shift. A move is saved
   * at once and is independent of the text: Cancel keeps it.
   */
  move?: { up?: () => void; down?: () => void };
  /**
   * "Write your own": the row waits as a single empty field and wakes when
   * that field is focused. The tap lands in a real field, because iOS opens
   * the keyboard only for a focus that happens inside the tap itself, not
   * for one made after a re-render. Save and Cancel return it to standby
   * rather than calling away.
   */
  standby?: true;
  onCancel?: () => void;
  onSave: (input: WrittenHabitFields) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'daily');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [awake, setAwake] = useState(!standby);
  const moveRow = useRef<HTMLDivElement>(null);
  const [moves, setMoves] = useState(0);

  // The list re-sorts under the editor on a move. The arrows are the row's
  // last line, so keeping them in view keeps the finger on them.
  useEffect(() => {
    if (moves > 0) moveRow.current?.scrollIntoView({ block: 'nearest' });
  }, [moves]);

  function moveBy(action: (() => void) | undefined) {
    if (!action) return;
    action();
    setMoves((n) => n + 1);
  }

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const input: WrittenHabitFields = {
      title: trimmed,
      importance: initial?.importance ?? DEFAULT_IMPORTANCE,
      cadence,
    };
    const trimmedEmoji = emoji.trim();
    if (trimmedEmoji) input.emoji = trimmedEmoji;
    const trimmedNote = note.trim();
    if (trimmedNote) input.note = trimmedNote;
    onSave(input);
    if (standby) toStandby();
  }

  function cancel() {
    if (standby) toStandby();
    else onCancel?.();
  }

  function toStandby() {
    setTitle('');
    setNote('');
    setCadence('daily');
    setEmoji('');
    setAwake(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  // Enter commits rather than breaking the line: these read as one-line
  // fields even though they wrap like the text they stand in for.
  function onKey(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') cancel();
  }

  return (
    <Card className={awake ? 'checkin editing' : 'checkin editing standby'}>
      {/* The box and the title keep their places in both states, so React
          keeps the same textarea, and its focus, when the row wakes. */}
      <div className="checkin-box">
        {awake ? (
          <input
            className="emoji-field"
            type="text"
            maxLength={2}
            value={emoji}
            aria-label={en['habits.edit.emoji']}
            onChange={(e) => setEmoji(e.target.value)}
            onKeyDown={onKey}
          />
        ) : (
          <span className="standby-mark">
            <PlusGlyph />
          </span>
        )}
      </div>

      <div className="checkin-main">
        <GrowField
          className="label title-field"
          value={title}
          onChange={setTitle}
          onKey={onKey}
          maxLength={MAX_HABIT_TITLE_LENGTH}
          label={awake ? en['habits.edit.title.placeholder'] : en['domainCatalog.write.open']}
          {...(color === undefined ? {} : { color })}
          {...(standby ? { onFocus: () => setAwake(true) } : { autoFocus: true as const })}
        />
      </div>

      {awake && (
        <>
          <div className="habit-menu">
            <Button small className="icon-action" aria-label={en['habits.edit.save']} onClick={save}>
              <CheckGlyph />
            </Button>
            <Button small className="icon-action" aria-label={en['action.cancel']} onClick={cancel}>
              <CrossGlyph />
            </Button>
          </div>

          <GrowField
            className="note-field"
            value={note}
            onChange={setNote}
            onKey={onKey}
            maxLength={MAX_HABIT_NOTE_LENGTH}
            label={en['habits.edit.note.placeholder']}
          />

          <ChipRow className="chips cadence">
            {CADENCE_CHOICES.map(({ key, cadence: option }) => (
              <Chip key={key} on={sameCadence(cadence, option)} onClick={() => setCadence(option)}>
                {en[`habits.cadence.${key}` as I18nKey]}
              </Chip>
            ))}
          </ChipRow>

          {move && (
            <div className="habit-move" ref={moveRow}>
              <Button
                small
                className="icon-action"
                aria-label={en['habits.edit.moveUp']}
                disabled={!move.up}
                onClick={() => moveBy(move.up)}
              >
                <ChevronUpGlyph />
              </Button>
              <Button
                small
                className="icon-action"
                aria-label={en['habits.edit.moveDown']}
                disabled={!move.down}
                onClick={() => moveBy(move.down)}
              >
                <ChevronDownGlyph />
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function CatalogRow({ item, onAdd }: { item: CatalogItem; onAdd: () => void }) {
  return (
    <Card className="checkin catalog-row">
      <div className="checkin-box">
        <Button
          small
          variant="primary"
          className="icon-action"
          aria-label={t('domainCatalog.add', { title: item.title })}
          onClick={onAdd}
        >
          <PlusGlyph />
        </Button>
      </div>

      <div className="checkin-main">
        <span className="label">{item.title}</span>
      </div>

      {item.note && <Note>{item.note}</Note>}
    </Card>
  );
}

export function DomainCatalog({
  domain,
  state,
  onAddHabit,
  onAddCustom,
  onClose,
}: {
  domain: DomainKey;
  state: AppState;
  onAddHabit: (catalogId: string) => void;
  onAddCustom: (input: NewCustomHabitInput) => void;
  onClose: () => void;
}) {
  const addedIds = new Set<string>();
  for (const h of state.habits) {
    if (h.removedDate === undefined && h.catalogId !== undefined) addedIds.add(h.catalogId);
  }

  const filter = catalogFilterFor(state.profile);
  const items = byImportance(
    catalogFor(domain, { ...filter, completed: completedCatalogIds(state.habits, state.logs) }).filter(
      (item) => item.kind === 'habit' && !addedIds.has(item.id),
    ),
  );

  return (
    <div className="discover-screen domain-catalog">
      <div className="discover-header">
        <Button onClick={onClose}>{en['domainCatalog.back']}</Button>
        <h1 className="headline">{en[getDomain(domain).label as I18nKey]}</h1>
      </div>

      <div className="habit-picker">
        {items.map((item) => (
          <CatalogRow key={item.id} item={item} onAdd={() => onAddHabit(item.id)} />
        ))}
      </div>

      {canAddCustomHabit(state.habits) ? (
        <div className="write-own">
          <HabitEditor standby onSave={(input) => onAddCustom({ ...input, domain })} />
        </div>
      ) : (
        <Button className="write-habit-open" disabled>
          {en['domainCatalog.write.open']}
        </Button>
      )}
    </div>
  );
}

/**
 * Every domain, the ones with at least one habit on the list first, each in
 * `Profile.domainOrder`'s order. A domain the user has never worked on is
 * here too: this is the one place to start on it from Home.
 */
export function DomainPicker({
  state,
  today,
  onPick,
  onClose,
}: {
  state: AppState;
  today: DateKey;
  onPick: (domain: DomainKey) => void;
  onClose: () => void;
}) {
  const counts = new Map<DomainKey, number>();
  for (const h of state.habits) {
    if (h.domain !== undefined && isActiveOn(h, today)) counts.set(h.domain, (counts.get(h.domain) ?? 0) + 1);
  }
  const ordered = orderedDomains(state.profile?.domainOrder);
  const domains = [...ordered.filter((d) => counts.has(d.key)), ...ordered.filter((d) => !counts.has(d.key))];

  return (
    <div className="discover-screen domain-picker">
      <div className="discover-header">
        <Button onClick={onClose}>{en['domainCatalog.back']}</Button>
        <h1 className="headline">{en['addHabit.title']}</h1>
      </div>

      <div className="habit-picker">
        {domains.map((domain) => {
          const count = counts.get(domain.key) ?? 0;
          return (
            <button key={domain.key} type="button" className="checkin domain-pick" onClick={() => onPick(domain.key)}>
              <span className="label" style={{ color: domain.color }}>
                {en[domain.label as I18nKey]}
              </span>
              {count > 0 && <span className="lastHit">{t('addHabit.count', { count })}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
