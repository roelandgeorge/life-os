import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../core/domains';
import { contrastRatio, parseTokens } from './tokens';

const STYLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const TOKENS_CSS = readFileSync(join(STYLES_DIR, 'tokens.css'), 'utf8');
const tokens = parseTokens(TOKENS_CSS);

function token(name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`missing token: ${name}`);
  return value;
}

describe('tokens.css', () => {
  const names = [
    '--ground',
    '--surface',
    '--well',
    '--rule',
    '--rule-strong',
    '--paper',
    '--paper-dim',
    '--paper-faint',
    '--bronze',
    '--bronze-dim',
    '--on-bronze',
    '--danger',
    '--focus',
    '--grain',
    '--grain-size',
    '--space-0',
    '--space-1',
    '--space-2',
    '--space-3',
    '--space-4',
    '--space-5',
    '--space-6',
    '--space-7',
    '--text-xs',
    '--text-sm',
    '--text-base',
    '--text-lg',
    '--text-xl',
    '--text-2xl',
    '--leading-tight',
    '--leading-base',
    '--leading-loose',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--hairline',
    '--dur-fast',
    '--dur-base',
    '--ease',
    '--tap',
    '--z-tabbar',
    '--z-celebration',
  ];

  it.each(names)('defines %s', (name) => {
    expect(tokens[name]).toBeDefined();
  });

  it('clears 4.5:1 for every text token against the surface it is painted on', () => {
    expect(contrastRatio(token('--paper'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--paper-dim'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--paper-faint'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--bronze'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--on-bronze'), token('--bronze'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--danger'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--focus'), token('--surface'))).toBeGreaterThanOrEqual(4.5);
  });

  it('clears 4.5:1 for every domain colour against --surface', () => {
    const surface = token('--surface');
    for (const domain of DOMAINS) {
      expect(contrastRatio(domain.color, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the domain colours distinguishable — no two share a hue', () => {
    const colors = new Set(DOMAINS.map((d) => d.color.toLowerCase()));
    expect(colors.size).toBe(DOMAINS.length);
  });

  it('is the only file under src/styles/ with a colour literal', () => {
    const hexOrFunctionalColor = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/;
    const others = readdirSync(STYLES_DIR).filter((f) => f !== 'tokens.css' && f.endsWith('.css'));
    for (const file of others) {
      const css = readFileSync(join(STYLES_DIR, file), 'utf8');
      expect(css).not.toMatch(hexOrFunctionalColor);
    }
  });

  it('keeps --space-* strictly ascending', () => {
    const values = ['--space-0', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7'].map(
      (name) => parseFloat(token(name)),
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1] as number);
    }
  });

  it('keeps --text-* strictly ascending', () => {
    const values = ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl'].map((name) =>
      parseFloat(token(name)),
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1] as number);
    }
  });
});
