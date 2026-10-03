import type { ReactNode } from 'react';

/** The section eyebrow, a bare `h2`. */
export function SectionHeading({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={className}>{children}</h2>;
}
