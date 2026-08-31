/** Small numeric helpers shared by the scoring engine and the visual mapping. */

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse lerp, clamped. Returns 0 when `x <= a`, 1 when `x >= b`. */
export function invLerp(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  return clamp01((x - a) / (b - a));
}

/** Hermite ease. Used for tier crossfades so a boundary has no visible seam. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}
