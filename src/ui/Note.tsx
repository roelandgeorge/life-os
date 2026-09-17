import type { ReactNode } from 'react';

/** `.note`, `.note.error`, `.subhead` — secondary text under a headline or a control. */
export function Note({
  variant,
  className,
  children,
}: {
  variant?: 'error' | 'subhead';
  className?: string;
  children: ReactNode;
}) {
  const base = variant === 'subhead' ? 'subhead' : 'note';
  const classes = [base, variant === 'error' ? 'error' : undefined, className].filter(Boolean).join(' ');
  return <p className={classes}>{children}</p>;
}
