/**
 * A domain's own catalogue (docs/onboarding/04-revisions.md §6), opened from
 * that domain's group on Home — the only route into the catalogue now that
 * cross-domain Discover is gone. A domain the user never turned on has no
 * group on Home and therefore no way in here, which is deliberate.
 *
 * Each row is collapsed to its title and an effort marker (§7, §8); tapping
 * it expands the catalogue `note` and nothing else — cadence, importance and
 * evidence stay out of view entirely. Adding is one tap regardless of
 * whether the row is expanded. "Write your own" at the bottom opens
 * `WriteHabitForm`, pre-filled with this domain (§9); `MainScreen` reuses the
 * same form, pre-filled from the habit instead, to edit one the user wrote.
 */

import { useState } from 'react';
import { catalogFor, type Cadence, type CatalogItem, type Effort } from '../core/catalog';
import { getDomain, type DomainKey } from '../core/domains';
import {
  canAddCustomHabit,
  catalogFilterFor,
  completedCatalogIds,
  CUSTOM_IMPORTANCE,
  MAX_HABIT_TITLE_LENGTH,
} from '../core/habits';
import type { NewCustomHabitInput } from '../core/habits';
import type { AppState } from '../core/types';
import { en, t, type I18nKey } from '../i18n/en';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip, ChipRow } from '../ui/Chip';
import { Note } from '../ui/Note';

const NAMED_CADENCES: readonly Cadence[] = ['daily', 'weekly', 'monthly'];

function cadenceLabel(c: Cadence): I18nKey | null {
  if (c === 'daily') return 'settings.habits.cadence.daily';
  if (c === 'weekly') return 'settings.habits.cadence.weekly';
  if (c === 'monthly') return 'settings.habits.cadence.monthly';
  return null;
}

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

const IMPORTANCE_LABEL: Record<'important' | 'medium' | 'notImportant', I18nKey> = {
  important: 'domainCatalog.write.importance.important',
  medium: 'domainCatalog.write.importance.medium',
  notImportant: 'domainCatalog.write.importance.notImportant',
};

export function WriteHabitForm({
  domain,
  initial,
  onCancel,
  onSave,
}: {
  domain: DomainKey;
  initial?: { title: string; importance: number; cadence: Cadence; emoji?: string };
  onCancel: () => void;
  onSave: (input: NewCustomHabitInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [importance, setImportance] = useState(initial?.importance ?? 3);
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'daily');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const input: NewCustomHabitInput = { title: trimmed, importance, cadence, domain };
    const trimmedEmoji = emoji.trim();
    if (trimmedEmoji) input.emoji = trimmedEmoji;
    onSave(input);
  }

  return (
    <div className="write-habit-form">
      <input
        type="text"
        maxLength={MAX_HABIT_TITLE_LENGTH}
        placeholder={en['domainCatalog.write.title.placeholder']}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <ChipRow className="chips">
        {CUSTOM_IMPORTANCE.map(({ value, key }) => (
          <Chip key={key} on={importance === value} onClick={() => setImportance(value)}>
            {en[IMPORTANCE_LABEL[key]]}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow className="chips cadence">
        {NAMED_CADENCES.map((c) => {
          const label = cadenceLabel(c);
          if (!label) return null;
          return (
            <Chip key={String(c)} on={cadence === c} onClick={() => setCadence(c)}>
              {en[label]}
            </Chip>
          );
        })}
      </ChipRow>
      <input
        type="text"
        maxLength={4}
        placeholder={en['domainCatalog.write.emoji.placeholder']}
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
      />
      <div className="row">
        <Button onClick={onCancel}>{en['action.cancel']}</Button>
        <Button variant="primary" onClick={save}>
          {initial ? en['domainCatalog.edit.save'] : en['domainCatalog.write.save']}
        </Button>
      </div>
    </div>
  );
}

function CatalogRow({
  item,
  added,
  expanded,
  onToggleExpand,
  onAdd,
}: {
  item: CatalogItem;
  added: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdd: () => void;
}) {
  return (
    <Card className={expanded ? 'catalog-row expanded' : 'catalog-row'}>
      <button type="button" className="catalog-row-main" onClick={onToggleExpand}>
        <span className="catalog-row-title">{item.title}</span>
        <EffortMarker effort={item.effort} />
      </button>
      <Button
        small
        {...(added ? {} : { variant: 'primary' as const })}
        disabled={added}
        aria-label={t('domainCatalog.add', { title: item.title })}
        onClick={onAdd}
      >
        {added ? en['domainCatalog.added'] : '+'}
      </Button>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const addedIds = new Set<string>();
  for (const h of state.habits) {
    if (h.removedDate === undefined && h.catalogId !== undefined) addedIds.add(h.catalogId);
  }

  const filter = catalogFilterFor(state.profile);
  const items = catalogFor(domain, { ...filter, completed: completedCatalogIds(state.habits, state.logs) }).filter(
    (item) => item.kind === 'habit',
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
            added={addedIds.has(item.id)}
            expanded={expanded === item.id}
            onToggleExpand={() => setExpanded((current) => (current === item.id ? null : item.id))}
            onAdd={() => onAddHabit(item.id)}
          />
        ))}
      </div>

      {writing ? (
        <WriteHabitForm
          domain={domain}
          onCancel={() => setWriting(false)}
          onSave={(input) => {
            onAddCustom(input);
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
