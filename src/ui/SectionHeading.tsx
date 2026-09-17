import type { ReactNode } from 'react';

/** The section eyebrow — bare `h2`, `.domain-heading`, `.custom-heading`. */
export function SectionHeading({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={className}>{children}</h2>;
}
