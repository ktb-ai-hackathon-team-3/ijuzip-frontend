import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import styles from './Composer.module.css';

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function Composer({ disabled, onSend }: ComposerProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <div className={styles.composer}>
      <div className={styles.inner}>
        <label className="visually-hidden" htmlFor="chat-input">
          {t('chat.inputPlaceholder')}
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          className={styles.input}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={t('chat.inputPlaceholder')}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button className={styles.send} disabled={disabled || !value.trim()} onClick={submit} aria-label={t('chat.send')}>
          <ArrowUp size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
