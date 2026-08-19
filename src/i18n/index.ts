import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import km from './locales/km.json';
import en from './locales/en.json';
import type { Language } from '../api/types';

export const SUPPORTED_LANGUAGES: Language[] = ['ko', 'vi', 'km', 'en'];

export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: '🇰🇷 한국어',
  vi: '🇻🇳 Tiếng Việt',
  km: '🇰🇭 ភាសាខ្មែរ',
  en: '🇺🇸 English',
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      vi: { translation: vi },
      km: { translation: km },
      en: { translation: en },
    },
    fallbackLng: 'ko',
    supportedLngs: SUPPORTED_LANGUAGES,
    // The language page is the single source of truth for language selection
    // (§6 of CLAUDE_FRONTEND_PROMPT.md): no in-app switcher after onboarding.
    // Detection only picks a sane default before the user has chosen.
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ijuzip_language',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
