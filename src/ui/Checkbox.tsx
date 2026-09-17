import type { InputHTMLAttributes } from 'react';

/** The raw `<input type="checkbox">` in `.checkin` and `.notification-row`. */
export function Checkbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input type="checkbox" {...props} />;
}
