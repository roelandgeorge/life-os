/**
 * The one drawing primitive: smooth curves through computed points.
 *
 * §4 forbids sprite sets and discrete states, which in practice means no hand
 * authored `d` attributes — a literal path cannot interpolate. Every outline in
 * the avatar is instead a list of points derived from identity and parameters,
 * run through a Catmull-Rom spline. Move any input and the whole outline
 * deforms continuously, because there is nothing else it could do.
 */

export type Pt = readonly [number, number];

export function pt(x: number, y: number): Pt {
  return [x, y];
}

export function mixPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Mirror a point across a vertical axis. Faces are built one side at a time. */
export function flipX(p: Pt, axis = 0): Pt {
  return [2 * axis - p[0], p[1]];
}

function n(v: number): string {
  // Three decimals is well under a pixel at any sane render size, and keeps the
  // DOM small enough that re-rendering on every animation frame stays cheap.
  return (Math.round(v * 1000) / 1000).toString();
}

/**
 * Catmull-Rom through `pts`, emitted as cubic Béziers.
 * `tension` 0 collapses to straight lines, 1 is the standard smooth spline.
 */
function segments(pts: readonly Pt[], closed: boolean, tension: number): string {
  const last = pts.length - 1;
  const at = (i: number): Pt => {
    if (closed) return pts[(i + pts.length) % pts.length] as Pt;
    return pts[Math.max(0, Math.min(last, i))] as Pt;
  };

  const parts: string[] = [];
  const end = closed ? pts.length : last;
  for (let i = 0; i < end; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    parts.push(`C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`);
  }
  return parts.join(' ');
}

export function closedSpline(pts: readonly Pt[], tension = 1): string {
  if (pts.length < 3) return '';
  const [first] = pts as [Pt];
  return `M ${n(first[0])} ${n(first[1])} ${segments(pts, true, tension)} Z`;
}

export function openSpline(pts: readonly Pt[], tension = 1): string {
  if (pts.length < 2) return '';
  const [first] = pts as [Pt];
  return `M ${n(first[0])} ${n(first[1])} ${segments(pts, false, tension)}`;
}

/**
 * A closed outline built from a left-hand profile: the points are mirrored and
 * reversed to produce the right side. Faces, torsos and hair are all symmetric
 * about the figure's centre line, so only half of each ever needs describing.
 *
 * A point that already sits *on* the axis is its own mirror, so emitting it
 * twice would put a duplicate knot in the spline and pinch the curve. A point
 * that does not — the top of a neck, the hem of a shirt — must keep its mirror,
 * or the ring closes across the wrong pair of points and the shape comes out
 * lopsided. Hence the per-end check rather than a blanket slice.
 */
export function mirrored(left: readonly Pt[], axis = 0, tension = 1): string {
  const right = [...left].reverse().map((p) => flipX(p, axis));
  const onAxis = (p: Pt | undefined) => p !== undefined && Math.abs(p[0] - axis) < 1e-6;

  const from = onAxis(right[0]) ? 1 : 0;
  const to = onAxis(right[right.length - 1]) ? right.length - 1 : right.length;
  return closedSpline([...left, ...right.slice(from, to)], tension);
}

/**
 * Displace points along a sine, for hair curl and frayed edges.
 * `seed` shifts the phase so two calls do not produce identical wobble.
 */
export function wobble(pts: readonly Pt[], amount: number, freq = 1, seed = 0): Pt[] {
  if (amount === 0) return [...pts];
  return pts.map((p, i) => {
    const phase = (i * freq + seed) * 2.399963; // golden angle: no visible period
    return [p[0] + Math.cos(phase) * amount, p[1] + Math.sin(phase) * amount] as Pt;
  });
}
