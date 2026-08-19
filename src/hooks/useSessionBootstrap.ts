import { useEffect, useState } from 'react';
import { getSession } from '../api/sessions';
import { useSessionStore } from '../stores/sessionStore';
import { ApiRequestError } from '../api/client';

export type BootstrapStatus = 'idle' | 'restoring' | 'ready' | 'no-session' | 'expired';

/**
 * Runs once at app start. If sessionStorage has a token (page refresh or
 * app resume — §7.2), restores the whole session from Spring; otherwise
 * leaves the user to go through onboarding. Mounted once above the router.
 */
export function useSessionBootstrap(): BootstrapStatus {
  const [status, setStatus] = useState<BootstrapStatus>('idle');
  const hydrateFromStorage = useSessionStore((s) => s.hydrateFromStorage);
  const restoreSnapshot = useSessionStore((s) => s.restoreSnapshot);
  const reset = useSessionStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      hydrateFromStorage();
      const { token, sessionId } = useSessionStore.getState();
      if (!token || !sessionId) {
        setStatus('no-session');
        return;
      }
      setStatus('restoring');
      try {
        const snapshot = await getSession(sessionId, token);
        if (cancelled) return;
        restoreSnapshot(snapshot);
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
  }, []);

  return status;
}
