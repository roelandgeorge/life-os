import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * `.chips` / `.chips.cadence` / `.day-picker` — a row of toggle buttons.
 * `className` is the full class list (e.g. `"chips cadence"` or
 * `"day-picker"`): the two rows don't share a base rule today, so ChipRow
 * doesn't invent one by prefixing "chips" on their behalf.
 */
export function ChipRow({ className, children }: { className: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
}

export function Chip({ on, className, type = 'button', ...rest }: ChipProps) {
  const classes = [on && 'on', className].filter(Boolean).join(' ');
  return <button type={type} className={classes || undefined} {...rest} />;
}
