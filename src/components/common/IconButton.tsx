import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

/** Icon-only button — `label` is required and always becomes `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ icon, label, className, ...rest }, ref) => (
  <button ref={ref} type="button" className={[styles.button, className ?? ''].join(' ')} aria-label={label} title={label} {...rest}>
    {icon}
  </button>
));
IconButton.displayName = 'IconButton';
