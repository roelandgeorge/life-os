import type { ReactNode } from 'react';

/** Label, then a control, then an optional note — `.habit-weight`, `.notification-row`. */
export function Field({
  label,
  note,
  className,
  children,
}: {
  label?: ReactNode;
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      {label}
      {children}
      {note}
    </label>
  );
}
