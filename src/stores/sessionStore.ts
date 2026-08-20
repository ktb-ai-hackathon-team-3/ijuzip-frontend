import { create } from 'zustand';
import type { Candidate, LocalizedText, Message, Profile, SidebarView, Track } from '../api/types';

const TOKEN_KEY = 'ijuzip_token';
const SESSION_ID_KEY = 'ijuzip_sessionId';

/**
 * Live session state. Server-origin, but delivered by a mix of request/
 * response (session create/restore) and SSE push (chat) — TanStack Query's
 * fetch-cache model doesn't fit a stream, so this store is the single
 * source of truth for it, and the API layer is the only thing allowed to
 * write to it (components dispatch actions, never mutate directly).
 *
 * Nothing PROTECTED (identity, application field values) is ever kept here.
 */
interface SessionState {
  sessionId: string | null;
  token: string | null;
  track: Track | null;
  profile: Profile | null;
  candidates: Candidate[];
  view: SidebarView | null;
  messages: Message[];
  lastSeq: number;
  latestApplicationId: string | null;

  hydrateFromStorage: () => void;
  setSession: (params: {
    sessionId: string;
    token: string;
    track: Track;
    profile: Profile;
    candidates: Candidate[];
    greeting: LocalizedText;
  }) => void;
  restoreSnapshot: (params: {
    profile: Profile;
    track: Track;
    candidates: Candidate[];
    view: SidebarView;
    messages: Message[];
    lastSeq: number;
    latestApplicationId: string | null;
  }) => void;
  appendMessage: (message: Message) => void;
  /** Called when a `sidebar` SSE event arrives, to correct the just-appended assistant message's inferred intent (§4: intent itself is never sent over SSE, only inferable from whether `sidebar` fired). */
  markLastAssistantAsFilter: () => void;
  applySidebarUpdate: (view: SidebarView) => void;
  applySidebarSnapshot: (candidates: Candidate[], view: SidebarView) => void;
  applyAssessmentResults: (candidates: Candidate[]) => void;
  setLatestApplicationId: (id: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  token: null,
  track: null,
  profile: null,
  candidates: [],
  view: null,
  messages: [],
  lastSeq: 0,
  latestApplicationId: null,

  hydrateFromStorage: () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (token && sessionId) set({ token, sessionId });
  },

  setSession: ({ sessionId, token, track, profile, candidates, greeting }) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    set({
      sessionId,
      token,
      track,
      profile,
      candidates,
      view: { ranking: candidates.map((c) => ({ programId: c.programId, score: c.baseScore })), viewFilter: {}, sortBy: 'relevance', visibleCount: 5 },
      // §7.1: `greeting` is a fixed, non-LLM string returned with session
      // creation — seeded as message seq 1 so the chat never opens empty.
      messages: [{ seq: 1, role: 'assistant', text: greeting, createdAt: new Date().toISOString(), intent: 'QUESTION', citedPrograms: [] }],
      lastSeq: 1,
      latestApplicationId: null,
    });
  },

  restoreSnapshot: ({ profile, track, candidates, view, messages, lastSeq, latestApplicationId }) => {
    set({ profile, track, candidates, view, messages, lastSeq, latestApplicationId });
  },

  appendMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message], lastSeq: Math.max(state.lastSeq, message.seq) }));
  },

  markLastAssistantAsFilter: () => {
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant') {
          messages[i] = { ...m, intent: m.intent === 'QUESTION' ? 'FILTER' : m.intent };
          break;
        }
      }
      return { messages };
    });
  },

  applySidebarUpdate: (view) => {
    set({ view });
  },

  applySidebarSnapshot: (candidates, view) => {
    set({ candidates, view });
  },

  applyAssessmentResults: (candidates) => {
    set((state) => {
      const scoreById = new Map(state.view?.ranking.map((entry) => [entry.programId, entry.score]) ?? []);
      const ranking = candidates.map((candidate) => ({
        programId: candidate.programId,
        score: scoreById.get(candidate.programId) ?? candidate.baseScore,
      }));
      return {
        candidates,
        view: {
          ranking,
          viewFilter: state.view?.viewFilter ?? {},
          sortBy: 'relevance',
          visibleCount: ranking.length,
        },
      };
    });
  },

  setLatestApplicationId: (id) => set({ latestApplicationId: id }),

  reset: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    set({
      sessionId: null,
      token: null,
      track: null,
      profile: null,
      candidates: [],
      view: null,
      messages: [],
      lastSeq: 0,
      latestApplicationId: null,
    });
  },
}));
