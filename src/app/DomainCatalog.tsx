/**
 * A domain's own catalogue (docs/onboarding/04-revisions.md §6), opened from
 * that domain's group on Home — the only route into the catalogue now that
 * cross-domain Discover is gone. A domain the user never turned on has no
 * group on Home and therefore no way in here, which is deliberate.
 *
 * A row is the same `.checkin` shape Home uses (docs/onboarding/05-revisions.md
 * §4): the add button where Home puts its checkbox, the title as the tap
 * target that expands the catalogue `note`, an effort marker where Home puts
 * its streak. Cadence, importance and evidence stay out of view entirely
 * (§7, §8). Adding is one tap regardless of whether the row is expanded.
 *
 * A habit already on the list is not shown at all, so this screen is only
 * ever what is still on offer. "Write your own" at the bottom opens
 * `HabitEditor` as an empty row of the same shape; `MainScreen` uses the same
 * component in place of a habit's own row to edit it.
 */

import { useEffect, useRef, useState } from 'react';
import { catalogFor, type Cadence, type CatalogItem, type Effort } from '../core/catalog';
import { getDomain, type DomainKey } from '../core/domains';
import {
  CADENCE_CHOICES,
  canAddCustomHabit,
  DEFAULT_IMPORTANCE,
  catalogFilterFor,
  completedCatalogIds,
  MAX_HABIT_NOTE_LENGTH,
  MAX_HABIT_TITLE_LENGTH,
  sameCadence,
} from '../core/habits';
import type { NewCustomHabitInput, WrittenHabitFields } from '../core/habits';
import type { AppState } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip, ChipRow } from '../ui/Chip';
import { Note } from '../ui/Note';
import { CheckGlyph, CrossGlyph, PlusGlyph } from '../ui/Glyph';

const EFFORT_LEVEL: Record<Effort, number> = { low: 1, medium: 2, high: 3 };
const EFFORT_LABEL: Record<Effort, I18nKey> = {
  low: 'catalog.effort.low',
  medium: 'catalog.effort.medium',
  high: 'catalog.effort.high',
};

function EffortMarker({ effort }: { effort: Effort }) {
  const level = EFFORT_LEVEL[effort];
  return (
    <span className="effort-marker" title={en[EFFORT_LABEL[effort]]} aria-label={en[EFFORT_LABEL[effort]]}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= level ? 'effort-bar filled' : 'effort-bar'} />
      ))}
    </span>
  );
}

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
}: {
  className: string;
  value: string;
  onChange: (v: string) => void;
  onKey: (e: { key: string; preventDefault: () => void }) => void;
  maxLength: number;
  label: string;
  color?: string;
  autoFocus?: true;
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
  onCancel,
  onSave,
}: {
  initial?: WrittenHabitFields;
  /** The row's own title colour, so editing it does not repaint it. */
  color?: string;
  onCancel: () => void;
  onSave: (input: WrittenHabitFields) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'daily');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');

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
  }

  // Enter commits rather than breaking the line: these read as one-line
  // fields even though they wrap like the text they stand in for.
  function onKey(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') onCancel();
  }

  return (
    <Card className="checkin editing">
      <div className="checkin-box">
        <input
          className="emoji-field"
          type="text"
          maxLength={2}
          value={emoji}
          aria-label={en['habits.edit.emoji']}
          onChange={(e) => setEmoji(e.target.value)}
          onKeyDown={onKey}
        />
      </div>

      <div className="checkin-main">
        <GrowField
          className="label title-field"
          value={title}
          onChange={setTitle}
          onKey={onKey}
          maxLength={MAX_HABIT_TITLE_LENGTH}
          label={en['habits.edit.title.placeholder']}
          {...(color === undefined ? {} : { color })}
          autoFocus
        />
      </div>

      <div className="habit-menu">
        <Button small className="icon-action" aria-label={en['habits.edit.save']} onClick={save}>
          <CheckGlyph />
        </Button>
        <Button small className="icon-action" aria-label={en['action.cancel']} onClick={onCancel}>
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
    </Card>
  );
}

function CatalogRow({
  item,
  onAdd,
}: {
  item: CatalogItem;
  onAdd: () => void;
}) {
  // Per row, like `MainScreen`'s own rows: opening one does not shut another.
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className={expanded ? 'checkin expanded' : 'checkin'}>
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

      <button type="button" className="checkin-main" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
        <span className="label">{item.title}</span>
        <EffortMarker effort={item.effort} />
      </button>

      {expanded && item.note && <Note>{item.note}</Note>}
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
  const [writing, setWriting] = useState(false);

  const addedIds = new Set<string>();
  for (const h of state.habits) {
    if (h.removedDate === undefined && h.catalogId !== undefined) addedIds.add(h.catalogId);
  }

  const filter = catalogFilterFor(state.profile);
  const items = catalogFor(domain, { ...filter, completed: completedCatalogIds(state.habits, state.logs) }).filter(
    (item) => item.kind === 'habit' && !addedIds.has(item.id),
  );

  return (
    <div className="discover-screen domain-catalog">
      <div className="discover-header">
        <Button onClick={onClose}>{en['domainCatalog.back']}</Button>
        <h1 className="headline">{en[getDomain(domain).label as I18nKey]}</h1>
      </div>

      <div className="habit-picker">
        {items.map((item) => (
          <CatalogRow
            key={item.id}
            item={item}
            onAdd={() => onAddHabit(item.id)}
          />
        ))}
      </div>

      {writing ? (
        <HabitEditor
          onCancel={() => setWriting(false)}
          onSave={(input) => {
            onAddCustom({ ...input, domain });
            setWriting(false);
          }}
        />
      ) : (
        <Button
          className="write-habit-open"
          disabled={!canAddCustomHabit(state.habits)}
          onClick={() => setWriting(true)}
        >
          {en['domainCatalog.write.open']}
        </Button>
      )}
    </div>
  );
}
