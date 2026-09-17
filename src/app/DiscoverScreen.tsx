/**
 * Discover (§4.7 of docs/plan/phase-4.md): a full-screen sub-view pushed from
 * Settings, replacing the single native `<select>` the catalogue add flow
 * used before. Adding only — removal stays in Settings' habit editor, where
 * it already exists, so nothing here can soft-delete a habit by accident.
 *
 * Shows `kind: 'habit'` only. Milestones, challenges and reminders are
 * phase 6 concepts with their own homes coming — offering them as habits
 * here would be a category error, since a milestone is not a recurring tick.
 */

import { useState } from 'react';
import { catalogFor } from '../core/catalog';
import { orderedDomains } from '../core/domains';
import { catalogFilterFor, doneCatalogIds } from '../core/habits';
import type { AppState } from '../core/types';
import { en, type I18nKey } from '../i18n/en';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Note } from '../ui/Note';
import { SectionHeading } from '../ui/SectionHeading';
import { HabitPicker, type PickerItem } from './HabitPicker';
import type { NewHabitSource } from './useLifeOS';

export function DiscoverScreen({
  state,
  onAddHabit,
  onClose,
}: {
  state: AppState;
  onAddHabit: (source: NewHabitSource) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const addedIds = new Set<string>();
  for (const h of state.habits) {
    if (h.removedDate === undefined && h.catalogId !== undefined) addedIds.add(h.catalogId);
  }
  const filter = catalogFilterFor(state.profile, doneCatalogIds(state.logs, state.habits));
  const q = query.trim().toLowerCase();

  const sections = orderedDomains(state.profile?.domainOrder)
    .map((domain) => {
      const items = catalogFor(domain.key, filter).filter(
        (item) => item.kind === 'habit' && (q === '' || item.title.toLowerCase().includes(q)),
      );
      return { domain, items };
    })
    .filter((section) => section.items.length > 0);

  return (
    <div className="discover-screen">
      <div className="discover-header">
        <Button onClick={onClose}>{en['discover.back']}</Button>
        <h1 className="headline">{en['discover.title']}</h1>
      </div>

      <Field label={en['discover.search.label']}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={en['discover.search.placeholder']}
        />
      </Field>

      {sections.length === 0 && <Note>{en['discover.empty']}</Note>}

      {sections.map(({ domain, items }) => {
        const pickerItems: PickerItem[] = items.map((item) => ({
          item,
          checked: addedIds.has(item.id),
          locked: addedIds.has(item.id),
        }));
        return (
          <section key={domain.key}>
            <SectionHeading className="domain-heading">{en[domain.label as I18nKey]}</SectionHeading>
            <HabitPicker items={pickerItems} onToggle={(id) => onAddHabit({ catalogId: id })} />
          </section>
        );
      })}
    </div>
  );
}
