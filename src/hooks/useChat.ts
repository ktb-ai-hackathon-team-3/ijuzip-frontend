import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage } from '../api/chat';
import { ApiRequestError } from '../api/client';
import { useSessionStore } from '../stores/sessionStore';
import { useUiStore } from '../stores/uiStore';
import type { QuickReply, SendMessagePayload } from '../api/types';

/**
 * Owns one chat turn end to end: optimistic user bubble → a "thinking"
 * indicator (fixed copy, animated dots — no changing phase text) → SSE
 * handlers → sidebar update iff the `sidebar` event actually arrives
 * (§4: QUESTION never touches it).
 */
export function useChat() {
  const { t } = useTranslation();
  const sessionId = useSessionStore((s) => s.sessionId);
  const token = useSessionStore((s) => s.token);
  const lastSeq = useSessionStore((s) => s.lastSeq);
  const appendMessage = useSessionStore((s) => s.appendMessage);
  const markLastAssistantAsFilter = useSessionStore((s) => s.markLastAssistantAsFilter);
  const applySidebarSnapshot = useSessionStore((s) => s.applySidebarSnapshot);
  const applyAssessmentResults = useSessionStore((s) => s.applyAssessmentResults);

  const chatThinking = useUiStore((s) => s.chatThinking);
  const setChatThinking = useUiStore((s) => s.setChatThinking);
  const pushToast = useUiStore((s) => s.pushToast);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    // `displayText` lets a quick reply show its translated label in the
    // user's own bubble while the raw `quickReplyValue` (e.g. `explain:{id}`)
    // is still what actually goes out in the request payload.
    async (payload: SendMessagePayload, displayText?: string) => {
      const text = displayText ?? payload.utterance ?? payload.quickReplyValue ?? '';
      if (!sessionId || !token || chatThinking || !text.trim()) return;

      const userSeq = lastSeq + 1;
      appendMessage({ seq: userSeq, role: 'user', text, createdAt: new Date().toISOString() });
      setQuickReplies([]);
      setChatThinking(true);

      const controller = new AbortController();
      abortRef.current = controller;

      await sendChatMessage(
        sessionId,
        token,
        payload,
        {
          onAnswer: (data) => {
            appendMessage({
              seq: userSeq + 1,
              role: 'assistant',
              text: data.text,
              createdAt: new Date().toISOString(),
              intent: 'QUESTION',
              citedPrograms: data.citedPrograms,
            });
          },
          onSidebar: (data) => {
            markLastAssistantAsFilter();
            applySidebarSnapshot(data.candidates, {
              ranking: data.ranking,
              viewFilter: data.viewFilter,
              sortBy: 'relevance',
              visibleCount: data.visibleCount,
            });
          },
          onResults: (data) => {
            applyAssessmentResults(data.candidates);
          },
          onDone: (data) => {
            setQuickReplies(data.quickReplies);
            setChatThinking(false);
          },
          onError: (code, message) => {
            setChatThinking(false);
            void message;
            // Spring's ErrorCode is snake_case (`turn_in_progress`). Comparing
            // against SCREAMING_CASE never matched, so an overlapping turn —
            // which just needs a retry — read as a generic failure.
            const localized =
              code.toLowerCase() === 'turn_in_progress' ? t('chat.errorLocked') : t('chat.errorGeneric');
            appendMessage({
              seq: userSeq + 1,
              role: 'system',
              text: { ko: localized, user: localized },
              createdAt: new Date().toISOString(),
              errorCode: code,
            });
            pushToast(localized, 'error');
          },
        },
        controller.signal
      );
    },
    [
      sessionId,
      token,
      chatThinking,
      lastSeq,
      appendMessage,
      markLastAssistantAsFilter,
      applySidebarSnapshot,
      applyAssessmentResults,
      setChatThinking,
      pushToast,
      t,
    ]
  );

  const retryLast = useCallback(
    (text: string) => {
      void send({ utterance: text });
    },
    [send]
  );

  return { send, retryLast, quickReplies, thinking: chatThinking };
}

export { ApiRequestError };
