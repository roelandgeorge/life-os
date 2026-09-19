import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

/**
 * `.checkin`, `.risk-warning` — a raised or bordered box.
 * `interactive` renders a `<label>` instead of a `<div>` for a card that
 * wraps its own control (the check-in row wraps its checkbox), so a tap
 * anywhere on the card reaches the control without a click handler of its
 * own. Not a polymorphic `as` — the tag is one of exactly two, chosen by a
 * boolean the card's own content already implies.
 */
export type CardProps =
  | ({ interactive: true; children: ReactNode } & Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'>)
  | ({ interactive?: false; children: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'children'>);

export function Card(props: CardProps) {
  if (props.interactive) {
    const { interactive: _interactive, ...rest } = props;
    return <label {...rest} />;
  }
  const { interactive: _interactive, ...rest } = props;
  return <div {...rest} />;
}
