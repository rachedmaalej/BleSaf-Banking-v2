import { useTranslation } from 'react-i18next';
import type { Recommendation, RecommendationUrgency, RecommendationActionType } from '@blesaf/shared';

interface RecommendationCardProps {
  recommendation: Recommendation;
  isExecuting: boolean;
  onExecute: (id: string) => void;
}

const URGENCY_STYLES: Record<RecommendationUrgency, { bg: string; border: string; badge: string; badgeBg: string }> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'text-white',
    badgeBg: 'bg-[#E9041E]',
  },
  high: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'text-amber-900',
    badgeBg: 'bg-amber-400',
  },
  medium: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'text-gray-700',
    badgeBg: 'bg-gray-200',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'text-blue-700',
    badgeBg: 'bg-blue-100',
  },
};

const ACTION_ICONS: Record<RecommendationActionType, string> = {
  open_counter: 'add_circle',
  close_counter: 'remove_circle',
  bump_priority: 'priority_high',
  end_break: 'timer_off',
  pre_open_counter: 'schedule',
  review_tellers: 'person_search',
  request_staff: 'group_add',
  general: 'lightbulb',
};

export function RecommendationCard({ recommendation, isExecuting, onExecute }: RecommendationCardProps) {
  const { t } = useTranslation();
  const style = URGENCY_STYLES[recommendation.urgency];
  const icon = ACTION_ICONS[recommendation.actionType] || 'lightbulb';

  return (
    <div className={`rounded-lg border p-4 ${style.bg} ${style.border} transition-all`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-gray-600" style={{ fontSize: 22 }}>
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {recommendation.action}
            </h4>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.badge} ${style.badgeBg}`}>
              {t(`dashboard.ai.urgency.${recommendation.urgency}`)}
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed mb-2">
            {recommendation.rationale}
          </p>

          {recommendation.impact && (
            <p className="text-xs text-gray-500 italic mb-2">
              <span className="material-symbols-outlined align-text-bottom mr-0.5" style={{ fontSize: 14 }}>
                trending_up
              </span>
              {recommendation.impact}
            </p>
          )}

          {/* Execute button */}
          {recommendation.executable && (
            <button
              onClick={() => onExecute(recommendation.id)}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#E9041E] rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>
                    progress_activity
                  </span>
                  {t('dashboard.ai.executing')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    bolt
                  </span>
                  {t('dashboard.ai.executeNow')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
