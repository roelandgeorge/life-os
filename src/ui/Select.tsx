import type { SelectHTMLAttributes } from 'react';

/**
 * The four bare `<select>` elements — the catalogue picker and the two
 * Appearance dropdowns had no styling of their own before this; `select` in
 * components.css now covers all four instead of one scoped rule.
 */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}
