import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { templateApi, adminApi } from '../../lib/api';

interface ChangeLogEntry {
  id: string;
  entityType: 'template' | 'service';
  entityId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ChangeHistoryPanelProps {
  isOpen: boolean;
  entityType: 'template' | 'service';
  entityId: string;
  entityName: string;
  onClose: () => void;
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  create: { icon: 'add_circle', label: 'Creation', color: '#10B981', bg: 'bg-green-50' },
  update: { icon: 'edit', label: 'Modification', color: '#3B82F6', bg: 'bg-blue-50' },
  delete: { icon: 'delete', label: 'Suppression', color: '#E9041E', bg: 'bg-red-50' },
  sync: { icon: 'sync', label: 'Synchronisation', color: '#8B5CF6', bg: 'bg-purple-50' },
  deploy: { icon: 'rocket_launch', label: 'Deploiement', color: '#F59E0B', bg: 'bg-amber-50' },
};

const PAGE_SIZE = 15;

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 30) return `il y a ${diffDays}j`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `il y a ${diffMonths} mois`;
  const diffYears = Math.floor(diffMonths / 12);
  return `il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
}

export function ChangeHistoryPanel({
  isOpen,
  entityType,
  entityId,
  entityName,
  onClose,
}: ChangeHistoryPanelProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = entityType === 'template'
        ? await templateApi.getHistory(entityId, pageNum, PAGE_SIZE)
        : await adminApi.getServiceHistory(entityId, pageNum, PAGE_SIZE);

      const data = res.data.data as ChangeLogEntry[];
      const pag = res.data.pagination as Pagination;

      setEntries(prev => append ? [...prev, ...data] : data);
      setPagination(pag);
      setPage(pageNum);
    } catch {
      setError('Impossible de charger l\'historique');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (isOpen && entityId) {
      setEntries([]);
      setPagination(null);
      setPage(1);
      fetchHistory(1, false);
    }
  }, [isOpen, entityId, fetchHistory]);

  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages) {
      fetchHistory(page + 1, true);
    }
  };

  const hasMore = pagination ? page < pagination.totalPages : false;

  const entityTypeLabel = entityType === 'template' ? 'Modele' : 'Service';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              Historique des modifications
            </h2>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {entityTypeLabel} : {entityName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 px-5">
              <span
                className="material-symbols-outlined mb-3"
                style={{ fontSize: '40px', color: '#E9041E' }}
              >
                error
              </span>
              <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
              <button
                onClick={() => fetchHistory(1, false)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#3B82F6' }}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-5">
              <span
                className="material-symbols-outlined mb-3"
                style={{ fontSize: '40px', color: '#9CA3AF' }}
              >
                history
              </span>
              <p className="text-sm text-gray-500 text-center">
                Aucun historique disponible
              </p>
            </div>
          )}

          {/* Timeline */}
          {!loading && !error && entries.length > 0 && (
            <div className="px-5 py-4">
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-6 bottom-0 w-px bg-gray-200" />

                <div className="space-y-5">
                  {entries.map((entry) => {
                    const config = ACTION_CONFIG[entry.action] ?? {
                      icon: 'info',
                      label: entry.action,
                      color: '#6B7280',
                      bg: 'bg-gray-50',
                    };

                    return (
                      <div key={entry.id} className="relative flex gap-3">
                        {/* Timeline dot */}
                        <div
                          className={`relative z-10 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: config.color }}
                          >
                            {config.icon}
                          </span>
                        </div>

                        {/* Entry content */}
                        <div className="flex-1 min-w-0 pb-1">
                          {/* Action + time */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-sm font-medium"
                              style={{ color: config.color }}
                            >
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>

                          {/* Field name */}
                          {entry.field && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Champ : <span className="font-medium text-gray-700">{entry.field}</span>
                            </p>
                          )}

                          {/* Value diff */}
                          {(entry.oldValue !== null || entry.newValue !== null) && (
                            <div className="mt-1.5 p-2 bg-gray-50 rounded-md text-xs font-mono leading-relaxed">
                              {entry.oldValue !== null && (
                                <span className="line-through text-red-500">
                                  {entry.oldValue}
                                </span>
                              )}
                              {entry.oldValue !== null && entry.newValue !== null && (
                                <span className="mx-1.5 text-gray-400">&rarr;</span>
                              )}
                              {entry.newValue !== null && (
                                <span className="text-green-600">
                                  {entry.newValue}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Changed by */}
                          <p className="text-xs text-gray-400 mt-1">
                            par {entry.changedBy}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="mt-5 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          expand_more
                        </span>
                        Charger plus
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Total count */}
              {pagination && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  {entries.length} sur {pagination.total} modification{pagination.total > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
