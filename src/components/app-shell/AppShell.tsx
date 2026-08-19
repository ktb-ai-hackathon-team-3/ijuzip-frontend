import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useResponsiveSidebar } from '../../hooks/useResponsiveSidebar';
import { useUiStore } from '../../stores/uiStore';
import { WelfareSidebar } from '../sidebar/WelfareSidebar';
import { ProgramDetailModal } from '../welfare/ProgramDetailModal';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

/**
 * §8 of CLAUDE_FRONTEND_PROMPT.md — shared shell for chat and application
 * pages. Desktop: push layout, sidebar open by default, no overlay ever.
 * Mobile: overlay drawer, closed by default, backdrop click + ESC to close.
 */
export function AppShell({ children }: AppShellProps) {
  useResponsiveSidebar();
  const { t } = useTranslation();
  const isMobile = useUiStore((s) => s.isMobile);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const closeMobileDrawer = useUiStore((s) => s.closeMobileDrawer);
  const detailModalProgramId = useUiStore((s) => s.detailModalProgramId);

  const open = isMobile ? mobileDrawerOpen : sidebarOpen;

  return (
    <div className={styles.shell} data-mobile={isMobile} data-sidebar-open={open}>
      <div className={styles.backdrop} onClick={closeMobileDrawer} aria-hidden={!(isMobile && mobileDrawerOpen)} />
      <WelfareSidebar ariaLabel={t('sidebar.sectionLabel')} />
      <div className={styles.main}>{children}</div>
      {detailModalProgramId && <ProgramDetailModal programId={detailModalProgramId} />}
    </div>
  );
}
