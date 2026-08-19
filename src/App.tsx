import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppRouter } from './router';
import { ToastViewport } from './components/common/ToastViewport';
import { useSessionBootstrap } from './hooks/useSessionBootstrap';
import { onSessionExpired } from './api/auth';
import { useSessionStore } from './stores/sessionStore';
import { useUiStore } from './stores/uiStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppShellLoading() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      …
    </div>
  );
}

function SessionExpiryListener() {
  const { t } = useTranslation();
  const reset = useSessionStore((s) => s.reset);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => onSessionExpired(() => {
    reset();
    pushToast(t('errors.sessionExpired'), 'error');
  }), [reset, pushToast, t]);

  return null;
}

export default function App() {
  const bootstrapStatus = useSessionBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryListener />
      {bootstrapStatus === 'idle' || bootstrapStatus === 'restoring' ? <AppShellLoading /> : <AppRouter />}
      <ToastViewport />
    </QueryClientProvider>
  );
}
