import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';
import type { Candidate, Profile } from '../api/types';

const profile: Profile = {
  track: 'BIRTH_CARE',
  language: 'ko',
  visaStatus: 'F-6',
  region: { sido: '경기도', sigungu: '안산시' },
  gender: null,
  birthYear: null,
  childBirthDate: '2026-06-01',
  childNationality: 'KR',
  householdSize: null,
  incomeBand: null,
  employmentStatus: null,
  injuryDate: null,
};

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('setSession seeds the greeting as the first chat message (chat never opens empty)', () => {
    useSessionStore.getState().setSession({
      sessionId: 'sess_1',
      token: 'tok_1',
      track: 'BIRTH_CARE',
      profile,
      candidates: [],
      greeting: { ko: '안녕하세요', user: '안녕하세요' },
    });
    const { messages } = useSessionStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
  });

  it('markLastAssistantAsFilter only upgrades QUESTION → FILTER, never touches a user message', () => {
    const store = useSessionStore.getState();
    store.appendMessage({ seq: 1, role: 'user', text: 'hi', createdAt: '' });
    store.appendMessage({
      seq: 2,
      role: 'assistant',
      text: { ko: 'a', user: 'a' },
      createdAt: '',
      intent: 'QUESTION',
      citedPrograms: [],
    });
    store.markLastAssistantAsFilter();
    const last = useSessionStore.getState().messages[1];
    expect(last.role === 'assistant' && last.intent).toBe('FILTER');
  });

  it('applies AI candidates and ranking atomically for one sidebar event', () => {
    const candidates: Candidate[] = [{
      programId: 'p1', name: { ko: '복지', user: '복지' }, baseScore: 1,
      conditionStatus: 'NEED_INFO', missingSlots: [],
    }];
    useSessionStore.getState().applySidebarSnapshot(candidates, {
      ranking: [{ programId: 'p1', score: 0 }], viewFilter: {}, sortBy: 'relevance', visibleCount: 1,
    });

    const state = useSessionStore.getState();
    expect(state.candidates[0].conditionStatus).toBe('NEED_INFO');
    expect(state.view?.ranking[0].programId).toBe('p1');
  });

  it('replaces preview candidates with final results while preserving known ranking scores', () => {
    useSessionStore.setState({
      view: { ranking: [{ programId: 'p1', score: 0.8 }], viewFilter: {}, sortBy: 'relevance', visibleCount: 1 },
    });
    useSessionStore.getState().applyAssessmentResults([{
      programId: 'p1', name: { ko: '복지', user: '복지' }, baseScore: 0.5,
      conditionStatus: 'LIKELY', missingSlots: [],
    }]);

    expect(useSessionStore.getState().view?.ranking[0].score).toBe(0.8);
    expect(useSessionStore.getState().candidates[0].conditionStatus).toBe('LIKELY');
  });
});
