import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { useOnboardingStore } from '../stores/onboardingStore';
import { ProfilePage } from './ProfilePage';

describe('ProfilePage visa help', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    useOnboardingStore.setState({ language: 'vi' });
  });

  it('shows every visa explanation in the language selected on the main page', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter><ProfilePage /></MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Trợ giúp về loại visa' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hướng dẫn về tình trạng cư trú (visa)')).toBeInTheDocument();
    expect(screen.getAllByText('F-6 Kết hôn di trú')).toHaveLength(2);
    expect(screen.getByText(/người nhập cư kết hôn/)).toBeInTheDocument();
  });
});
