import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useSessionStore } from '../../stores/sessionStore';
import type { Candidate, ProgramDetail, ProgramVerdict } from '../../api/types';
import { ProgramDetailModal } from './ProgramDetailModal';

const detail: ProgramDetail = {
  name: { ko: '첫만남이용권', user: '첫만남이용권' },
  summary: { ko: '요약', user: '요약' },
  benefit: { ko: '지원 내용', user: '지원 내용' },
  conditionsText: [],
  evidence: { sourceSnippet: '원문', sourceUrl: 'https://example.com', lastVerified: '2026-08-01' },
  applicationChannel: 'VISIT',
  applicationOrg: { ko: '관할 행정기관', user: '관할 행정기관' },
  requiredDocuments: [],
  deadline: { ko: '상시', user: '상시' },
};

function makeVerdict(formId: string): ProgramVerdict {
  return {
    programId: 'p1',
    verdict: 'NEEDS_CHECK',
    confidence: 0.5,
    reason: { ko: '이유', user: '이유' },
    unmetConditions: [],
    benefit: { ko: '지원 내용', user: '지원 내용' },
    evidence: { sourceSnippet: '원문', sourceUrl: 'https://example.com', lastVerified: '2026-08-01' },
    applicationChannel: 'VISIT',
    applicationOrg: '관할 행정기관',
    formId,
    formCheckbox: formId ? 'svc_first_meeting' : '',
    deadline: { ko: '상시', user: '상시' },
    judgedAt: new Date().toISOString(),
  };
}

const candidate: Candidate = {
  programId: 'p1',
  name: { ko: '첫만남이용권', user: '첫만남이용권' },
  baseScore: 0.5,
  conditionStatus: 'NEED_INFO',
  missingSlots: [],
};

let verdictToReturn: ProgramVerdict;

vi.mock('../../api/programs', () => ({
  getProgramDetail: vi.fn(() => Promise.resolve(detail)),
  getVerdict: vi.fn(() => Promise.resolve(verdictToReturn)),
}));

function renderModal() {
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ProgramDetailModal programId="p1" />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('ProgramDetailModal application button', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ko');
    useSessionStore.setState({ sessionId: 's_1', token: 'tok', candidates: [candidate] });
  });

  it('enables "신청서 만들러가기" when the program has a covering form', async () => {
    verdictToReturn = makeVerdict('form-birth-integrated');
    renderModal();

    const button = await screen.findByRole('button', { name: '신청서 만들러가기' });
    expect(button).not.toBeDisabled();
  });

  it('disables the apply button with an unsupported-form message when no form covers the program', async () => {
    verdictToReturn = makeVerdict('');
    renderModal();

    const button = await screen.findByRole('button', { name: '아직 신청서를 만들 수 없어요' });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: '신청서 만들러가기' })).not.toBeInTheDocument();
  });
});
