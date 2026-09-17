/**
 * The catalogue item picker (§4.5 of docs/plan/phase-4.md) — the "earns a
 * file at two consumers" case, used by onboarding's starter step and by
 * `DiscoverScreen`. One `Card interactive` per item, holding a `Checkbox`,
 * the title, a metadata line and the catalogue note when it has one.
 */

import type { CatalogItem, Cadence, Effort, Evidence } from '../core/catalog';
import { en, t, type I18nKey } from '../i18n/en';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Note } from '../ui/Note';

export type PickerItem = { item: CatalogItem; checked: boolean; locked?: boolean };

const EFFORT_LABEL: Record<Effort, I18nKey> = {
  low: 'catalog.effort.low',
  medium: 'catalog.effort.medium',
  high: 'catalog.effort.high',
};

const EVIDENCE_LABEL: Record<Evidence, I18nKey> = {
  strong: 'catalog.evidence.strong',
  moderate: 'catalog.evidence.moderate',
  anecdotal: 'catalog.evidence.anecdotal',
};

function cadenceLabel(cadence: Cadence): string {
  if (cadence === 'daily') return en['catalog.cadence.daily'];
  if (cadence === 'weekly') return en['catalog.cadence.weekly'];
  if (cadence === 'monthly') return en['catalog.cadence.monthly'];
  if (cadence === 'situational') return en['catalog.cadence.situational'];
  if (cadence === 'once') return en['catalog.cadence.once'];
  return t('catalog.cadence.everyDays', { days: cadence.everyDays });
}

function metaLine(item: CatalogItem): string {
  return [
    cadenceLabel(item.cadence),
    t('catalog.importance', { n: item.importance }),
    en[EFFORT_LABEL[item.effort]],
    en[EVIDENCE_LABEL[item.evidence]],
  ].join(' · ');
}

export function HabitPicker({
  items,
  onToggle,
}: {
  items: readonly PickerItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="habit-picker">
      {items.map(({ item, checked, locked }) => (
        <Card interactive key={item.id} className={locked ? 'habit-picker-item locked' : 'habit-picker-item'}>
          <Checkbox
            checked={checked || locked === true}
            disabled={locked === true}
            onChange={() => onToggle(item.id)}
          />
          <div className="habit-picker-body">
            <span className="habit-picker-title">{item.title}</span>
            <span className="habit-picker-meta">
              {metaLine(item)}
              {locked && ` · ${en['settings.catalog.added']}`}
            </span>
            {item.note && <Note>{item.note}</Note>}
          </div>
        </Card>
      ))}
    </div>
  );
}
