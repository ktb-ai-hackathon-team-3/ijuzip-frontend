import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LockKeyhole } from 'lucide-react';
import { AppShell } from '../components/app-shell/AppShell';
import { Topbar } from '../components/app-shell/Topbar';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Skeleton } from '../components/common/Skeleton';
import { PdfConfirmModal } from '../components/forms/PdfConfirmModal';
import { useApplicationQuery, useGeneratePdfMutation, usePatchFieldsMutation } from '../hooks/useApplicationFlow';
import { useUiStore } from '../stores/uiStore';
import type { ApplicationFieldStatus } from '../api/types';
import styles from './ApplicationPage.module.css';

const STATUS_TONE: Record<ApplicationFieldStatus, 'positive' | 'warning' | 'negative'> = {
  FILLED: 'positive',
  PROTECTED_PREFILLED: 'warning',
  UNVERIFIED: 'warning',
  MISSING: 'negative',
  PROTECTED: 'negative',
};

export function ApplicationPage() {
  const { appId } = useParams<{ appId: string }>();
  const { t } = useTranslation();
  const applicationQuery = useApplicationQuery(appId);
  const patchMutation = usePatchFieldsMutation(appId ?? '');
  const pdfMutation = useGeneratePdfMutation(appId ?? '');
  const pdfConfirmOpen = useUiStore((s) => s.pdfConfirmOpen);
  const openPdfConfirm = useUiStore((s) => s.openPdfConfirm);
  const closePdfConfirm = useUiStore((s) => s.closePdfConfirm);
  const pushToast = useUiStore((s) => s.pushToast);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!applicationQuery.data) return;
    const initial: Record<string, string> = {};
    for (const [key, field] of Object.entries(applicationQuery.data.fields)) {
      if (field.value) initial[key] = field.value;
    }
    setValues(initial);
  }, [applicationQuery.data]);

  if (!appId) {
    return <Navigate to="/consultation" replace />;
  }

  // front_ing.md §5: the standalone "Save" step is gone — generating the PDF
  // now saves the current field values first, then only proceeds to the
  // confirm modal if that save reports the application ready.
  async function handleGeneratePdfClick() {
    try {
      const result = await patchMutation.mutateAsync(values);
      if (result.readyForPdf) {
        openPdfConfirm();
      } else {
        pushToast(t('application.notReadyForPdf'), 'error');
      }
    } catch {
      pushToast(t('errors.fieldValidationFailed'), 'error');
    }
  }

  /** Field keys are backend identifiers; show the user the localized label. */
  function labelFor(key: string) {
    return applicationQuery.data?.fieldLabels[key]?.user ?? key;
  }

  async function handleConfirmPdf() {
    try {
      const { unrenderableFields } = await pdfMutation.mutateAsync();
      pushToast(t('pdf.status.downloading'));
      // The PDF downloaded fine, but some characters had no glyph in the
      // bundled fonts and were stamped as `?`. The user cannot tell from the
      // download alone that the paper they hand over a counter is wrong.
      if (unrenderableFields.length > 0) {
        pushToast(
          t('pdf.unrenderableWarning', {
            fields: unrenderableFields.map((key) => labelFor(key)).join(', '),
          }),
          'error'
        );
      }
      closePdfConfirm();
    } catch {
      // PdfConfirmModal reads pdfMutation status via isError, stays open to let the user retry.
    }
  }

  const data = applicationQuery.data;
  const unverifiedLabels = data
    ? Object.entries(data.fields)
        .filter(([, field]) => field.status === 'UNVERIFIED')
        .map(([key]) => data.fieldLabels[key]?.user ?? key)
    : [];

  return (
    <AppShell>
      <Topbar title={data?.formTitle.user ?? t('application.title')} />

      <div className={styles.scroll}>
        <div className={styles.grid}>
          <div className={styles.previewCol}>
            {/* Image slot: swap this placeholder for an <img src={officialFormAsset}>
                once the real scanned-form asset is wired up — the aspect-ratio
                box and border are already sized to hold it. */}
            <div className={styles.previewImageSlot}>
              <FileText size={36} className={styles.previewIcon} aria-hidden="true" />
              <div className={styles.previewTitle}>{data?.formTitle.user ?? <Skeleton width={160} />}</div>
            </div>
            {data && (
              <div className={styles.checkedList}>
                <div className={styles.checkedLabel}>{t('application.checkedProgramsLabel')}</div>
                {data.checkedPrograms.map((p) => (
                  <div key={p.programId} className={styles.checkedItem}>
                    {p.programId}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formCol}>
            <div className={styles.banner}>{t('application.aiFilledBanner')}</div>
            <p className={styles.protectedNotice}>{t('application.protectedNotice')}</p>

            {!data && (
              <>
                <Skeleton height={48} />
                <div style={{ height: 12 }} />
                <Skeleton height={48} />
              </>
            )}

            {data &&
              Object.entries(data.fields).map(([key, field]) => {
                // sourceSlot이 있는 값은 온보딩 Profile에서 넘어온 값이다.
                // Profile은 API 계약상 세션 동안 불변이므로 신청서에서 다시 수정하지 않는다.
                const lockedFromProfile = !!field.sourceSlot && field.value !== null;
                return (
                <div className={styles.field} data-locked={lockedFromProfile} key={key}>
                  <div className={styles.labelRow}>
                    <span className={styles.fieldLabel}>{data.fieldLabels[key]?.user ?? key}</span>
                    {lockedFromProfile && <LockKeyhole size={13} className={styles.lockIcon} aria-hidden="true" />}
                    <StatusBadge tone={STATUS_TONE[field.status]} label={t(`application.status.${field.status}`)} />
                  </div>
                  <input
                    className={styles.input}
                    type="text"
                    value={values[key] ?? ''}
                    placeholder={data.fieldLabels[key]?.user ?? key}
                    readOnly={lockedFromProfile}
                    aria-readonly={lockedFromProfile}
                    onChange={(e) => {
                      if (!lockedFromProfile) setValues((prev) => ({ ...prev, [key]: e.target.value }));
                    }}
                  />
                  {field.note && <p className={styles.note}>{field.note.user}</p>}
                </div>
              );})}

            <div className={styles.actionsRow}>
              <Button variant="primary" fullWidth loading={patchMutation.isPending} onClick={handleGeneratePdfClick}>
                {patchMutation.isPending ? t('application.generatingPdf') : t('application.generatePdf')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {pdfConfirmOpen && (
        <PdfConfirmModal
          unverifiedFieldLabels={unverifiedLabels}
          onClose={closePdfConfirm}
          onConfirm={handleConfirmPdf}
          status={pdfMutation.isPending ? 'pending' : pdfMutation.isError ? 'error' : 'idle'}
        />
      )}
    </AppShell>
  );
}
