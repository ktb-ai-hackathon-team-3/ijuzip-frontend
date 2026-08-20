import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createProfileSchema, type ProfileFormValues } from '../schemas/onboarding';
import { createSession } from '../api/sessions';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUiStore } from '../stores/uiStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { CircleHelp } from 'lucide-react';
import { VISA_OPTIONS, REGION_OPTIONS, districtLabel } from '../i18n/optionData';
import type { Language, Profile } from '../api/types';
import styles from './ProfilePage.module.css';

/** Compact onboarding for the track-free welfare search. */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language as Language;

  const language = useOnboardingStore((s) => s.language) ?? lang;
  const setSession = useSessionStore((s) => s.setSession);
  const pushToast = useUiStore((s) => s.pushToast);
  const [visaHelpOpen, setVisaHelpOpen] = useState(false);

  const schema = createProfileSchema(t);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      visaStatus: '',
      region: { sido: '', sigungu: '' },
      hasChildren: '',
    },
  });

  const selectedSido = form.watch('region.sido');
  const selectedRegion = REGION_OPTIONS.find((region) => region.name === selectedSido);

  const mutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data, variables) => {
      setSession({
        sessionId: data.sessionId,
        token: data.token,
        track: 'BIRTH_CARE',
        profile: { ...variables.profile, track: 'BIRTH_CARE', language: variables.language },
        candidates: data.candidates,
        greeting: data.greeting,
      });
      navigate('/consultation', { viewTransition: true });
    },
    onError: () => pushToast(t('errors.sessionCreateFailed'), 'error'),
  });

  function onSubmit(values: ProfileFormValues) {
    const profile: Omit<Profile, 'track' | 'language'> = {
      visaStatus: values.visaStatus,
      region: { sido: values.region.sido, sigungu: values.region.sigungu },
      gender: null,
      birthYear: null,
      childBirthDate: null,
      childNationality: null,
      householdSize: null,
      incomeBand: null,
      employmentStatus: null,
      injuryDate: null,
    };
    mutation.mutate({ language, profile, hasChildren: values.visaStatus === 'F-6' ? values.hasChildren === 'yes' : null });
  }

  const err = form.formState.errors;
  const selectedVisa = form.watch('visaStatus');

  return (
    <div className={styles.scroll}>
      <div className={styles.col}>
        <span className={styles.badge}>{t('onboarding.badge')}</span>
        <h1 className={styles.h1}>
          {t('onboarding.title1')}
          <br />
          {t('onboarding.title2')}
        </h1>
        <p className={styles.sub}>{t('onboarding.subtitle')}</p>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className={styles.grid}>
            <div className={styles.field}>
              <div className={styles.labelWithHelp}>
                <label className={styles.label} htmlFor="visaStatus">
                  {t('onboarding.fields.visaStatus')} <span className={styles.req}>*</span>
                </label>
                <button type="button" className={styles.helpButton} aria-label={t('onboarding.visaHelp.open')} onClick={() => setVisaHelpOpen(true)}>
                  <CircleHelp size={15} aria-hidden="true" />
                </button>
              </div>
              <select
                id="visaStatus"
                className={styles.select}
                aria-invalid={!!err.visaStatus}
                {...form.register('visaStatus')}
                onChange={(e) => {
                  form.setValue('visaStatus', e.target.value, { shouldDirty: true, shouldValidate: true });
                  if (e.target.value !== 'F-6') form.setValue('hasChildren', '', { shouldValidate: false });
                }}
              >
                <option value="">{t('onboarding.placeholders.select')}</option>
                {VISA_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label[lang]}
                  </option>
                ))}
              </select>
              {err.visaStatus && <span className={styles.errorText}>{err.visaStatus.message}</span>}
            </div>

            {selectedVisa === 'F-6' && (
              <fieldset className={`${styles.childField} riseIn`}>
                <legend>{t('onboarding.fields.hasChildren')} <span className={styles.req}>*</span></legend>
                <label className={styles.choiceLabel}>
                  <input type="radio" value="yes" {...form.register('hasChildren')} />
                  <span>{t('common.yes')}</span>
                </label>
                <label className={styles.choiceLabel}>
                  <input type="radio" value="no" {...form.register('hasChildren')} />
                  <span>{t('common.no')}</span>
                </label>
                {err.hasChildren && <span className={styles.errorText}>{err.hasChildren.message}</span>}
              </fieldset>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="sido">
                {t('onboarding.fields.sido')} <span className={styles.req}>*</span>
              </label>
              <select
                id="sido"
                className={styles.select}
                aria-invalid={!!err.region?.sido}
                value={selectedSido}
                onChange={(e) => {
                  form.setValue('region.sido', e.target.value, { shouldValidate: true });
                  form.setValue('region.sigungu', '', { shouldValidate: true });
                }}
              >
                <option value="">{t('onboarding.placeholders.select')}</option>
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.name}>
                    {opt.label[lang]}
                  </option>
                ))}
              </select>
              {err.region?.sido && <span className={styles.errorText}>{err.region.sido.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="sigungu">
                {t('onboarding.fields.sigungu')} <span className={styles.req}>*</span>
              </label>
              <select
                id="sigungu"
                className={styles.select}
                aria-invalid={!!err.region?.sigungu}
                disabled={!selectedRegion}
                {...form.register('region.sigungu')}
                onChange={(e) => {
                  form.setValue('region.sigungu', e.target.value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
              >
                <option value="">{t('onboarding.placeholders.select')}</option>
                {selectedRegion?.districts.map((district) => (
                  <option key={district} value={district}>{districtLabel(district, lang)}</option>
                ))}
              </select>
              {err.region?.sigungu && <span className={styles.errorText}>{err.region.sigungu.message}</span>}
            </div>

          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => navigate('/', { viewTransition: true })}>
              {t('onboarding.back')}
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>
              {mutation.isPending ? t('onboarding.submitting') : t('onboarding.submit')}
            </Button>
          </div>
        </form>
      </div>
      {visaHelpOpen && (
        <Modal titleId="visa-help-title" onClose={() => setVisaHelpOpen(false)}>
          <div className={styles.visaHelpContent}>
            <h2 id="visa-help-title">{t('onboarding.visaHelp.title')}</h2>
            <p className={styles.visaHelpIntro}>{t('onboarding.visaHelp.intro')}</p>
            <div className={styles.visaHelpList}>
              {VISA_OPTIONS.map((visa) => (
                <section className={styles.visaHelpItem} key={visa.code}>
                  <strong>{visa.label[lang]}</strong>
                  <p>{t(`onboarding.visaHelp.visas.${visa.code}`)}</p>
                </section>
              ))}
            </div>
            <p className={styles.visaHelpCheck}>{t('onboarding.visaHelp.checkCard')}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
