import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTokens } from './tokens';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOKENS_CSS = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const GROUND = parseTokens(TOKENS_CSS)['--ground'];
if (GROUND === undefined) throw new Error('tokens.css has no --ground');

const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/;

describe('the chrome the manifest and the icons read from tokens.css', () => {
  it("pins index.html's theme-color to --ground", () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const match = /<meta name="theme-color" content="([^"]+)"/.exec(html);
    expect(match?.[1]).toBe(GROUND);
  });

  it('reads the manifest colours from --ground rather than a second literal', () => {
    const config = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
    expect(config).not.toMatch(HEX_LITERAL);
    expect(config).toMatch(/background_color:\s*GROUND/);
    expect(config).toMatch(/theme_color:\s*GROUND/);
  });

  it('generate-icons.mjs contains no hex literal', () => {
    const script = readFileSync(join(ROOT, 'scripts', 'generate-icons.mjs'), 'utf8');
    expect(script).not.toMatch(HEX_LITERAL);
  });
});
