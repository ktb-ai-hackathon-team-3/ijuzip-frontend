import type { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type BadgeTone = 'positive' | 'warning' | 'negative' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  icon?: ReactNode;
}

/**
 * Text + color together, never color alone (accessibility requirement in
 * §17 of CLAUDE_FRONTEND_PROMPT.md) — every badge carries a localized label.
 */
export function StatusBadge({ label, tone, icon }: StatusBadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {icon}
      {label}
    </span>
  );
}
