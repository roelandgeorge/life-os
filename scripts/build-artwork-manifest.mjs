#!/usr/bin/env node
/**
 * Scans public/avatar/ and public/avatar/you/ and writes the plain list of
 * files that exist to src/content/artwork.json.
 *
 *   npm run manifest
 *
 * scene.ts's resolver reads that list rather than the filesystem, so the same
 * fallback logic runs in the browser and in tests. Chained onto `slice` and
 * `placeholders`, so dropping one drawing in and running either keeps the
 * inventory honest — a file dropped in without regenerating fails
 * `artwork.test.ts` instead of failing silently in the browser.
 */

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AVATAR_DIR = join(ROOT, 'public', 'avatar');
const YOU_DIR = join(AVATAR_DIR, 'you');
const OUT = join(ROOT, 'src', 'content', 'artwork.json');

function pngsIn(dir) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.png'));
  } catch {
    return [];
  }
}

const root = pngsIn(AVATAR_DIR);
const variant = pngsIn(YOU_DIR).map((f) => `you/${f}`);
const files = [...root, ...variant].sort();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(files, null, 2) + '\n');
console.log(`wrote ${files.length} entries to ${OUT}`);
