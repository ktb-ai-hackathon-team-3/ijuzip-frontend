import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { LanguagePage } from '../pages/LanguagePage';
import { ProfilePage } from '../pages/ProfilePage';
import { ConsultationPage } from '../pages/ConsultationPage';
import { ApplicationPage } from '../pages/ApplicationPage';
import { SidebarPaginationDemoPage } from '../pages/SidebarPaginationDemoPage';
import { useSessionStore } from '../stores/sessionStore';

/** §5: URL and screen state must agree, including on refresh/back — routes below are the whole state machine. */
function RequireSession({ children }: { children: ReactNode }) {
  const sessionId = useSessionStore((s) => s.sessionId);
  const token = useSessionStore((s) => s.token);
  if (!sessionId || !token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/', element: <LanguagePage /> },
  { path: '/onboarding/profile', element: <ProfilePage /> },
  {
    path: '/consultation',
    element: (
      <RequireSession>
        <ConsultationPage />
      </RequireSession>
    ),
  },
  {
    path: '/applications/:appId',
    element: (
      <RequireSession>
        <ApplicationPage />
      </RequireSession>
    ),
  },
  ...(import.meta.env.DEV
    ? [{ path: '/dev/sidebar-pagination', element: <SidebarPaginationDemoPage /> }]
    : []),
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
