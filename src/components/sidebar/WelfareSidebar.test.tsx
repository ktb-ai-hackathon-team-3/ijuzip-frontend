import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { Candidate, SidebarView } from '../../api/types';
import i18n from '../../i18n';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { WelfareSidebar } from './WelfareSidebar';

const candidates: Candidate[] = Array.from({ length: 45 }, (_, index) => ({
  programId: `program-${index + 1}`,
  name: { ko: `복지 ${index + 1}`, user: `복지 ${index + 1}` },
  baseScore: 1 - index / 100,
  conditionStatus: 'LIKELY',
  missingSlots: [],
}));

function createView(programs = candidates): SidebarView {
  return {
    ranking: programs.map((candidate, index) => ({
      programId: candidate.programId,
      score: 1 - index / 100,
    })),
    viewFilter: {},
    sortBy: 'relevance',
    visibleCount: 5,
  };
}

function renderSidebar() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/consultation']}>
        <WelfareSidebar ariaLabel="나에게 맞는 지원" />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('WelfareSidebar pagination', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ko');
    useSessionStore.setState({ candidates, view: createView(candidates) });
    useUiStore.setState({ isMobile: false, chatThinking: false });
  });

  it('shows the unified recommendation list in batches of 10 without making an API request', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('전체 45개 중 10개 표시')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10개 더 보기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '10개 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByText('전체 45개 중 20개 표시')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '10개 더 보기' }));
    await user.click(screen.getByRole('button', { name: '10개 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(40);
    expect(screen.getByRole('button', { name: '5개 더 보기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '5개 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(45);
    expect(screen.getByText('전체 45개 중 45개 표시')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /개 더 보기/ })).not.toBeInTheDocument();
  });

  it('keeps the opened range when a new AI sidebar view arrives', async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole('button', { name: '10개 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(20);

    act(() => {
      useSessionStore.getState().applySidebarUpdate(createView([...candidates].reverse()));
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByText('전체 45개 중 20개 표시')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('복지 45');
    expect(screen.getByRole('status')).toHaveTextContent('추천 결과가 업데이트됐어요');
  });

  it('restores the opened range after results shrink and grow again', async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole('button', { name: '10개 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(20);

    act(() => {
      useSessionStore.setState({ candidates: candidates.slice(0, 15), view: createView(candidates.slice(0, 15)) });
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(15);

    act(() => {
      useSessionStore.setState({ candidates, view: createView(candidates) });
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByText('전체 45개 중 20개 표시')).toBeInTheDocument();
  });

  it('disables show more while the AI response is in progress', () => {
    useUiStore.setState({ chatThinking: true });
    renderSidebar();

    expect(screen.getByRole('button', { name: '10개 더 보기' })).toBeDisabled();
  });

  it('keeps AI ranking regardless of internal eligibility status and hides blocked candidates', () => {
    const rankedCandidates: Candidate[] = [
      { ...candidates[0], programId: 'need', name: { ko: '먼저 추천', user: '먼저 추천' }, conditionStatus: 'NEED_INFO' },
      { ...candidates[1], programId: 'likely', name: { ko: '두 번째 추천', user: '두 번째 추천' } },
      { ...candidates[2], programId: 'blocked', name: { ko: '제외 대상', user: '제외 대상' }, conditionStatus: 'BLOCKED' },
    ];
    useSessionStore.setState({
      candidates: rankedCandidates,
      view: {
        ranking: rankedCandidates.map((candidate, index) => ({ programId: candidate.programId, score: 1 - index / 10 })),
        viewFilter: {},
        sortBy: 'relevance',
        visibleCount: 20,
      },
    });

    renderSidebar();

    expect(screen.queryByText('신청 가능성이 높아요')).not.toBeInTheDocument();
    expect(screen.queryByText('추가 확인이 필요해요')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '1먼저 추천우선 추천',
      '2두 번째 추천우선 추천',
    ]);
    expect(screen.queryByText('제외 대상')).not.toBeInTheDocument();
  });

  it('visually distinguishes the top three recommendations without showing eligibility badges', () => {
    renderSidebar();
    expect(screen.getAllByText('우선 추천')).toHaveLength(3);
    expect(screen.getByLabelText('추천 순위 1위')).toBeInTheDocument();
    expect(screen.queryByText('적합')).not.toBeInTheDocument();
    expect(screen.queryByText('확인 필요')).not.toBeInTheDocument();
  });
});
