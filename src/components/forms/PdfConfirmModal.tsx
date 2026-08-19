import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import styles from './PdfConfirmModal.module.css';

interface PdfConfirmModalProps {
  unverifiedFieldLabels: string[];
  onClose: () => void;
  onConfirm: () => void;
  status: 'idle' | 'pending' | 'error';
}

/** §12 of CLAUDE_FRONTEND_PROMPT.md — confirm before PDF generation. */
export function PdfConfirmModal({ unverifiedFieldLabels, onClose, onConfirm, status }: PdfConfirmModalProps) {
  const { t } = useTranslation();
  const titleId = 'pdf-confirm-title';

  return (
    <Modal
      titleId={titleId}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" fullWidth onClick={onClose} disabled={status === 'pending'}>
            {t('pdf.cancel')}
          </Button>
          <Button variant="primary" fullWidth onClick={onConfirm} loading={status === 'pending'}>
            {t('pdf.confirm')}
          </Button>
        </>
      }
    >
      <h2 id={titleId} className={styles.title}>
        {t('pdf.confirmTitle')}
      </h2>

      {unverifiedFieldLabels.length > 0 && (
        <div className={styles.warningBox}>
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <p>{t('pdf.unverifiedWarning')}</p>
            <ul>
              {unverifiedFieldLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ul className={styles.noticeList}>
        <li>{t('pdf.signNotice')}</li>
        <li>{t('pdf.verifyNotice')}</li>
      </ul>

      <div className={styles.identityNotice}>{t('pdf.identityNotice')}</div>

      {status === 'error' && <p className={styles.errorText}>{t('errors.pdfFailed')}</p>}
    </Modal>
  );
}
