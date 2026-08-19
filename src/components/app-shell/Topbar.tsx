import type { ReactNode } from 'react';
import { Menu, PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import { IconButton } from '../common/IconButton';
import styles from './Topbar.module.css';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Shared header for chat/application pages (§8, §16: no language switcher
 * here per the final prototype — language is chosen once during onboarding).
 */
export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { t } = useTranslation();
  const isMobile = useUiStore((s) => s.isMobile);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const showToggle = isMobile || !sidebarOpen;

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        {showToggle && (
          <IconButton
            icon={isMobile ? <Menu size={19} /> : <PanelLeft size={18} />}
            label={t('common.toggleSidebar')}
            onClick={toggleSidebar}
          />
        )}
        {!isMobile && !sidebarOpen && <div className={styles.brandMark}>I</div>}
        <div className={styles.titleWrap}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>
      {actions}
    </div>
  );
}
