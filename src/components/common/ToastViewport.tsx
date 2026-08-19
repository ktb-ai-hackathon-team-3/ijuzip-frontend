import { useUiStore } from '../../stores/uiStore';
import styles from './ToastViewport.module.css';

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} aria-live="polite" role="status">
      {toasts.map((toast) => (
        <div key={toast.id} className={[styles.toast, toast.tone === 'error' ? styles.error : ''].join(' ')}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
