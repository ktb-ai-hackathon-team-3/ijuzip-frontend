import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'error';
}

interface UiState {
  isMobile: boolean;
  sidebarOpen: boolean;
  mobileDrawerOpen: boolean;
  detailModalProgramId: string | null;
  pdfConfirmOpen: boolean;
  chatThinking: boolean;
  toasts: Toast[];

  setIsMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
  closeMobileDrawer: () => void;
  openDetailModal: (programId: string) => void;
  closeDetailModal: () => void;
  openPdfConfirm: () => void;
  closePdfConfirm: () => void;
  setChatThinking: (thinking: boolean) => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set, get) => ({
  isMobile: false,
  sidebarOpen: true,
  mobileDrawerOpen: false,
  detailModalProgramId: null,
  pdfConfirmOpen: false,
  chatThinking: false,
  toasts: [],

  setIsMobile: (isMobile) => {
    const wasMobile = get().isMobile;
    if (isMobile === wasMobile) return;
    set({ isMobile, mobileDrawerOpen: false, sidebarOpen: !isMobile });
  },

  toggleSidebar: () => {
    const { isMobile, sidebarOpen, mobileDrawerOpen } = get();
    if (isMobile) set({ mobileDrawerOpen: !mobileDrawerOpen });
    else set({ sidebarOpen: !sidebarOpen });
  },

  closeMobileDrawer: () => set({ mobileDrawerOpen: false }),

  openDetailModal: (programId) => set({ detailModalProgramId: programId }),
  closeDetailModal: () => set({ detailModalProgramId: null }),

  openPdfConfirm: () => set({ pdfConfirmOpen: true }),
  closePdfConfirm: () => set({ pdfConfirmOpen: false }),

  setChatThinking: (thinking) => set({ chatThinking: thinking }),

  pushToast: (message, tone = 'default') => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
