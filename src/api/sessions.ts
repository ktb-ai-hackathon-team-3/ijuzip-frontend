import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_BASE_URL, apiFetch, USE_MOCK_API, ApiRequestError } from './client';
import { mockCreateSession, mockGetCandidates, mockGetSession } from '../mocks/handlers';
import { createSessionResponseSchema } from '../schemas/api';
import type { CreateSessionResponse, Language, Profile, SessionSnapshot, Track } from './types';
import {
  buildCreateSessionResponse, resultsToCandidates, skeletonToCandidates,
  snapshotFromBackend, toBackendSessionRequest, type BackendResult,
} from './backendAdapters';

export interface CreateSessionRequest {
  language: Language;
  track: Track;
  profile: Omit<Profile, 'track' | 'language'>;
  // 보호정보는 온보딩에 포함하지 않고 신청서 PATCH 단계에서 처음 입력한다.
}

/** §7.1 `POST /sessions` — onboarding submit. The only unauthenticated call. */
export async function createSession(req: CreateSessionRequest): Promise<CreateSessionResponse> {
  if (USE_MOCK_API) return mockCreateSession(req);
  let session: { sessionId: string; token: string; expiresIn: number } | null = null;
  let skeleton: { candidates?: Array<{ recordId: string; status?: string }>; funnel?: CreateSessionResponse['funnel'] } = {};
  let results: BackendResult[] | null = null;
  let streamError: ApiRequestError | null = null;

  await fetchEventSource(`${API_BASE_URL}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(toBackendSessionRequest(req)),
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) return;
      throw new ApiRequestError({ code: 'SESSION_CREATE_FAILED', message: `Unexpected response ${response.status}`, status: response.status });
    },
    onmessage(event) {
      const data: any = event.data ? JSON.parse(event.data) : {};
      if (event.event === 'session') session = data;
      if (event.event === 'skeleton') skeleton = data;
      if (event.event === 'results') results = data.results ?? [];
      if (event.event === 'error') streamError = new ApiRequestError({ code: data.code ?? 'SESSION_CREATE_FAILED', message: data.message ?? 'Session creation failed' });
    },
    onerror(error) { throw error; },
  });

  if (streamError) throw streamError;
  if (!session) throw new ApiRequestError({ code: 'SESSION_CREATE_FAILED', message: 'Session event was not received.' });
  return createSessionResponseSchema.parse(buildCreateSessionResponse(session, skeleton, results, req.language, req.track));
}

/** §7.2 `GET /sessions/{sid}` — refresh / app-resume restore. */
export async function getSession(sid: string, token: string): Promise<SessionSnapshot> {
  if (USE_MOCK_API) return mockGetSession(sid, token);
  const data = await apiFetch<unknown>(`/v1/sessions/${sid}`, { token });
  return snapshotFromBackend(data);
}

/** §7.4 `GET /sessions/{sid}/candidates` — sidebar re-fetch on resume only. */
export async function getCandidates(sid: string, token: string) {
  if (USE_MOCK_API) return mockGetCandidates(sid, token);
  const raw: any = await apiFetch<unknown>(`/v1/sessions/${sid}`, { token });
  const candidates = raw.assessment?.results
    ? resultsToCandidates(raw.assessment.results)
    : skeletonToCandidates({ candidates: [] });
  return { candidates, view: snapshotFromBackend(raw).view };
}
