/**
 * The 10 catalogue domains (§1.1, §1.2 of docs/plan/phase-1.md), and which of
 * the 5 panels each one drives.
 *
 * Domains are data, not code — nothing downstream may branch on a domain key.
 * `DomainKey` is owned by `core/catalog.ts` (the catalogue needed it first);
 * this module re-exports it so nothing else has to know that.
 */

import type { DomainKey } from './catalog';
export type { DomainKey } from './catalog';
export { DOMAIN_KEYS } from './catalog';

/**
 * The five panels the avatar renders from (§1.1 "5 delen"). `visual/layers.ts`
 * holds the temporary adapter from these onto the 3 PNG sets that exist today;
 * phase 2 gives each panel its own artwork and that adapter goes away.
 */
export type PanelKey = 'body' | 'head' | 'network' | 'partner' | 'wealth';

export const PANEL_KEYS: readonly PanelKey[] = ['body', 'head', 'network', 'partner', 'wealth'];

/** A step (0-4) per panel — what `core/steps.ts` computes and the renderer consumes. */
export type PanelSteps = Record<PanelKey, number>;

export interface DomainConfig {
  key: DomainKey;
  /** i18n key into src/i18n/en.ts. The literal string lives there, not here. */
  label: string;
  color: string;
  /**
   * Which panel(s) this domain moves. A domain can drive more than one
   * (sleep and nutrition both feed body and head); a domain with an empty
   * list would be invisible in the same sense the old `visible: false` was,
   * but every current domain drives at least one.
   */
  panels: readonly PanelKey[];
}

export const DOMAINS: readonly DomainConfig[] = [
  { key: 'sleep', label: 'domain.sleep', color: '#7FA3D4', panels: ['body', 'head'] },
  { key: 'nutrition', label: 'domain.nutrition', color: '#D4785A', panels: ['body', 'head'] },
  { key: 'training', label: 'domain.training', color: '#D2A04A', panels: ['body'] },
  { key: 'appearance', label: 'domain.appearance', color: '#A39280', panels: ['body', 'head'] },
  { key: 'mindset', label: 'domain.mindset', color: '#9A8AC8', panels: ['head'] },
  { key: 'productivity', label: 'domain.productivity', color: '#72A88C', panels: ['head'] },
  { key: 'social', label: 'domain.social', color: '#C97AA2', panels: ['network'] },
  { key: 'hospitality', label: 'domain.hospitality', color: '#DE9179', panels: ['network'] },
  { key: 'family', label: 'domain.family', color: '#CF9257', panels: ['partner'] },
  { key: 'finance', label: 'domain.finance', color: '#6F95A3', panels: ['wealth'] },
] as const;

const BY_KEY = new Map<DomainKey, DomainConfig>(DOMAINS.map((d) => [d.key, d]));

export function getDomain(key: DomainKey): DomainConfig {
  const d = BY_KEY.get(key);
  if (!d) throw new Error(`Unknown domain: ${key}`);
  return d;
}

/** Every domain that feeds a given panel — the reverse of `DomainConfig.panels`. */
export function domainsForPanel(panel: PanelKey): readonly DomainConfig[] {
  return DOMAINS.filter((d) => d.panels.includes(panel));
}
