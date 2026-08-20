import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_BASE_URL, USE_MOCK_API, ApiRequestError, notifySessionExpired } from './client';
import { mockSendMessage } from '../mocks/handlers';
import { sseTokenDataSchema } from '../schemas/api';
import { resultsToCandidates, sidebarCandidatesFromBackend } from './backendAdapters';
import type { SendMessagePayload, SseAnswerData, SseDoneData, SseResultsData, SseSidebarData } from './types';

export interface ChatEventHandlers {
  onAnswer: (data: SseAnswerData) => void;
  onSidebar: (data: SseSidebarData) => void;
  onResults: (data: SseResultsData) => void;
  onDone: (data: SseDoneData) => void;
  onError: (code: string, message: string) => void;
  /**
   * §4 `token` event — typing-effect fragments. Not called by the mock and
   * not consumed by the chat UI yet (see completion report TODO: whether
   * `token` is real model streaming or a UI-only typing effect is unresolved
   * in apicontract.md). Kept optional so real-backend wiring is a one-line
   * addition once that's decided, without another handler-interface change.
   */
  onToken?: (text: string) => void;
}

/** Pure SSE event adapter; unit tests exercise this without opening a network connection. */
export function dispatchChatEvent(event: string, raw: any, handlers: ChatEventHandlers): boolean {
  switch (event) {
    case 'token':
      handlers.onToken?.(sseTokenDataSchema.parse(raw).text);
      return false;
    case 'answer':
      handlers.onAnswer({
        text: { ko: raw.textKo ?? '', user: raw.textLocal ?? raw.textKo ?? '' },
        citedPrograms: raw.citedRecords ?? [],
      });
      return false;
    case 'sidebar': {
      const ranking = raw.ranking ?? [];
      handlers.onSidebar({
        ranking: ranking.map((item: any, index: number) => ({
          programId: item.recordId,
          score: item.score ?? Math.max(0, 1 - index / Math.max(ranking.length, 1)),
        })),
        viewFilter: raw.viewFilter ?? {},
        visibleCount: raw.visibleCount ?? 5,
        candidates: sidebarCandidatesFromBackend(raw.candidates ?? []),
      });
      return false;
    }
    case 'results':
      handlers.onResults({ candidates: resultsToCandidates(raw.results ?? []) });
      return false;
    case 'done':
      handlers.onDone({
        quickReplies: (raw.quickReplies ?? []).map((item: any) => ({
          value: item.value,
          label: typeof item.label === 'string'
            ? { ko: item.labelKo ?? item.label, user: item.labelLocal ?? item.label }
            : item.label,
        })),
      });
      return true;
    case 'error':
      handlers.onError(raw.code ?? 'UNKNOWN_ERROR', raw.message ?? 'Chat processing failed.');
      return true;
    default:
      return false;
  }
}

/**
 * §7.3 `POST /sessions/{sid}/messages` — the one SSE endpoint in the
 * contract. Uses `@microsoft/fetch-event-source` (not `EventSource`)
 * because this is a POST with an `Authorization` header, which native
 * `EventSource` cannot send.
 */
export async function sendChatMessage(
  sid: string,
  token: string,
  payload: SendMessagePayload,
  handlers: ChatEventHandlers,
  signal?: AbortSignal
): Promise<void> {
  if (USE_MOCK_API) {
    try {
      await mockSendMessage(sid, token, payload.utterance ?? payload.quickReplyValue ?? '', {
        onAnswer: handlers.onAnswer,
        onSidebar: handlers.onSidebar,
        onDone: handlers.onDone,
        onError: handlers.onError,
      });
    } catch (err) {
      if (err instanceof ApiRequestError) handlers.onError(err.code, err.message);
      else handlers.onError('UNKNOWN_ERROR', 'Unexpected error');
    }
    return;
  }

  let terminalEventReceived = false;
  try {
    await fetchEventSource(`${API_BASE_URL}/v1/sessions/${sid}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      openWhenHidden: true, // §9: keep streaming when the mobile app is backgrounded
      signal,
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) return;
        if (response.status === 401) notifySessionExpired();
        // A turn that overlaps another one is rejected with 429 *before* the
        // stream opens, so the real reason is in the JSON body, not in an SSE
        // `error` event. Without reading it here a retryable "wait a moment"
        // surfaced as a generic connection failure.
        let code = 'SSE_OPEN_FAILED';
        let message = `Unexpected response ${response.status}`;
        try {
          const data: any = await response.json();
          const apiError = data?.error ?? data;
          if (apiError?.code) code = apiError.code;
          if (apiError?.message) message = apiError.message;
        } catch {
          // no JSON body — keep the generic message
        }
        throw new ApiRequestError({ code, message, status: response.status });
      },
      onmessage(ev) {
        if (!ev.event) return;
        try {
          const raw: unknown = JSON.parse(ev.data);
          terminalEventReceived = dispatchChatEvent(ev.event, raw, handlers) || terminalEventReceived;
        } catch {
          terminalEventReceived = true;
          handlers.onError('INVALID_SSE_EVENT', 'The server returned an invalid SSE event.');
        }
      },
      onerror(err) {
        // Re-throw to stop fetch-event-source's default infinite retry —
        // a chat turn should surface as a user-facing error, not silently retry.
        // `onopen` throws an ApiRequestError carrying the server's own code;
        // flattening that to CONNECTION_LOST here loses `turn_in_progress`.
        if (err instanceof ApiRequestError) handlers.onError(err.code, err.message);
        else handlers.onError('CONNECTION_LOST', err instanceof Error ? err.message : 'Connection lost');
        throw err;
      },
    });
    if (!terminalEventReceived && !signal?.aborted) {
      handlers.onError('CONNECTION_LOST', 'The SSE stream closed before a done event was received.');
    }
  } catch {
    // onerror already reported it; swallow so callers don't need a try/catch.
  }
}
