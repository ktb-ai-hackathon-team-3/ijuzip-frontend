import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_BASE_URL, USE_MOCK_API, ApiRequestError, notifySessionExpired } from './client';
import { mockSendMessage } from '../mocks/handlers';
import { sseTokenDataSchema } from '../schemas/api';
import type { SendMessagePayload, SseAnswerData, SseDoneData, SseSidebarData } from './types';

export interface ChatEventHandlers {
  onAnswer: (data: SseAnswerData) => void;
  onSidebar: (data: SseSidebarData) => void;
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
        throw new ApiRequestError({ code: 'SSE_OPEN_FAILED', message: `Unexpected response ${response.status}`, status: response.status });
      },
      onmessage(ev) {
        if (!ev.event) return;
        try {
          const raw: unknown = JSON.parse(ev.data);
          switch (ev.event) {
            case 'token':
              handlers.onToken?.(sseTokenDataSchema.parse(raw).text);
              break;
            case 'answer':
              handlers.onAnswer({
                text: { ko: (raw as any).textKo ?? '', user: (raw as any).textLocal ?? (raw as any).textKo ?? '' },
                citedPrograms: (raw as any).citedRecords ?? [],
              });
              break;
            case 'sidebar':
              handlers.onSidebar({
                ranking: ((raw as any).ranking ?? []).map((item: any) => ({ programId: item.recordId, score: item.score ?? 0 })),
                viewFilter: (raw as any).viewFilter ?? {},
                visibleCount: (raw as any).visibleCount ?? 5,
              });
              break;
            case 'done':
              terminalEventReceived = true;
              handlers.onDone({
                quickReplies: ((raw as any).quickReplies ?? []).map((item: any) => ({
                  value: item.value,
                  label: typeof item.label === 'string' ? { ko: item.label, user: item.label } : item.label,
                })),
              });
              break;
            case 'error': {
              terminalEventReceived = true;
              const data = raw as { code?: string; message?: string };
              handlers.onError(data.code ?? 'UNKNOWN_ERROR', data.message ?? 'Chat processing failed.');
              break;
            }
          }
        } catch {
          terminalEventReceived = true;
          handlers.onError('INVALID_SSE_EVENT', 'The server returned an invalid SSE event.');
        }
      },
      onerror(err) {
        // Re-throw to stop fetch-event-source's default infinite retry —
        // a chat turn should surface as a user-facing error, not silently retry.
        handlers.onError('CONNECTION_LOST', err instanceof Error ? err.message : 'Connection lost');
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
