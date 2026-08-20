import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useOnboardingStore } from '../stores/onboardingStore';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../i18n';
import type { Language } from '../api/types';
import styles from './LanguagePage.module.css';

/**
 * §6 of CLAUDE_FRONTEND_PROMPT.md — the only language picker in the app.
 * Choosing a language switches all fixed copy immediately (this page
 * itself included) and no Spring session exists yet at this point.
 */
export function LanguagePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setLanguage = useOnboardingStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<Language>((i18n.language as Language) || 'ko');

  function choose(lang: Language) {
    setSelected(lang);
    void i18n.changeLanguage(lang);
  }

  function start() {
    setLanguage(selected);
    navigate('/onboarding/profile', { viewTransition: true });
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.col}>
        <div className={styles.brand} aria-label={t('app.name')}>
          <div className={styles.mark} aria-hidden="true"><span /><span /></div>
          <div className={styles.brandCopy}>
            <div className={styles.brandName}>{t('app.name')}</div>
            <div className={styles.brandTagline}>Life in Korea, made clearer</div>
          </div>
        </div>
        <h1 className={styles.h1} data-language={selected}>
          <span className={styles.highlight}>{t('language.title1')}</span>
          <br />
          <span className={styles.highlight}>{t('language.title2')}</span>
        </h1>
        <p className={styles.sub}>
          {t('language.subtitle1')}
          <br />
          {t('language.subtitle2')}
        </p>
        <div className={styles.grid} role="radiogroup" aria-label={t('language.subtitle1')}>
          {SUPPORTED_LANGUAGES.map((lang, i) => (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={selected === lang}
              className={`${styles.tile} riseIn`}
              style={{ ['--delay' as string]: `${i * 60}ms` }}
              data-active={selected === lang}
              onClick={() => choose(lang)}
            >
              <span>{LANGUAGE_NAMES[lang]}</span>
              {selected === lang && <Check size={13} className={styles.tileCheck} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <Button variant="primary" fullWidth onClick={start}>
          {t('language.startBtn')}
        </Button>
      </div>
    </div>
  );
}
