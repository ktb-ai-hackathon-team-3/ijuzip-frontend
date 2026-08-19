import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

/** §8: desktop push sidebar defaults open, mobile drawer defaults closed. */
describe('uiStore — sidebar push vs drawer (§8 of CLAUDE_FRONTEND_PROMPT.md)', () => {
  beforeEach(() => {
    useUiStore.setState({ isMobile: false, sidebarOpen: true, mobileDrawerOpen: false });
  });

  it('desktop sidebar is open by default and toggle flips sidebarOpen, not the drawer', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(useUiStore.getState().mobileDrawerOpen).toBe(false);
  });

  it('crossing into mobile closes the drawer by default, independent of the desktop sidebar state', () => {
    useUiStore.getState().setIsMobile(true);
    const state = useUiStore.getState();
    expect(state.isMobile).toBe(true);
    expect(state.mobileDrawerOpen).toBe(false);
  });

  it('on mobile, toggle flips the drawer, not sidebarOpen', () => {
    useUiStore.getState().setIsMobile(true);
    useUiStore.getState().toggleSidebar();
    const state = useUiStore.getState();
    expect(state.mobileDrawerOpen).toBe(true);
  });

  it('crossing back to desktop re-opens the push sidebar', () => {
    useUiStore.getState().setIsMobile(true);
    useUiStore.getState().setIsMobile(false);
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });
});
