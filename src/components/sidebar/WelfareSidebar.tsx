import { useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, MessageCircle, PanelLeft, X as XIcon } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { IconButton } from '../common/IconButton';
import { BrandLogo } from '../common/BrandLogo';
import type { Candidate } from '../../api/types';
import styles from './WelfareSidebar.module.css';

const PAGE_SIZE = 10;
const PRIORITY_COUNT = 3;

interface WelfareSidebarProps { ariaLabel: string; itemInteractionDisabled?: boolean }

export function WelfareSidebar({ ariaLabel, itemInteractionDisabled = false }: WelfareSidebarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const candidates = useSessionStore((s) => s.candidates);
  const view = useSessionStore((s) => s.view);
  const applySidebarUpdate = useSessionStore((s) => s.applySidebarUpdate);
  const chatThinking = useUiStore((s) => s.chatThinking);
  const isMobile = useUiStore((s) => s.isMobile);
  const closeMobileDrawer = useUiStore((s) => s.closeMobileDrawer);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const openDetailModal = useUiStore((s) => s.openDetailModal);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [loadedBatch, setLoadedBatch] = useState<{ view: typeof view; from: number; to: number } | null>(null);
  const [trackedView, setTrackedView] = useState(view);
  const [updateRevision, setUpdateRevision] = useState(0);

  if (trackedView !== view) {
    setTrackedView(view);
    setUpdateRevision((revision) => revision + 1);
  }

  const byId = useMemo(() => new Map(candidates.map((candidate) => [candidate.programId, candidate])), [candidates]);
  const ordered = useMemo(() => {
    const recommendable = candidates.filter((candidate) => candidate.conditionStatus !== 'BLOCKED');
    if (!view) return [...recommendable].sort((a, b) => a.name.user.localeCompare(b.name.user, i18n.language));
    const ranked = view.ranking
      .map((entry) => byId.get(entry.programId))
      .filter((candidate): candidate is Candidate => !!candidate && candidate.conditionStatus !== 'BLOCKED');
    const rankedIds = new Set(ranked.map((candidate) => candidate.programId));
    const remaining = recommendable
      .filter((candidate) => !rankedIds.has(candidate.programId))
      .sort((a, b) => a.name.user.localeCompare(b.name.user, i18n.language));
    return [...ranked, ...remaining];
  }, [view, candidates, byId, i18n.language]);

  const visible = ordered.slice(0, displayLimit);
  const visibleIds = visible.map((candidate) => candidate.programId);
  const listSignature = visibleIds.join('\u0000');
  const [listSnapshot, setListSnapshot] = useState({ signature: listSignature, ids: visibleIds, animateFrom: [] as string[] });
  if (listSnapshot.signature !== listSignature) {
    setListSnapshot({ signature: listSignature, ids: visibleIds, animateFrom: listSnapshot.ids });
  }
  const previousIndexById = new Map(listSnapshot.animateFrom.map((id, index) => [id, index]));
  const nextBatchCount = Math.min(PAGE_SIZE, Math.max(ordered.length - displayLimit, 0));

  function handleShowMore() {
    const nextLimit = displayLimit + PAGE_SIZE;
    setLoadedBatch({ view, from: visible.length, to: nextLimit });
    setDisplayLimit(nextLimit);
  }
  function handleOpenItem(programId: string) {
    if (itemInteractionDisabled) return;
    openDetailModal(programId);
    if (isMobile) closeMobileDrawer();
  }
  function handleReturnToChat() {
    navigate('/consultation', { viewTransition: true });
    if (isMobile) closeMobileDrawer();
  }
  function clearFilter() {
    applySidebarUpdate({ ranking: view?.ranking ?? [], viewFilter: {}, sortBy: 'relevance', visibleCount: view?.visibleCount ?? 5 });
  }
  function translatedFilter(part: 'keys' | 'values', value: string) {
    const key = `sidebar.filters.${part}.${value}`;
    return i18n.exists(key) ? t(key) : value;
  }

  const filterEntries = Object.entries(view?.viewFilter ?? {}).filter(([, value]) => value);
  const isChatRoute = location.pathname === '/consultation';

  return (
    <aside className={styles.sidebar} aria-label={ariaLabel}>
      <div className={styles.sidebarInner}>
        <div className={styles.head}>
          <div className={styles.brand}>
            <BrandLogo className={styles.brandLogo} decorative />
            <div className={styles.brandName}>{t('app.name')}</div>
          </div>
          <IconButton icon={<PanelLeft size={17} />} label={t('common.toggleSidebar')} onClick={toggleSidebar} />
        </div>
        <div style={{ padding: '4px 8px 4px' }}>
          <button className={styles.navItem} data-active={isChatRoute} onClick={handleReturnToChat}>
            <MessageCircle size={17} aria-hidden="true" /><span>{t('sidebar.returnToChat')}</span>
          </button>
        </div>
        <div className={styles.sectionLabelRow}>
          <span className={styles.sectionLabel}>{t('sidebar.sectionLabel')}</span>
          {chatThinking
            ? <span className={styles.syncIndicator}><Loader2 size={12} className="spin" aria-hidden="true" /></span>
            : <span className={styles.countPill}>{ordered.length}</span>}
        </div>
        {filterEntries.length > 0 && (
          <div className={styles.filterChips}>
            {filterEntries.map(([key, value]) => (
              <button key={key} className={styles.filterChip} onClick={clearFilter} aria-label={t('sidebar.filterChipClear')}>
                {translatedFilter('keys', key)}: {translatedFilter('values', String(value))}<XIcon size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        <div className={styles.list}>
          {ordered.length === 0 && <p className={styles.emptyState}>{t('sidebar.emptyState')}</p>}
          {updateRevision > 0 && <p key={updateRevision} className={styles.updateNotice} role="status">{t('sidebar.resultsUpdated')}</p>}
          <div className={styles.statusItems} role="list">
            {visible.map((candidate, index) => {
              const previousIndex = previousIndexById.get(candidate.programId);
              const isLoadedEntry = loadedBatch?.view === view && index >= loadedBatch.from && index < loadedBatch.to;
              const isAiEntry = listSnapshot.animateFrom.length > 0 && previousIndex === undefined && !isLoadedEntry;
              const hasMoved = previousIndex !== undefined && previousIndex !== index;
              const itemStyle = hasMoved ? ({ '--sidebar-move-offset': `${(previousIndex - index) * 58}px` } as CSSProperties) : undefined;
              const priority = index < PRIORITY_COUNT;
              return (
                <button
                  key={candidate.programId}
                  role="listitem"
                  className={`${styles.item} ${priority ? styles.priorityItem : ''} ${isLoadedEntry ? styles.loadedEntry : ''} ${isAiEntry ? styles.aiEntry : ''} ${hasMoved ? styles.movedItem : ''}`}
                  style={itemStyle}
                  onClick={() => handleOpenItem(candidate.programId)}
                >
                  <span className={styles.rank} aria-label={t('sidebar.rankLabel', { rank: index + 1 })}>{index + 1}</span>
                  <span className={styles.rowText}>
                    <span className={styles.itemTitle}>{candidate.name.user}</span>
                    {priority && <span className={styles.priorityLabel}>{t('sidebar.priorityRecommendation')}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {ordered.length > PAGE_SIZE && (
            <div className={styles.pagination}>
              <p className={styles.paginationStatus} aria-live="polite">{t('sidebar.visibleStatus', { visible: visible.length, total: ordered.length })}</p>
              {nextBatchCount > 0 && (
                <button className={styles.showMoreBtn} disabled={chatThinking} onClick={handleShowMore}>
                  <span>{t('sidebar.showMoreCount', { count: nextBatchCount })}</span><ChevronDown size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className={styles.foot}>
          <button type="button">{t('sidebar.privacy')}</button><button type="button">{t('sidebar.help')}</button>
        </div>
      </div>
    </aside>
  );
}
