import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * §8 of CLAUDE_FRONTEND_PROMPT.md: desktop push sidebar (open by default),
 * mobile overlay drawer (closed by default). Mounted once by AppShell.
 */
export function useResponsiveSidebar() {
  const setIsMobile = useUiStore((s) => s.setIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [setIsMobile]);
}
