import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LocalizedDateSelect.module.css';

interface LocalizedDateSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

function getParts(value: string) {
  const [year = '', month = '', day = ''] = value.split('-');
  return { year, month, day };
}

function lastDay(year: string, month: string) {
  return year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
}

export function LocalizedDateSelect({ id, value = '', onChange, invalid = false }: LocalizedDateSelectProps) {
  const { t } = useTranslation();
  const [parts, setParts] = useState(() => getParts(value));
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const years = useMemo(
    () => Array.from({ length: 101 }, (_, index) => String(currentYear - index)),
    [currentYear],
  );
  const monthCount = Number(parts.year) === currentYear ? currentMonth : 12;
  const naturalDayCount = lastDay(parts.year, parts.month);
  const dayCount = Number(parts.year) === currentYear && Number(parts.month) === currentMonth
    ? Math.min(naturalDayCount, currentDay)
    : naturalDayCount;

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    const allowedMonths = Number(merged.year) === currentYear ? currentMonth : 12;
    if (merged.month && Number(merged.month) > allowedMonths) {
      merged.month = '';
      merged.day = '';
    }
    const allowedDays = Number(merged.year) === currentYear && Number(merged.month) === currentMonth
      ? currentDay
      : lastDay(merged.year, merged.month);
    if (merged.day && Number(merged.day) > allowedDays) {
      merged.day = '';
    }
    setParts(merged);
    onChange(
      merged.year && merged.month && merged.day
        ? `${merged.year}-${merged.month}-${merged.day}`
        : '',
    );
  }

  return (
    <div id={id} className={styles.group} role="group" aria-invalid={invalid}>
      <select className={styles.select} aria-label={t('onboarding.date.year')} value={parts.year} onChange={(event) => update({ year: event.target.value })}>
        <option value="">{t('onboarding.date.year')}</option>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <select className={styles.select} aria-label={t('onboarding.date.month')} value={parts.month} onChange={(event) => update({ month: event.target.value })}>
        <option value="">{t('onboarding.date.month')}</option>
        {Array.from({ length: monthCount }, (_, index) => String(index + 1).padStart(2, '0')).map((month) => (
          <option key={month} value={month}>{t('onboarding.date.monthValue', { value: Number(month) })}</option>
        ))}
      </select>
      <select className={styles.select} aria-label={t('onboarding.date.day')} value={parts.day} onChange={(event) => update({ day: event.target.value })}>
        <option value="">{t('onboarding.date.day')}</option>
        {Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => (
          <option key={day} value={day}>{t('onboarding.date.dayValue', { value: Number(day) })}</option>
        ))}
      </select>
    </div>
  );
}
