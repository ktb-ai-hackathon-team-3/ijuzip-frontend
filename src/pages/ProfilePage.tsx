import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Baby, HardHat } from 'lucide-react';
import { createProfileSchema, type ProfileFormValues } from '../schemas/onboarding';
import { createSession } from '../api/sessions';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUiStore } from '../stores/uiStore';
import { Button } from '../components/common/Button';
import { VISA_OPTIONS, NATIONALITY_OPTIONS, INCOME_BAND_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, REGION_OPTIONS } from '../i18n/optionData';
import type { Language, Profile, Track } from '../api/types';
import styles from './ProfilePage.module.css';

const HOUSEHOLD_SIZES = ['1', '2', '3', '4', '5', '6'];

/**
 * The only onboarding input screen (front_ing.md §2/§3): there is no
 * separate track picker. The two "signal" sections below (child birth
 * date vs. injury date) double as the track decision — whichever one the
 * user actually fills in determines `track` at submit time.
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language as Language;

  const language = useOnboardingStore((s) => s.language);
  const setSession = useSessionStore((s) => s.setSession);
  const pushToast = useUiStore((s) => s.pushToast);

  const schema = createProfileSchema(t);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      visaStatus: '',
      region: { sido: '', sigungu: '' },
      childBirthDate: '',
      childNationality: '',
      employmentStatus: '',
      injuryDate: '',
      householdSize: '',
      incomeBand: '',
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
        track: variables.track,
        profile: { ...variables.profile, track: variables.track, language: variables.language },
        candidates: data.candidates,
        greeting: data.greeting,
      });
      navigate('/consultation');
    },
    onError: () => pushToast(t('errors.sessionCreateFailed'), 'error'),
  });

  if (!language) {
    return <Navigate to="/" replace />;
  }

  function onSubmit(values: ProfileFormValues) {
    if (!language) return;
    // §2 of front_ing.md: whichever signal field is actually filled decides
    // the track. The form's own superRefine already guarantees at least one
    // is present (and both can't be blank) by the time we get here.
    const track: Track = values.childBirthDate ? 'BIRTH_CARE' : 'LABOR_INJURY';
    const profile: Omit<Profile, 'track' | 'language'> = {
      visaStatus: values.visaStatus,
      region: { sido: values.region.sido, sigungu: values.region.sigungu },
      gender: null,
      birthYear: null,
      childBirthDate: track === 'BIRTH_CARE' ? (values.childBirthDate ?? null) : null,
      childNationality: track === 'BIRTH_CARE' ? (values.childNationality ?? null) : null,
      householdSize: values.householdSize ? Number(values.householdSize) : null,
      incomeBand: values.incomeBand ? (values.incomeBand as Profile['incomeBand']) : null,
      employmentStatus: track === 'LABOR_INJURY' ? (values.employmentStatus as Profile['employmentStatus']) : null,
      injuryDate: track === 'LABOR_INJURY' ? (values.injuryDate ?? null) : null,
    };
    mutation.mutate({ language, track, profile });
  }

  const err = form.formState.errors;

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
              <label className={styles.label} htmlFor="visaStatus">
                {t('onboarding.fields.visaStatus')} <span className={styles.req}>*</span>
              </label>
              <select id="visaStatus" className={styles.select} aria-invalid={!!err.visaStatus} {...form.register('visaStatus')}>
                <option value="">{t('onboarding.placeholders.select')}</option>
                {VISA_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label[lang]}
                  </option>
                ))}
              </select>
              {err.visaStatus && <span className={styles.errorText}>{err.visaStatus.message}</span>}
            </div>

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
              >
                <option value="">{t('onboarding.placeholders.select')}</option>
                {selectedRegion?.districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              {err.region?.sigungu && <span className={styles.errorText}>{err.region.sigungu.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="householdSize">
                {t('onboarding.fields.householdSize')} <span className={styles.opt}>({t('onboarding.optionalTag')})</span>
              </label>
              <select id="householdSize" className={styles.select} {...form.register('householdSize')}>
                <option value="">{t('onboarding.skipTag')}</option>
                {HOUSEHOLD_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="incomeBand">
                {t('onboarding.fields.incomeBand')} <span className={styles.opt}>({t('onboarding.optionalTag')})</span>
              </label>
              <select id="incomeBand" className={styles.select} {...form.register('incomeBand')}>
                <option value="">{t('onboarding.skipTag')}</option>
                {INCOME_BAND_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className={styles.trackHint}>{t('onboarding.trackHint')}</p>

          <div className={styles.signalGrid}>
            <div className={`${styles.signalCard} riseIn`}>
              <div className={styles.signalHead}>
                <Baby size={16} aria-hidden="true" />
                <span>{t('onboarding.sectionBirth')}</span>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="childBirthDate">
                  {t('onboarding.fields.childBirthDate')}
                </label>
                <input
                  id="childBirthDate"
                  type="date"
                  className={styles.dateInput}
                  aria-invalid={!!err.childBirthDate}
                  {...form.register('childBirthDate')}
                />
                {err.childBirthDate && <span className={styles.errorText}>{err.childBirthDate.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="childNationality">
                  {t('onboarding.fields.childNationality')}
                </label>
                <select
                  id="childNationality"
                  className={styles.select}
                  aria-invalid={!!err.childNationality}
                  {...form.register('childNationality')}
                >
                  <option value="">{t('onboarding.placeholders.select')}</option>
                  {NATIONALITY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label[lang]}
                    </option>
                  ))}
                </select>
                {err.childNationality && <span className={styles.errorText}>{err.childNationality.message}</span>}
              </div>
            </div>

            <div className={`${styles.signalCard} riseIn`} style={{ ['--delay' as string]: '70ms' }}>
              <div className={styles.signalHead}>
                <HardHat size={16} aria-hidden="true" />
                <span>{t('onboarding.sectionLabor')}</span>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="injuryDate">
                  {t('onboarding.fields.injuryDate')}
                </label>
                <input id="injuryDate" type="date" className={styles.dateInput} {...form.register('injuryDate')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="employmentStatus">
                  {t('onboarding.fields.employmentStatus')}
                </label>
                <select
                  id="employmentStatus"
                  className={styles.select}
                  aria-invalid={!!err.employmentStatus}
                  {...form.register('employmentStatus')}
                >
                  <option value="">{t('onboarding.placeholders.select')}</option>
                  {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label[lang]}
                    </option>
                  ))}
                </select>
                {err.employmentStatus && <span className={styles.errorText}>{err.employmentStatus.message}</span>}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>
              {t('onboarding.back')}
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={mutation.isPending}>
              {mutation.isPending ? t('onboarding.submitting') : t('onboarding.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
