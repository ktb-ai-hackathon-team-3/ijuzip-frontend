import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LanguagePage } from './LanguagePage';
import { useOnboardingStore } from '../stores/onboardingStore';

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguagePage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('LanguagePage — §6: the only language switcher, and it retranslates immediately', () => {
  beforeEach(async () => {
    useOnboardingStore.getState().reset();
    await i18n.changeLanguage('ko');
  });

  it('shows all 4 supported languages as selectable tiles', () => {
    renderPage();
    expect(screen.getByRole('radio', { name: /한국어/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tiếng Việt/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /ភាសាខ្មែរ/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /English/ })).toBeInTheDocument();
  });

  it('clicking a language tile retranslates the page copy immediately, before "start" is pressed', async () => {
    renderPage();
    expect(screen.getByText(/안녕하세요, IJU\.zip이에요\./)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Tiếng Việt/ }));

    expect(await screen.findByText(/Xin chào, tôi là IJU\.zip\./)).toBeInTheDocument();
  });

  it('stores the chosen language in onboardingStore only after "start" is pressed', async () => {
    renderPage();
    expect(useOnboardingStore.getState().language).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: /Tiếng Việt/ }));
    expect(useOnboardingStore.getState().language).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu|시작하기/ }));
    expect(useOnboardingStore.getState().language).toBe('vi');
  });
});
