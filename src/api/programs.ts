import { apiFetch, USE_MOCK_API } from './client';
import { mockGetProgramDetail, mockGetVerdict } from '../mocks/handlers';
import type { Language, ProgramDetail, ProgramVerdict } from './types';
import { programDetailFromBackend, verdictFromBackend, type BackendResult } from './backendAdapters';

/** §7.6 `GET /programs/{pid}?lang=` — program detail (also the counter handout screen). */
export async function getProgramDetail(pid: string, lang: Language, token?: string): Promise<ProgramDetail> {
  if (USE_MOCK_API) return mockGetProgramDetail(pid, lang);
  const data = await apiFetch<BackendResult>(`/v1/programs/${pid}?lang=${lang}`, { token });
  return programDetailFromBackend(data);
}

/**
 * §7.5 `POST /sessions/{sid}/programs/{pid}/verdict` — single-item precise
 * judgement, fired once when the sidebar item is tapped. `extraAnswers`
 * covers slots skipped during onboarding (§7.5) without touching the
 * (immutable) profile.
 */
export async function getVerdict(
  sid: string,
  token: string,
  pid: string,
  extraAnswers?: Record<string, string>
): Promise<ProgramVerdict> {
  if (USE_MOCK_API) return mockGetVerdict(sid, token, pid, extraAnswers);
  // Values go through verbatim. Lower-casing them turned `visaStatus: 'F-6'`
  // into `'f-6'`, which the backend compares exactly against the program's
  // allow-list — a recheck could flip a PASS into a FAIL. The backend already
  // parses `true`/`false` case-insensitively, so nothing needed the transform.
  const data = extraAnswers && Object.keys(extraAnswers).length > 0
    ? await apiFetch<BackendResult>(`/v1/sessions/${sid}/programs/${pid}/recheck`, {
        method: 'POST', token,
        body: { extraAnswers },
      })
    : await apiFetch<BackendResult>(`/v1/programs/${pid}`, { token });
  return verdictFromBackend(data);
}
