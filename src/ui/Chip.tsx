import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** `.chips` / `.chips.cadence` / `.day-picker` — a row of toggle buttons. */
export function ChipRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={['chips', className].filter(Boolean).join(' ')}>{children}</div>;
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
}

export function Chip({ on, className, type = 'button', ...rest }: ChipProps) {
  const classes = [on && 'on', className].filter(Boolean).join(' ');
  return <button type={type} className={classes || undefined} {...rest} />;
}
