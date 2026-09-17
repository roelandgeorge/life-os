import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import artwork from './artwork.json';

const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'avatar');

function pngsIn(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.png'));
  } catch {
    return [];
  }
}

describe('artwork.json', () => {
  it('matches public/avatar/ — run `npm run manifest` after dropping a file in', () => {
    const root = pngsIn(AVATAR_DIR);
    const variant = pngsIn(join(AVATAR_DIR, 'you')).map((f) => `you/${f}`);
    const expected = [...root, ...variant].sort();
    expect([...(artwork as string[])].sort()).toEqual(expected);
  });
});
