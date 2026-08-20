import { useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useResponsiveSidebar } from '../../hooks/useResponsiveSidebar';
import { useUiStore } from '../../stores/uiStore';
import { WelfareSidebar } from '../sidebar/WelfareSidebar';
import { ProgramDetailModal } from '../welfare/ProgramDetailModal';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  sidebarItemInteractionDisabled?: boolean;
}

const MIN_SIDEBAR_WIDTH = 288;
const WIDE_SIDEBAR_WIDTH = 480;
const MAX_SIDEBAR_WIDTH = 640;

/**
 * §8 of CLAUDE_FRONTEND_PROMPT.md — shared shell for chat and application
 * pages. Desktop: push layout, sidebar open by default, no overlay ever.
 * Mobile: overlay drawer, closed by default, backdrop click + ESC to close.
 */
export function AppShell({ children, sidebarItemInteractionDisabled = false }: AppShellProps) {
  useResponsiveSidebar();
  const { t } = useTranslation();
  const isMobile = useUiStore((s) => s.isMobile);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const closeMobileDrawer = useUiStore((s) => s.closeMobileDrawer);
  const detailModalProgramId = useUiStore((s) => s.detailModalProgramId);
  const [sidebarWidth, setSidebarWidth] = useState(340);

  const open = isMobile ? mobileDrawerOpen : sidebarOpen;
  const sidebarWide = !isMobile && sidebarWidth >= WIDE_SIDEBAR_WIDTH;

  function clampSidebarWidth(width: number) {
    const viewportRatio = window.innerWidth < 1100 ? 0.65 : 0.45;
    return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * viewportRatio));
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function handlePointerMove(pointerEvent: PointerEvent) {
      setSidebarWidth(clampSidebarWidth(startWidth + pointerEvent.clientX - startX));
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handleResizeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') setSidebarWidth(MIN_SIDEBAR_WIDTH);
    else if (event.key === 'End') setSidebarWidth(clampSidebarWidth(MAX_SIDEBAR_WIDTH));
    else setSidebarWidth((width) => clampSidebarWidth(width + (event.key === 'ArrowRight' ? 24 : -24)));
  }

  return (
    <div
      className={styles.shell}
      data-mobile={isMobile}
      data-sidebar-open={open}
      data-sidebar-wide={sidebarWide}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <div className={styles.backdrop} onClick={closeMobileDrawer} aria-hidden={!(isMobile && mobileDrawerOpen)} />
      <WelfareSidebar ariaLabel={t('sidebar.sectionLabel')} itemInteractionDisabled={sidebarItemInteractionDisabled} />
      <button
        type="button"
        className={styles.resizeHandle}
        aria-label={t('sidebar.resize')}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
      />
      <div className={styles.main}>{children}</div>
      {detailModalProgramId && <ProgramDetailModal programId={detailModalProgramId} />}
    </div>
  );
}
