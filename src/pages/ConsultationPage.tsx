import { useTranslation } from 'react-i18next';
import { AppShell } from '../components/app-shell/AppShell';
import { Topbar } from '../components/app-shell/Topbar';
import { ChatMessages } from '../components/chat/ChatMessages';
import { Composer } from '../components/chat/Composer';
import { useChat } from '../hooks/useChat';
import { useSessionStore } from '../stores/sessionStore';
import { useUiStore } from '../stores/uiStore';
import { VISA_OPTIONS, REGION_OPTIONS, NATIONALITY_OPTIONS } from '../i18n/optionData';
import type { Language } from '../api/types';

function labelFor(list: { code: string; label: Record<Language, string> }[], code: string | null, lang: Language) {
  return list.find((o) => o.code === code)?.label[lang] ?? code ?? '';
}

export function ConsultationPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const profile = useSessionStore((s) => s.profile);
  const { send, quickReplies, thinking } = useChat();

  const subtitle = profile
    ? [
        labelFor(VISA_OPTIONS, profile.visaStatus, lang),
        `${REGION_OPTIONS.find((r) => r.name === profile.region.sido)?.label[lang] ?? profile.region.sido} ${profile.region.sigungu}`,
        profile.childNationality ? labelFor(NATIONALITY_OPTIONS, profile.childNationality, lang) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <AppShell>
      <Topbar title={t('chat.title')} subtitle={subtitle} />
      <ChatMessages
        quickReplies={quickReplies}
        onSend={send}
        onOpenProgram={(pid) => useUiStore.getState().openDetailModal(pid)}
      />
      <Composer disabled={thinking} onSend={(text) => send({ utterance: text })} />
    </AppShell>
  );
}
