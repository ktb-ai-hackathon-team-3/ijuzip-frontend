import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { useSessionStore } from '../stores/sessionStore';
import type { Application } from '../api/types';
import { ApplicationPage } from './ApplicationPage';

const PREVIEW_IMAGES = [
  'https://ijuzip.xyz/images/form-birth-integrated/01.png',
  'https://ijuzip.xyz/images/form-birth-integrated/02.png',
  'https://ijuzip.xyz/images/form-birth-integrated/03.png',
];

const application: Application = {
  applicationId: 'app_1',
  formId: 'form-birth-integrated',
  formTitle: { ko: '출산서비스 통합처리 신청서', user: '출산서비스 통합처리 신청서' },
  checkedPrograms: [],
  fields: {},
  fieldLabels: {},
  previewImages: PREVIEW_IMAGES,
};

vi.mock('../api/applications', () => ({
  getApplication: vi.fn(() => Promise.resolve(application)),
  patchApplicationFields: vi.fn(),
  generateApplicationPdf: vi.fn(),
  createApplication: vi.fn(),
}));

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/applications/app_1']}>
          <Routes>
            <Route path="/applications/:appId" element={<ApplicationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('ApplicationPage form preview', () => {
  beforeEach(async () => {
    // AppShell 의 반응형 사이드바가 쓰는 API. jsdom 에는 없다
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }));
    await i18n.changeLanguage('ko');
    useSessionStore.setState({ sessionId: 's_1', token: 'tok' });
  });

  it('mounts every page of the form so flipping never waits on a load', async () => {
    renderPage();

    // 보이지 않는 장도 DOM 에 있다 — 다만 화면 낭독기에는 현재 장만 노출된다
    const pages = await screen.findAllByRole('img', { hidden: true });
    expect(pages.map((img) => img.getAttribute('src'))).toEqual(PREVIEW_IMAGES);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('flips to the next page and wraps around at the last one', async () => {
    renderPage();
    await screen.findAllByRole('img', { hidden: true });

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: '다음' });

    await userEvent.click(next);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await userEvent.click(next);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    await userEvent.click(next);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('steps backwards from the first page to the last one', async () => {
    renderPage();
    await screen.findAllByRole('img', { hidden: true });

    await userEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });
});
