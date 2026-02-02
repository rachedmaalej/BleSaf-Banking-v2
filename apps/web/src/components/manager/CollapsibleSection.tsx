import { useState, ReactNode } from 'react';

// SG Brand Colors
const SG_COLORS = {
  black: '#1A1A1A',
  gray: '#666666',
};

interface CollapsibleSummaryItem {
  icon: string;
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface CollapsibleSectionProps {
  summaryItems: CollapsibleSummaryItem[];
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  summaryItems,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className="border-b border-gray-200"
      style={{ backgroundColor: '#FAFAFA' }}
    >
      {/* Collapsed summary header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-6 text-sm">
          {summaryItems.map((item, index) => (
            <span
              key={index}
              className="flex items-center gap-2"
              style={{ color: item.highlight ? SG_COLORS.black : SG_COLORS.gray }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: SG_COLORS.gray }}
              >
                {item.icon}
              </span>
              <span>
                {item.label}:{' '}
                <strong style={{ color: item.highlight ? SG_COLORS.black : undefined }}>
                  {item.value}
                </strong>
              </span>
            </span>
          ))}
        </div>
        <span
          className="material-symbols-outlined transition-transform"
          style={{
            fontSize: '20px',
            color: SG_COLORS.gray,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// Helper component for expanded section content layout
interface SecondaryGridProps {
  children: ReactNode;
}

export function SecondaryGrid({ children }: SecondaryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
      {children}
    </div>
  );
}

// Team performance mini card
interface TeamPerformanceCardProps {
  agents: Array<{
    name: string;
    served: number;
    avgMins: number;
    isTop?: boolean;
    isSlow?: boolean;
  }>;
  teamAvgServed: number;
  teamAvgMins: number;
}

export function TeamPerformanceCard({
  agents,
  teamAvgServed,
  teamAvgMins,
}: TeamPerformanceCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
          group
        </span>
        <span className="text-sm font-semibold text-gray-700">Performance Equipe</span>
      </div>
      <div className="space-y-2">
        {agents.slice(0, 3).map((agent, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              {agent.isTop && <span>🥇</span>}
              <span style={{ color: agent.isSlow ? '#D66874' : SG_COLORS.black }}>
                {agent.name}
              </span>
              {agent.isSlow && (
                <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(214, 104, 116, 0.1)', color: '#D66874' }}>
                  Lent
                </span>
              )}
            </span>
            <span className="font-medium">{agent.served}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Moy: {teamAvgServed}/agent</span>
        <span>~{teamAvgMins.toFixed(1)} min/client</span>
      </div>
    </div>
  );
}

// Daily target mini card
interface DailyTargetCardProps {
  served: number;
  target: number;
  progress: number;
}

export function DailyTargetCard({ served, target, progress }: DailyTargetCardProps) {
  const remaining = Math.max(target - served, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
          check_circle
        </span>
        <span className="text-sm font-semibold text-gray-700">Objectif Quotidien</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-light" style={{ color: SG_COLORS.black }}>
          {served}
        </span>
        <span className="text-sm text-gray-500">/ {target}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: progress >= 100 ? '#10B981' : SG_COLORS.black,
          }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {remaining > 0 ? `${remaining} restants` : 'Objectif atteint!'}
      </div>
    </div>
  );
}

// Branch ranking mini card
interface BranchRankingCardProps {
  rank: number | null;
  totalBranches: number;
  gapToLeader: number;
  isLeader: boolean;
}

export function BranchRankingCard({
  rank,
  totalBranches,
  gapToLeader,
  isLeader,
}: BranchRankingCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
          emoji_events
        </span>
        <span className="text-sm font-semibold text-gray-700">Classement</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-light" style={{ color: SG_COLORS.black }}>
          #{rank || '-'}
        </span>
        <span className="text-sm text-gray-500">/ {totalBranches}</span>
      </div>
      {isLeader ? (
        <div className="flex items-center gap-1 text-xs" style={{ color: SG_COLORS.black }}>
          <span>🏆</span>
          <span className="font-medium">En tête!</span>
        </div>
      ) : gapToLeader > 0 ? (
        <div className="text-xs text-gray-500">
          -{gapToLeader} vs leader
        </div>
      ) : null}
    </div>
  );
}
