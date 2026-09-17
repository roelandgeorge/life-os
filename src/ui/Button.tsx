import type { ButtonHTMLAttributes } from 'react';

/** Every raw `<button>` in the app, plus the `.primary`/`.danger`/`.small`/`.on` modifiers. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
  small?: boolean;
  on?: boolean;
}

export function Button({ variant, small, on, className, type = 'button', ...rest }: ButtonProps) {
  const classes = [variant, small && 'small', on && 'on', className].filter(Boolean).join(' ');
  return <button type={type} className={classes || undefined} {...rest} />;
}
