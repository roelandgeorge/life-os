#!/usr/bin/env node
/**
 * Slices contact sheets into the individual artwork states.
 *
 *   npm run slice
 *
 * Drop one sheet per layer in public/avatar/, named after the layer:
 * achtergrond.png, lief.png, user.png. Each sheet holds the
 * five states side by side, worst on the left, best on the right. This writes
 * user1.png … user5.png and so on, which is what the app loads.
 *
 * Already have the five states as separate files? Then you do not need this —
 * just name them <layer>1.png … <layer>5.png and drop them in.
 *
 * Generating five states in one image keeps them far more consistent than
 * five separate prompts — the model draws them as a set rather than as five
 * unrelated pictures. Slicing is the price of that, and it is cheap.
 *
 * Aspect-agnostic on purpose: whatever the generator hands back, the panel
 * width is simply the sheet width divided by five.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatar');
const LAYERS = ['achtergrond', 'lief', 'user'];
const STATES = 5;

let sliced = 0;

for (const layer of LAYERS) {
  const sheet = join(AVATAR_DIR, `${layer}.png`);
  if (!existsSync(sheet)) {
    console.warn(`skipped ${layer}: no ${layer}.png in public/avatar/`);
    continue;
  }

  const image = sharp(sheet);
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error(`${layer}.png has no readable dimensions`);

  const panelWidth = Math.floor(width / STATES);
  if (panelWidth < 1) throw new Error(`${layer}.png is too narrow to hold ${STATES} states`);
  if (width % STATES !== 0) {
    // Not fatal — a stray column or two is normal from a generator — but the
    // panels will drift rightward if it is large, so say so.
    console.warn(`${layer}.png: width ${width} is not divisible by ${STATES}, cropping ${width % STATES}px`);
  }

  for (let i = 0; i < STATES; i++) {
    const out = join(AVATAR_DIR, `${layer}${i + 1}.png`);
    await sharp(sheet)
      .extract({ left: i * panelWidth, top: 0, width: panelWidth, height })
      .png()
      .toFile(out);
    sliced++;
  }
  console.log(`${layer}: ${STATES} states at ${panelWidth}x${height}`);
}

console.log(sliced ? `\nwrote ${sliced} images to public/avatar/` : '\nnothing to slice');
