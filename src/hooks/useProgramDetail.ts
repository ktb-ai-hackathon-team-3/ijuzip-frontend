import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProgramDetail, getVerdict } from '../api/programs';
import { useSessionStore } from '../stores/sessionStore';
import type { Language } from '../api/types';

/**
 * §10 of CLAUDE_FRONTEND_PROMPT.md: detail + verdict fetch in parallel.
 * Detail is cheap and typically resolves first — the modal shows it
 * immediately and skeletons only the verdict section while that (slower,
 * Opus-backed) call is still in flight.
 */
export function useProgramDetail(programId: string | null) {
  const { i18n } = useTranslation();
  const sessionId = useSessionStore((s) => s.sessionId);
  const token = useSessionStore((s) => s.token);
  const lang = i18n.language as Language;

  const detailQuery = useQuery({
    queryKey: ['programDetail', programId, lang],
    queryFn: () => getProgramDetail(programId as string, lang, token as string),
    enabled: !!programId && !!token,
  });

  const verdictQuery = useQuery({
    queryKey: ['verdict', sessionId, programId],
    queryFn: () => getVerdict(sessionId as string, token as string, programId as string),
    enabled: !!programId && !!sessionId && !!token,
    staleTime: Infinity, // §5.5: cached server-side too — profile is immutable, so it never invalidates
    retry: 1,
  });

  return { detailQuery, verdictQuery };
}
