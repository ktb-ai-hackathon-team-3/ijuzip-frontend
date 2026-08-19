import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, RotateCcw } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../common/Button';
import type { QuickReply } from '../../api/types';
import styles from './ChatMessages.module.css';

interface ChatMessagesProps {
  quickReplies: QuickReply[];
  onSend: (payload: { utterance?: string; quickReplyValue?: string }, displayText?: string) => void;
  onOpenProgram: (programId: string) => void;
}

export function ChatMessages({ quickReplies, onSend, onOpenProgram }: ChatMessagesProps) {
  const { t } = useTranslation();
  const messages = useSessionStore((s) => s.messages);
  const thinking = useUiStore((s) => s.chatThinking);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const lastMessage = messages[messages.length - 1];

  return (
    <div className={styles.scroll} ref={scrollRef}>
      <div className={styles.col} aria-live="polite" aria-relevant="additions">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.seq} className={`${styles.row} ${styles.user} riseIn`}>
                <div className={styles.bubbleUser}>{message.text}</div>
              </div>
            );
          }
          if (message.role === 'system') {
            return (
              <div key={message.seq} className={`${styles.row} riseIn`}>
                <div className={styles.avatar}>
                  <MessageCircle size={14} aria-hidden="true" />
                </div>
                <div className={styles.bubbleSystem} role="alert">
                  <span>{message.text.user}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                      if (lastUser && lastUser.role === 'user') onSend({ utterance: lastUser.text });
                    }}
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    {t('chat.retry')}
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div key={message.seq} className={`${styles.row} riseIn`}>
              <div className={styles.avatar}>
                <MessageCircle size={14} aria-hidden="true" />
              </div>
              <div className={styles.bubbleAi}>
                {message.text.user}
                {message.citedPrograms.length > 0 && (
                  <div className={styles.citedRow}>
                    {message.citedPrograms.map((pid) => (
                      <button key={pid} className={styles.citedChip} onClick={() => onOpenProgram(pid)}>
                        {t('chat.citedProgramsLabel')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className={styles.row}>
            <div className={styles.avatar}>
              <MessageCircle size={14} aria-hidden="true" />
            </div>
            <div className={`${styles.bubbleAi} ${styles.thinkingBubble}`}>
              {t('chat.thinking.label')}
              <span className={styles.thinkDots}>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        {!thinking && lastMessage?.role === 'assistant' && quickReplies.length > 0 && (
          <div className={styles.chips}>
            {quickReplies.map((qr) => (
              <button key={qr.value} className={styles.chip} onClick={() => onSend({ quickReplyValue: qr.value }, qr.label.user)}>
                {qr.label.user}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
