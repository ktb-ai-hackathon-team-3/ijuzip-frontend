import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Skeleton } from '../common/Skeleton';
import { StatusBadge } from '../common/StatusBadge';
import { useProgramDetail } from '../../hooks/useProgramDetail';
import { useCreateApplicationMutation } from '../../hooks/useApplicationFlow';
import { getVerdict } from '../../api/programs';
import { incomeBandToBackend } from '../../api/backendAdapters';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { INCOME_BAND_OPTIONS } from '../../i18n/optionData';
import type { Language, ProgramVerdict, VerdictStatus } from '../../api/types';
import styles from './ProgramDetailModal.module.css';

const VERDICT_TONE: Record<VerdictStatus, 'positive' | 'warning' | 'negative'> = {
  ELIGIBLE: 'positive',
  NEEDS_CHECK: 'warning',
  NOT_ELIGIBLE: 'negative',
};

interface ProgramDetailModalProps {
  programId: string;
}

/** front_ing.md §4: the modal's only action is "start the application" — no more select/unselect toggle. */
export function ProgramDetailModal({ programId }: ProgramDetailModalProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const closeDetailModal = useUiStore((s) => s.closeDetailModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const sessionId = useSessionStore((s) => s.sessionId);
  const token = useSessionStore((s) => s.token);
  const candidates = useSessionStore((s) => s.candidates);
  const queryClient = useQueryClient();

  const { detailQuery, verdictQuery } = useProgramDetail(programId);
  const createApplication = useCreateApplicationMutation();
  const candidate = candidates.find((c) => c.programId === programId);
  const needsIncomeBand = candidate?.missingSlots.includes('incomeBand') && !verdictQuery.data;

  const [incomeBand, setIncomeBand] = useState('');
  const extraAnswerMutation = useMutation({
    mutationFn: (band: string) =>
      getVerdict(sessionId as string, token as string, programId, {
        incomeBand: incomeBandToBackend(band) as string,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['verdict', sessionId, programId], data);
    },
  });

  const verdict: ProgramVerdict | undefined = extraAnswerMutation.data ?? verdictQuery.data;
  const canApply = !!verdict && verdict.verdict !== 'NOT_ELIGIBLE';

  async function handleGoToApplication() {
    try {
      const app = await createApplication.mutateAsync([programId]);
      closeDetailModal();
      navigate(`/applications/${app.applicationId}`, { viewTransition: true });
    } catch {
      pushToast(t('application.formIdMismatch'), 'error');
    }
  }

  const titleId = `program-detail-${programId}`;

  return (
    <Modal
      titleId={titleId}
      onClose={closeDetailModal}
      footer={
        <>
          <Button variant="secondary" fullWidth onClick={closeDetailModal}>
            {t('welfare.modal.close')}
          </Button>
          {verdict && (
            <Button variant="primary" fullWidth disabled={!canApply} loading={createApplication.isPending} onClick={handleGoToApplication}>
              {t('welfare.modal.goToApplication')}
            </Button>
          )}
        </>
      }
    >
      <div className={styles.topRow}>
        {verdict && (
          <span className={styles.matchPill}>
            <CheckCircle2 size={13} aria-hidden="true" /> {t('welfare.matchLabel')} {Math.round((candidate?.baseScore ?? 0) * 100)}%
          </span>
        )}
      </div>

      {detailQuery.isLoading && (
        <>
          <Skeleton height={22} width="70%" />
          <div style={{ height: 10 }} />
          <Skeleton height={14} />
          <div style={{ height: 6 }} />
          <Skeleton height={14} width="85%" />
        </>
      )}

      {detailQuery.data && (
        <>
          <h2 id={titleId} className={styles.title}>
            {detailQuery.data.name.user}
          </h2>
          {i18n.language !== 'ko' && <div className={styles.nativeName}>{detailQuery.data.name.ko}</div>}
          <p className={styles.desc}>{detailQuery.data.summary.user}</p>
        </>
      )}

      {needsIncomeBand && !extraAnswerMutation.data && (
        <div className={styles.extraAnswerBox}>
          <h3>{t('welfare.modal.extraQuestionTitle')}</h3>
          <select
            value={incomeBand}
            onChange={(e) => {
              const value = e.target.value;
              setIncomeBand(value);
              if (value) extraAnswerMutation.mutate(value);
            }}
          >
            <option value="">{t('onboarding.placeholders.select')}</option>
            {INCOME_BAND_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label[i18n.language as Language]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.verdictBox}>
        {(verdictQuery.isLoading || extraAnswerMutation.isPending) && !verdict && (
          <>
            <Skeleton height={20} width="40%" />
            <div style={{ height: 8 }} />
            <Skeleton height={13} />
          </>
        )}
        {verdictQuery.isError && !verdict && <p className={styles.reasonText}>{t('welfare.modal.verdictError')}</p>}
        {!verdictQuery.isLoading && !verdictQuery.data && !verdict && !needsIncomeBand && null}
        {verdict && (
          <>
            <div className={styles.verdictHeadRow}>
              <StatusBadge tone={VERDICT_TONE[verdict.verdict]} label={t(`welfare.modal.verdict.${verdict.verdict}`)} />
              <span className={styles.confidence}>
                {t('welfare.modal.confidenceLabel')} {Math.round(verdict.confidence * 100)}%
              </span>
            </div>
            <p className={styles.reasonText}>{verdict.reason.user}</p>
          </>
        )}
      </div>

      {detailQuery.data && (
        <>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.benefit')}</span>
            <span className={styles.val}>{detailQuery.data.benefit.user}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.applicationChannel')}</span>
            <span className={styles.val}>{t(`welfare.modal.channel.${detailQuery.data.applicationChannel}`)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.applicationOrg')}</span>
            <span className={styles.val}>
              {detailQuery.data.applicationOrg.user === '관할 행정기관'
                ? t('welfare.modal.defaultApplicationOrg')
                : detailQuery.data.applicationOrg.user}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.requiredDocuments')}</span>
            <span className={styles.val}>
              <ul>
                {detailQuery.data.requiredDocuments.map((doc, i) => (
                  <li key={i}>{doc.user}</li>
                ))}
              </ul>
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.deadline')}</span>
            <span className={styles.val}>{detailQuery.data.deadline}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>{t('welfare.modal.sourceOriginal')}</span>
            <span className={styles.val}>
              <div className={styles.sourceBox}>{detailQuery.data.evidence.sourceSnippet}</div>
              <div className={styles.sourceMeta}>
                <a className={styles.sourceLink} href={detailQuery.data.evidence.sourceUrl} target="_blank" rel="noreferrer">
                  {t('welfare.modal.sourceLink')} <ExternalLink size={11} aria-hidden="true" style={{ verticalAlign: 'middle' }} />
                </a>
                <span>
                  {t('welfare.modal.lastVerified')}: {detailQuery.data.evidence.lastVerified}
                </span>
              </div>
            </span>
          </div>
        </>
      )}

      <div className={styles.disclaimer}>{t('welfare.modal.disclaimer')}</div>
    </Modal>
  );
}
