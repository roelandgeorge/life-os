/**
 * What each check-in box is called.
 *
 * The §5.3 defaults ("Slept 8 hours") are a guess at what a domain means to
 * whoever is using it. The real commitment is more specific than that — "went
 * to bed before 22:30" — and a box the user wrote themselves is both clearer
 * and harder to tick dishonestly. So the default is a starting point, not the
 * name.
 *
 * The domain key never changes. Only its label does, which is why this lives
 * in the app layer: the model has no opinion on what SLEEP is called.
 */

import type { DomainConfig, DomainKey } from '../core/domains';
import type { AppState } from '../core/types';
import { t, type I18nKey } from '../i18n/en';

/** Long enough for a real sentence, short enough to stay on one row. */
export const MAX_LABEL_LENGTH = 60;

export function defaultTaskLabel(domain: DomainConfig): string {
  return t(domain.label as I18nKey);
}

export function taskLabel(domain: DomainConfig, labels: AppState['taskLabels']): string {
  const custom = labels?.[domain.key]?.trim();
  return custom ? custom : defaultTaskLabel(domain);
}

/**
 * Stores exactly what was typed, minus nothing but excess length.
 *
 * It must not trim. The Settings field is a controlled input, so whatever
 * this returns is what the field shows on the very next render — trimming
 * here ate the space the moment it was typed, making multi-word labels
 * impossible to enter. Whitespace is meaningful *while* typing; `taskLabel`
 * trims when it displays, and import trims when it parses, which is where
 * trimming belongs.
 *
 * A field cleared to nothing drops the key, so the default comes back.
 */
export function withTaskLabel(
  labels: AppState['taskLabels'],
  key: DomainKey,
  raw: string,
): Partial<Record<DomainKey, string>> {
  const next = { ...labels };
  if (raw === '') delete next[key];
  else next[key] = raw.slice(0, MAX_LABEL_LENGTH);
  return next;
}
