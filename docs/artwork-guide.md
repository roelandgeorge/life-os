# The artwork guide

What to draw, at what size, saved as what filename, so `npm run slice` and
`npm run manifest` turn it into what the app shows. Read `docs/plan/phase-2.md`
first for *why* the scene is shaped this way. This document is only the
*what*.

## The scene

Five slots, three of them behind a variant fallback chain. The frame is
`682 × 1033`, everything below is in that frame's own pixels, not screen
pixels.

```
+-----------------------------------+
|        wealth  (band, box)        |   0,0, 682×401
+------------------+----------------+
| body   (box)     | network (box)  |   0,401, 409×632   409,401, 273×632
|   [head]         |   [partner]    |
|   overlay        |   overlay      |
+------------------+----------------+
```

| Slot | Kind | Rect (x, y, w, h) | Variants |
|---|---|---|---|
| `wealth` | box | 0, 0, 682, 401 | none |
| `body` | box | 0, 401, 409, 632 | gender |
| `network` | box | 409, 401, 273, 632 | none |
| `head` | overlay, on `body` | 123, 439, 164, 164 | gender, hair |
| `partner` | overlay, on `network` | 491, 515, 169, 518 | gender, hair |

`head` and `partner` are drawn on transparency and composited into that
exact rect over the box behind them: the frame the drawing itself must be
made against, not just where the app happens to place it. `wealth` and
`network` have no variants, so it's one drawing per state, full stop.

**Two gaps, both deliberate, both written down here rather than left to be
rediscovered** (docs/onboarding/04-revisions.md §4 and its "Hair 'none'"
decision):

- The onboarding rebuild never asks the partner's appearance — no question,
  no Settings control. `scene.json`'s partner slot keeps its `gender`/`hair`
  variant axes (the drawing system itself is untouched), but with nothing in
  `Profile.partner` ever setting them, the resolver's fallback chain lands
  every time on the one default variant (`DEFAULT_APPEARANCE` in
  `scene.json`, currently male/blond). Only **five of the twenty** partner
  drawings below are reachable until something asks for the rest.
- `Hair` gained a `'none'` value with no drawing planned anywhere in this
  guide. Nothing here lists a bare `head.png`, so the resolver's fallback
  chain (`head-{gender}-none` → `head-{gender}` → `head`) runs out and a
  bald choice renders no head overlay at all — the same as before any head
  art exists. `head-male-none1.png` through `head-female-none5.png` (ten
  files, listed in the checklist below) close that gap if drawn; nothing
  else needs to change for them to take effect.

## The fourteen sheets

Draw five states per sheet, one image, states side by side, **worst on the
left, best on the right**, and save it under the exact name below. Sheet
width is the slot's rect width times 5. Height is the rect height,
unchanged. Twelve of these are the original set; the two `head-*-none`
sheets close the `Hair: 'none'` gap noted above and are optional in the
sense that nothing breaks without them, not in the sense that they're less
real — a bald choice renders no head at all until they exist.

| Sheet file | Save to | Canvas (w × 5 × h) |
|---|---|---|
| `wealth.png` | `public/avatar/` | 3410 × 401 |
| `network.png` | `public/avatar/` | 1365 × 632 |
| `body-male.png` | `public/avatar/you/` | 2045 × 632 |
| `body-female.png` | `public/avatar/you/` | 2045 × 632 |
| `head-male-blond.png` | `public/avatar/you/` | 820 × 164 |
| `head-male-dark.png` | `public/avatar/you/` | 820 × 164 |
| `head-female-blond.png` | `public/avatar/you/` | 820 × 164 |
| `head-female-dark.png` | `public/avatar/you/` | 820 × 164 |
| `head-male-none.png` | `public/avatar/you/` | 820 × 164 |
| `head-female-none.png` | `public/avatar/you/` | 820 × 164 |
| `partner-male-blond.png` | `public/avatar/you/` | 845 × 518 |
| `partner-male-dark.png` | `public/avatar/you/` | 845 × 518 |
| `partner-female-blond.png` | `public/avatar/you/` | 845 × 518 |
| `partner-female-dark.png` | `public/avatar/you/` | 845 × 518 |

`wealth` and `network` carry no state (start halfway, worst on the left),
five distinct depictions of "wealth" or "network" going from thin to
thriving. `body`, `head` and `partner` are the same figure across all five,
only their circumstances degrading or improving left to right.

Already have five separate images per sheet instead of one wide one? Name
them `<stem>1.png` through `<stem>5.png` directly and skip slicing, see "The
pipeline" below.

## One style preamble, byte-identical every time

Prepend this exact paragraph to every prompt, unchanged, so the fourteen
sheets read as one wardrobe rather than fourteen unrelated illustrations:

> Grainy editorial illustration. Muted, desaturated palette with a single
> warm bronze accent. Fine halftone film grain over the whole image. Soft
> directional light from the upper left, no hard outlines, no cel-shading.
> Background a near-black `#0B0E14`, flat, no gradient, no props or set
> dressing beyond what's specified. Editorial magazine illustration, not
> photorealism, not anime, not flat vector.

This is also the palette phase 3's dark-editorial design system is built
around, matching it now means the art does not need redoing when that
phase lands.

## Per-slot prompt skeletons

Fill in the bracketed part. Keep the preamble and the registration rule
verbatim.

**wealth** (no figure, a scene)
> [preamble]. Five panels left to right on one canvas, each `682×401`,
> depicting financial circumstance from precarious to thriving: [state 1
> description] … [state 5 description]. No people, no faces, objects,
> interiors or settings only.

**network** (no figure, a scene)
> [preamble]. Five panels left to right on one canvas, each `273×632`,
> depicting a social world from isolated to richly connected: [state 1] …
> [state 5]. No single identifiable protagonist, a crowd, a room, a table.

**body-{gender}**
> [preamble]. Five panels left to right on one canvas, each `409×632`, the
> same [male/female] figure drawn neck-down, from a slouched, depleted
> physique to a strong, well-kept one. Cropped at the neck, no head in
> frame. Full body, standing, facing camera, centred in each panel.

**head-{gender}-{hair}**
> [preamble]. Five panels left to right on one canvas, each `164×164`, the
> same [male/female] figure's head and face with [blond/dark/no] hair, from a
> tired, unkempt expression to a clear, well-rested one. Face fills the
> frame, chin at a fixed height (see registration below). Transparent
> background, figure only, nothing behind it.

**partner-{gender}-{hair}**
> [preamble]. Five panels left to right on one canvas, each `169×518`, a
> [male/female] figure with [blond/dark] hair, full height, from distant and
> withdrawn to warm and present. Standing, facing camera, feet at the
> bottom edge of the frame. Transparent background, figure only, nothing
> behind it.

## Registration

The three figure slots have to land on their fixed rect without per-drawing
adjustment, so:

- **Body** is drawn **neck-down**, in the fixed `409×632` frame, standing,
  centred, feet at the bottom edge. No head, the `head` overlay supplies it.
- **Head** fills the fixed `164×164` square with the **chin at a fixed
  height**: roughly 80% down the frame, so the face reads as sitting just
  above where the body's neck is cropped when composited.
- **Partner** is a **full-height cut-out on a fixed baseline**: feet at the
  bottom edge of the `169×518` frame, same standing pose logic as body.

Every state of a slot must share its own frame's dimensions exactly, or the
five states jump when the picture steps between them.

## Alpha is not optional

`head` and `partner` sheets **must carry a real alpha channel**, transparent
outside the figure, not a white or black matte pretending to be background.
A matte shows as a visible box the moment it's composited over `body` or
`network`. If your generator only outputs a flat background, remove it in an
editor (or ask for "transparent background, PNG with alpha") before slicing.
`compress-artwork.mjs` refuses to drop the alpha channel on these files even
if a particular state happens to render fully opaque, but it can't add
transparency that was never there.

`wealth`, `network` and `body` are opaque boxes and need no alpha at all.

## The pipeline

```bash
# drop sheets into public/avatar/ (wealth, network) and
# public/avatar/you/ (body-*, head-*, partner-*), named as above, then:
npm run slice      # cuts every sheet into <stem>1..5.png, alpha preserved
npm run compress    # losslessly shrinks them
npm run manifest    # regenerates src/content/artwork.json, run this last
npm test            # artwork.test.ts fails loudly if manifest is stale
```

`slice` and `placeholders` both already chain `manifest` at the end, so
after slicing you normally only need `npm run compress && npm run manifest`.
Drop one file at a time. The fallback chain in `visual/scene.ts` means a
slot with no drawing yet just doesn't render (an overlay) or keeps its
shared fallback (a box), never a broken image.

## Checklist, all seventy files

Box slots (`public/avatar/`):

- [ ] `wealth1.png` through `wealth5.png`
- [ ] `network1.png` through `network5.png`

Variant slots (`public/avatar/you/`):

- [ ] `body-male1.png` through `body-male5.png`
- [ ] `body-female1.png` through `body-female5.png`
- [ ] `head-male-blond1.png` through `head-male-blond5.png`
- [ ] `head-male-dark1.png` through `head-male-dark5.png`
- [ ] `head-female-blond1.png` through `head-female-blond5.png`
- [ ] `head-female-dark1.png` through `head-female-dark5.png`
- [ ] `head-male-none1.png` through `head-male-none5.png` — closes the
      `Hair: 'none'` gap above; not part of the original ten variant groups
- [ ] `head-female-none1.png` through `head-female-none5.png` — same
- [ ] `partner-male-blond1.png` through `partner-male-blond5.png` — only
      this one partner variant is reachable until something asks for the
      partner's appearance (see the gap noted above)
- [ ] `partner-male-dark1.png` through `partner-male-dark5.png`
- [ ] `partner-female-blond1.png` through `partner-female-blond5.png`
- [ ] `partner-female-dark1.png` through `partner-female-dark5.png`

Twelve groups of five, plus the two box groups: seventy files. Nothing has
to arrive at once, the app renders correctly with any subset of this list
present, falling back one rung for whatever's still missing.
