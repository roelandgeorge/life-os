/**
 * §2.7 — "animate the affected visual parameters from current to preview over
 * ~600 ms and hold there." A tick's causal link to the avatar has to be felt,
 * not just eventually true.
 */

import { useEffect, useRef, useState } from 'react';
import { lerpParams, type AvatarParams } from '../visual/params';

const DURATION_MS = 600;

export function useAnimatedParams(target: AvatarParams): AvatarParams {
  const [displayed, setDisplayed] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = displayed;
    startRef.current = null;
    let raf = requestAnimationFrame(tick);

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / DURATION_MS);
      setDisplayed(lerpParams(fromRef.current, target, t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(raf);
    // Re-running only on `target` (not `displayed`) is the point: each new
    // preview restarts the animation from wherever the last one left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return displayed;
}
