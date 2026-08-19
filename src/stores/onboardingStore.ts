import { create } from 'zustand';
import type { Language } from '../api/types';

/**
 * Draft onboarding selection, before `POST /sessions` has been called.
 * Once a session exists, sessionStore takes over — this store only tracks
 * the language choice that precedes it (track is derived from the profile
 * form itself — see ProfilePage).
 */
interface OnboardingState {
  language: Language | null;
  setLanguage: (language: Language) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  language: null,
  setLanguage: (language) => set({ language }),
  reset: () => set({ language: null }),
}));
