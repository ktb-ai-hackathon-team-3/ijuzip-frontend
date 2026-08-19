import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageCircle, PanelLeft, X as XIcon } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiStore } from '../../stores/uiStore';
import { useProgramNames } from '../../hooks/useProgramNames';
import { IconButton } from '../common/IconButton';
import { MatchRing } from '../common/MatchRing';
import { StatusBadge } from '../common/StatusBadge';
import type { Candidate, ConditionStatus } from '../../api/types';
import styles from './WelfareSidebar.module.css';

const CONDITION_TONE: Record<ConditionStatus, 'positive' | 'warning' | 'negative'> = {
  LIKELY: 'positive',
  NEED_INFO: 'warning',
  BLOCKED: 'negative',
};

interface WelfareSidebarProps {
  ariaLabel: string;
}

export function WelfareSidebar({ ariaLabel }: WelfareSidebarProps) {
  const { t } = useTranslation();
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

  const [expanded, setExpanded] = useState(false);

  const byId = useMemo(() => new Map(candidates.map((c) => [c.programId, c])), [candidates]);
  const ordered: Candidate[] = useMemo(() => {
    if (!view) return candidates;
    const fromRanking = view.ranking.map((r) => byId.get(r.programId)).filter((c): c is Candidate => !!c);
    const remaining = candidates.filter((c) => !view.ranking.some((r) => r.programId === c.programId));
    return [...fromRanking, ...remaining];
  }, [view, candidates, byId]);

  const visibleCount = expanded ? ordered.length : (view?.visibleCount ?? 5);
  const visible = ordered.slice(0, visibleCount);
  const names = useProgramNames(visible.map((c) => c.programId));

  function handleOpenItem(programId: string) {
    openDetailModal(programId);
    if (isMobile) closeMobileDrawer();
  }

  function handleReturnToChat() {
    navigate('/consultation');
    if (isMobile) closeMobileDrawer();
  }

  function clearFilter() {
    // See WelfareSidebar note: clearing a viewFilter isn't a defined REST
    // action — the contract only lets a chat FILTER turn set it. This is a
    // client-only reset so the "X to clear" affordance from §5.3 exists;
    // the next FILTER/BOTH turn re-establishes server truth over it.
    applySidebarUpdate({ ranking: view?.ranking ?? [], viewFilter: {}, sortBy: 'relevance', visibleCount: view?.visibleCount ?? 5 });
  }

  const filterEntries = Object.entries(view?.viewFilter ?? {}).filter(([, v]) => v);
  const isChatRoute = location.pathname === '/consultation';

  return (
    <aside className={styles.sidebar} aria-label={ariaLabel}>
      <div className={styles.sidebarInner}>
        <div className={styles.head}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>I</div>
            <div className={styles.brandName}>{t('app.name')}</div>
          </div>
          <IconButton icon={<PanelLeft size={17} />} label={t('common.toggleSidebar')} onClick={toggleSidebar} />
        </div>

        <div style={{ padding: '4px 8px 4px' }}>
          <button className={styles.navItem} data-active={isChatRoute} onClick={handleReturnToChat}>
            <MessageCircle size={17} aria-hidden="true" />
            <span>{t('sidebar.returnToChat')}</span>
          </button>
        </div>

        <div className={styles.sectionLabelRow}>
          <span className={styles.sectionLabel}>{t('sidebar.sectionLabel')}</span>
          {chatThinking ? (
            <span className={styles.syncIndicator}>
              <Loader2 size={12} className="spin" aria-hidden="true" />
            </span>
          ) : (
            <span className={styles.countPill}>{ordered.length}</span>
          )}
        </div>

        {filterEntries.length > 0 && (
          <div className={styles.filterChips}>
            {filterEntries.map(([key, value]) => (
              <button key={key} className={styles.filterChip} onClick={clearFilter} aria-label={t('sidebar.filterChipClear')}>
                {key}: {value}
                <XIcon size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className={styles.list} role="list">
          {ordered.length === 0 && <p className={styles.emptyState}>{t('sidebar.emptyState')}</p>}

          {visible.map((candidate) => {
            const nameQuery = names.get(candidate.programId);
            const title = nameQuery?.data?.name.user ?? '';
            return (
              <button
                key={candidate.programId}
                role="listitem"
                className={styles.item}
                data-blocked={candidate.conditionStatus === 'BLOCKED'}
                onClick={() => handleOpenItem(candidate.programId)}
              >
                <MatchRing score={candidate.baseScore} size={30} />
                <span className={styles.rowText}>
                  <span className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{nameQuery?.isLoading ? t('common.loading') : title}</span>
                  </span>
                  {candidate.conditionStatus !== 'LIKELY' && (
                    <span className={styles.itemMetaRow}>
                      <StatusBadge tone={CONDITION_TONE[candidate.conditionStatus]} label={t(`sidebar.conditionStatus.${candidate.conditionStatus}`)} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {!expanded && ordered.length > visibleCount && (
            <button className={styles.showMoreBtn} onClick={() => setExpanded(true)}>
              {t('sidebar.showMore')} ({ordered.length - visibleCount})
            </button>
          )}
          {expanded && ordered.length > (view?.visibleCount ?? 5) && (
            <button className={styles.showMoreBtn} onClick={() => setExpanded(false)}>
              {t('sidebar.showLess')}
            </button>
          )}
        </div>

        <div className={styles.foot}>
          <button type="button">{t('sidebar.privacy')}</button>
          <button type="button">{t('sidebar.help')}</button>
        </div>
      </div>
    </aside>
  );
}
