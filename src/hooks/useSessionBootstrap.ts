import { useEffect, useState } from 'react';
import { getSession } from '../api/sessions';
import { useSessionStore } from '../stores/sessionStore';
import { ApiRequestError } from '../api/client';
import i18n from '../i18n';

export type BootstrapStatus = 'idle' | 'restoring' | 'ready' | 'no-session' | 'expired';

/**
 * Runs once at app start. If sessionStorage has a token (page refresh or
 * app resume — §7.2), restores the whole session from Spring; otherwise
 * leaves the user to go through onboarding. Mounted once above the router.
 */
export function useSessionBootstrap(disabled = false): BootstrapStatus {
  const [status, setStatus] = useState<BootstrapStatus>(disabled ? 'ready' : 'idle');
  const hydrateFromStorage = useSessionStore((s) => s.hydrateFromStorage);
  const restoreSnapshot = useSessionStore((s) => s.restoreSnapshot);
  const reset = useSessionStore((s) => s.reset);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;

    const waitForNextPoll = () => new Promise<void>((resolve) => {
      window.setTimeout(resolve, 3000);
    });

    async function run() {
      hydrateFromStorage();
      const { token, sessionId } = useSessionStore.getState();
      if (!token || !sessionId) {
        setStatus('no-session');
        return;
      }
      setStatus('restoring');
      try {
        let snapshot = await getSession(sessionId, token);
        if (cancelled) return;
        document.documentElement.lang = snapshot.profile.language;
        await i18n.changeLanguage(snapshot.profile.language);
        restoreSnapshot(snapshot);

        // The backend may still be assessing candidates when the page is
        // refreshed. Keep the restored screen alive and refresh server state
        // until the assessment leaves `pending`, as defined by the contract.
        while (!cancelled && snapshot.assessmentStatus === 'pending') {
          await waitForNextPoll();
          if (cancelled) return;
          snapshot = await getSession(sessionId, token);
          if (cancelled) return;
          restoreSnapshot(snapshot);
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        reset();
        setStatus(err instanceof ApiRequestError && err.status === 401 ? 'expired' : 'no-session');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return status;
}
