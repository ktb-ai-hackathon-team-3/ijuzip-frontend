import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProgramDetail } from '../api/programs';
import { useSessionStore } from '../stores/sessionStore';
import type { Language } from '../api/types';

/**
 * §5.2 of apicontract.md: `Candidate` carries only `{programId, baseScore,
 * conditionStatus, missingSlots}` — no display name. The sidebar needs one
 * per visible item, so this resolves it via the same `GET /programs/{pid}`
 * call the detail modal uses (shared TanStack Query cache — opening the
 * modal after browsing the sidebar is a cache hit, not a second request).
 *
 * FLAGGED IN THE COMPLETION REPORT: this means up to `visibleCount`
 * individual requests to paint the sidebar. A `name` field on `Candidate`,
 * or a batch `GET /programs?ids=...`, would remove this entirely — recommend
 * raising it with the backend team rather than treating this hook as final.
 */
export function useProgramNames(programIds: string[]) {
  const { i18n } = useTranslation();
  const lang = i18n.language as Language;
  const token = useSessionStore((state) => state.token);

  const results = useQueries({
    queries: programIds.map((id) => ({
      queryKey: ['programDetail', id, lang],
      queryFn: () => getProgramDetail(id, lang, token as string),
      enabled: !!token,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const byId = new Map(programIds.map((id, i) => [id, results[i]]));
  return byId;
}
