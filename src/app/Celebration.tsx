/**
 * The one-off payoff for clearing every box due today: confetti and a medal,
 * over the whole screen, gone on its own a few seconds later.
 *
 * Purely decorative — it reads `allHabitsDone` (due.ts) through the caller
 * but knows nothing about domains, custom tasks or steps itself.
 */

import { useMemo } from 'react';
import { VISIBLE_DOMAINS } from '../core/domains';
import { en } from '../i18n/en';

const CONFETTI_COUNT = 36;
// The building blocks' own colours, so the celebration reads as belonging to
// the same picture rather than introducing a palette of its own.
const CONFETTI_COLORS = VISIBLE_DOMAINS.map((d) => d.color);

type Piece = { left: number; delay: number; duration: number; color: string };

export function Celebration() {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] as string,
      })),
    [],
  );

  return (
    <div className="celebration" role="status" aria-live="polite">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
          }}
        />
      ))}
      <div className="celebration-badge">
        <span className="celebration-medal" aria-hidden="true">
          🏅
        </span>
        <span className="celebration-text">{en['main.allDone']}</span>
      </div>
    </div>
  );
}
