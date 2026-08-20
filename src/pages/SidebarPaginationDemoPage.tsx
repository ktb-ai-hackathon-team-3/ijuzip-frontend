import { useState } from 'react';
import { AppShell } from '../components/app-shell/AppShell';
import { Topbar } from '../components/app-shell/Topbar';
import type { Candidate, SidebarView } from '../api/types';
import { useSessionStore } from '../stores/sessionStore';
import { useUiStore } from '../stores/uiStore';
import styles from './SidebarPaginationDemoPage.module.css';

const DEMO_CANDIDATES: Candidate[] = Array.from({ length: 84 }, (_, index) => ({
  programId: `demo-program-${index + 1}`,
  name: { ko: `테스트 복지 지원 ${index + 1}`, user: `테스트 복지 지원 ${index + 1}` },
  baseScore: 1 - index / 100,
  conditionStatus: index % 7 === 0 ? 'NEED_INFO' : 'LIKELY',
  missingSlots: [],
}));

function viewFor(candidates: Candidate[], reverse = false): SidebarView {
  const ranked = reverse
    ? candidates.flatMap((_, index) => index % 2 === 0 ? candidates.slice(index, index + 2).reverse() : [])
    : candidates;
  return {
    ranking: ranked.map((candidate, index) => ({ programId: candidate.programId, score: 1 - index / 100 })),
    viewFilter: {},
    sortBy: 'relevance',
    visibleCount: 20,
  };
}

function setDemoResults(candidates: Candidate[], reverse = false) {
  useSessionStore.getState().applySidebarSnapshot(candidates, viewFor(candidates, reverse));
}

export function SidebarPaginationDemoPage() {
  const [reversed, setReversed] = useState(false);
  const [thinking, setThinking] = useState(false);

  useState(() => {
    setDemoResults(DEMO_CANDIDATES);
    useUiStore.setState({ chatThinking: false, detailModalProgramId: null });
  });

  function reorderResults() {
    const nextReversed = !reversed;
    setReversed(nextReversed);
    setDemoResults(DEMO_CANDIDATES, nextReversed);
  }

  function toggleThinking() {
    const nextThinking = !thinking;
    setThinking(nextThinking);
    useUiStore.getState().setChatThinking(nextThinking);
  }

  function moveStatuses() {
    setDemoResults(DEMO_CANDIDATES.map((candidate, index) => ({
      ...candidate,
      conditionStatus: index % 5 === 0 ? 'NEED_INFO' : index % 11 === 0 ? 'BLOCKED' : 'LIKELY',
    })), reversed);
  }

  return (
    <AppShell sidebarItemInteractionDisabled>
      <Topbar title="사이드바 페이지네이션 테스트" subtitle="가짜 데이터만 사용 · API 및 AI 요청 없음" />
      <main className={styles.main}>
        <section className={styles.panel}>
          <div className={styles.mockBanner}>LOCAL MOCK · 외부 AI/API 호출 0건</div>
          <span className={styles.eyebrow}>프론트 전용 테스트</span>
          <h1>왼쪽 사이드바를 직접 확인해보세요</h1>
          <p>
            먼저 사이드바 아래의 <strong>10개 더 보기</strong>를 눌러 목록을 펼친 다음,
            아래 버튼으로 AI 결과 변경 상황을 흉내 내면 됩니다.
          </p>

          <div className={styles.controls}>
            <button type="button" onClick={() => setDemoResults(DEMO_CANDIDATES)}>84개로 초기화</button>
            <button type="button" onClick={reorderResults}>AI 순서 재정렬</button>
            <button type="button" onClick={moveStatuses}>추천 후보 변경</button>
            <button type="button" onClick={() => setDemoResults(DEMO_CANDIDATES.slice(0, 27))}>결과 27개로 감소</button>
            <button type="button" onClick={() => setDemoResults(DEMO_CANDIDATES.slice(0, 64), reversed)}>결과 64개로 증가</button>
            <button type="button" data-active={thinking} onClick={toggleThinking}>
              {thinking ? 'AI 응답 상태 종료' : 'AI 응답 중 상태'}
            </button>
          </div>

          <ol className={styles.steps}>
            <li>사이드바에서 10개 더 보기를 눌러 추천 목록을 펼칩니다.</li>
            <li>AI 순서 재정렬을 눌러 카드 이동 효과를 확인합니다.</li>
            <li>추천 후보 변경으로 카드 추가·제거와 추천 순위 변화를 확인합니다.</li>
            <li>27개로 줄였다가 64개로 늘려도 열어둔 범위가 유지되는지 확인합니다.</li>
            <li>AI 응답 중 상태에서는 더 보기 버튼이 비활성화되는지 확인합니다.</li>
          </ol>
        </section>
      </main>
    </AppShell>
  );
}
