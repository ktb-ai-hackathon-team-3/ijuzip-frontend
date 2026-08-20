import { describe, expect, it, vi } from 'vitest';
import { dispatchChatEvent, type ChatEventHandlers } from './chat';

describe('chat SSE contract', () => {
  it('consumes answer, full sidebar candidates, final results and done without a real network call', async () => {
    const received: string[] = [];
    const handlers: ChatEventHandlers = {
      onAnswer: () => received.push('answer'),
      onSidebar: (data) => {
        received.push('sidebar');
        expect(data.candidates[0].conditionStatus).toBe('NEED_INFO');
      },
      onResults: (data) => {
        received.push('results');
        expect(data.candidates[0].conditionStatus).toBe('LIKELY');
      },
      onDone: () => received.push('done'),
      onError: vi.fn(),
    };
    dispatchChatEvent('answer', { textKo: '답변', textLocal: 'Answer', citedRecords: [] }, handlers);
    dispatchChatEvent('sidebar', {
      ranking: [{ recordId: 'p1', score: null }], viewFilter: {}, visibleCount: 1,
      candidates: [{ recordId: 'p1', nameKo: '복지', nameLocal: 'Benefit', status: 'need_check' }],
    }, handlers);
    dispatchChatEvent('results', {
      results: [{ recordId: 'p1', nameKo: '복지', nameLocal: 'Benefit', status: 'eligible', checks: [] }],
    }, handlers);
    expect(dispatchChatEvent('done', { quickReplies: [] }, handlers)).toBe(true);

    expect(received).toEqual(['answer', 'sidebar', 'results', 'done']);
  });
});
