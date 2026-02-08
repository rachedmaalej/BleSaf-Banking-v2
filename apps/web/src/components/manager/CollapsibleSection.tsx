import { useState, useRef, ReactNode } from 'react';

// SG Brand Colors
const SG_COLORS = {
  black: '#1A1A1A',
  gray: '#666666',
  red: '#E9041E',
  green: '#10B981',
  amber: '#F59E0B',
  rose: '#D66874',
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
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    // Scroll into view when expanding
    if (willExpand) {
      // Use setTimeout to wait for the content to render
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div
      ref={contentRef}
      className="border-b border-gray-200"
      style={{ backgroundColor: '#FAFAFA' }}
    >
      {/* Collapsed summary header */}
      <button
        onClick={handleToggle}
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

// Enhanced agent interface with new metrics
interface EnhancedAgent {
  id: string;
  name: string;
  served: number;
  avgMins: number;
  avgRestMins: number;
  utilization: number;
  championScore: number;
  isTop?: boolean;
  isSlow?: boolean;
}

// Team performance mini card - Enhanced version
interface TeamPerformanceCardProps {
  agents: Array<{
    id: string;
    name: string;
    served: number;
    avgMins: number;
    isTop?: boolean;
    isSlow?: boolean;
  }>;
  teamAvgServed: number;
  teamAvgMins: number;
  onTellerClick?: (tellerId: string, tellerName: string) => void;
}

export function TeamPerformanceCard({
  agents,
  teamAvgServed,
  teamAvgMins,
  onTellerClick,
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
              {onTellerClick ? (
                <button
                  onClick={() => onTellerClick(agent.id, agent.name)}
                  className="hover:underline focus:outline-none"
                  style={{ color: agent.isSlow ? '#D66874' : SG_COLORS.black }}
                >
                  {agent.name}
                </button>
              ) : (
                <span style={{ color: agent.isSlow ? '#D66874' : SG_COLORS.black }}>
                  {agent.name}
                </span>
              )}
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

// Enhanced Team Performance Card with team-level summary stats
interface EnhancedTeamPerformanceCardProps {
  totalServed: number;
  avgServiceMins: number;
  avgRestMins: number;
  agents: EnhancedAgent[];
  onTellerClick?: (tellerId: string, tellerName: string) => void;
}

export function EnhancedTeamPerformanceCard({
  totalServed,
  avgServiceMins,
  avgRestMins,
  agents,
  onTellerClick,
}: EnhancedTeamPerformanceCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
          leaderboard
        </span>
        <span className="text-sm font-semibold text-gray-700">Performance Equipe</span>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xl font-semibold" style={{ color: SG_COLORS.black }}>
            {totalServed}
          </div>
          <div className="text-xs text-gray-500">Clients</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xl font-semibold" style={{ color: SG_COLORS.black }}>
            ~{avgServiceMins}
          </div>
          <div className="text-xs text-gray-500">Min/svc</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xl font-semibold" style={{ color: SG_COLORS.black }}>
            ~{avgRestMins}
          </div>
          <div className="text-xs text-gray-500">Min repos</div>
        </div>
      </div>

      {/* Teller List */}
      <div className="space-y-2">
        {agents.slice(0, 4).map((agent, i) => (
          <div key={agent.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-gray-400 text-xs w-4">{i + 1}.</span>
              {onTellerClick ? (
                <button
                  onClick={() => onTellerClick(agent.id, agent.name)}
                  className="hover:underline focus:outline-none truncate"
                  style={{ color: SG_COLORS.black }}
                >
                  {agent.name}
                </button>
              ) : (
                <span className="truncate" style={{ color: SG_COLORS.black }}>{agent.name}</span>
              )}
              {agent.utilization < 50 && agent.served > 0 && (
                <span
                  className="text-xs px-1 py-0.5 rounded flex-shrink-0"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: SG_COLORS.amber }}
                >
                  Sous-util
                </span>
              )}
            </div>
            <span className="font-medium flex-shrink-0 ml-2">{agent.served}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Daily target mini card
interface DailyTargetCardProps {
  served: number;
  target: number;
  progress: number;
  onEdit?: () => void;
}

export function DailyTargetCard({ served, target, progress, onEdit }: DailyTargetCardProps) {
  const remaining = Math.max(target - served, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
            check_circle
          </span>
          <span className="text-sm font-semibold text-gray-700">Objectif Quotidien</span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Modifier l'objectif"
          >
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>
              edit
            </span>
          </button>
        )}
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

// Top service interface
interface TopService {
  serviceId: string;
  serviceName: string;
  prefix: string;
  count: number;
}

// Branch Objectives Card - Combines daily target, wait time, and top services
interface BranchObjectivesCardProps {
  served: number;
  target: number;
  avgWaitMins: number;
  waitTarget: number;
  topServices: TopService[];
  onEditTarget?: () => void;
}

export function BranchObjectivesCard({
  served,
  target,
  avgWaitMins,
  waitTarget,
  topServices,
  onEditTarget,
}: BranchObjectivesCardProps) {
  const progress = Math.min(Math.round((served / target) * 100), 100);
  const waitStatus = avgWaitMins <= waitTarget ? 'good' : avgWaitMins <= waitTarget * 1.5 ? 'warning' : 'bad';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
            target
          </span>
          <span className="text-sm font-semibold text-gray-700">Objectifs</span>
        </div>
        {onEditTarget && (
          <button
            onClick={onEditTarget}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Modifier l'objectif"
          >
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>
              edit
            </span>
          </button>
        )}
      </div>

      {/* Served Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Clients servis</span>
          <span className="font-medium">{served}/{target}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? SG_COLORS.green : SG_COLORS.black,
            }}
          />
        </div>
      </div>

      {/* Avg Wait */}
      <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-100">
        <span className="text-gray-600">Attente moyenne</span>
        <span
          className="font-medium"
          style={{
            color: waitStatus === 'good' ? SG_COLORS.green : waitStatus === 'warning' ? SG_COLORS.amber : SG_COLORS.red,
          }}
        >
          ~{avgWaitMins} min
        </span>
      </div>

      {/* Top 3 Services */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Top services</div>
        {topServices.length > 0 ? (
          <div className="space-y-1">
            {topServices.map((svc) => (
              <div key={svc.serviceId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-xs font-mono px-1 rounded flex-shrink-0"
                    style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                  >
                    {svc.prefix}
                  </span>
                  <span className="text-gray-700 truncate">{svc.serviceName}</span>
                </span>
                <span className="text-gray-500 flex-shrink-0 ml-2">{svc.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">Aucune activite</div>
        )}
      </div>
    </div>
  );
}

// Team Champion Card - Highlights the best performer
interface TeamChampionCardProps {
  champion: EnhancedAgent | null;
  runnerUp: EnhancedAgent | null;
  onViewTimeline?: (tellerId: string, tellerName: string) => void;
}

export function TeamChampionCard({
  champion,
  runnerUp,
  onViewTimeline,
}: TeamChampionCardProps) {
  if (!champion || champion.served === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
            emoji_events
          </span>
          <span className="text-sm font-semibold text-gray-700">Champion du Jour</span>
        </div>
        <div className="text-center py-4 text-gray-400">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
            hourglass_empty
          </span>
          <p className="text-sm mt-2">En attente d'activite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: SG_COLORS.amber }}>
          emoji_events
        </span>
        <span className="text-sm font-semibold text-gray-700">Champion du Jour</span>
      </div>

      {/* Champion Highlight */}
      <div
        className="p-3 rounded-lg mb-3"
        style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            {onViewTimeline ? (
              <button
                onClick={() => onViewTimeline(champion.id, champion.name)}
                className="font-semibold hover:underline truncate block w-full text-left"
                style={{ color: SG_COLORS.black }}
              >
                {champion.name}
              </button>
            ) : (
              <span className="font-semibold truncate block" style={{ color: SG_COLORS.black }}>
                {champion.name}
              </span>
            )}
            <div className="text-xs text-gray-600">
              Score: {champion.championScore}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold" style={{ color: SG_COLORS.black }}>
              {champion.served}
            </div>
            <div className="text-xs text-gray-500">clients</div>
          </div>
        </div>
        <div className="flex gap-3 mt-2 text-xs text-gray-600 flex-wrap">
          <span>~{champion.avgMins} min/svc</span>
          <span>~{champion.avgRestMins} min repos</span>
          <span>{champion.utilization}% util</span>
        </div>
      </div>

      {/* Runner-up */}
      {runnerUp && runnerUp.served > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <span>🥈</span>
            <span className="truncate">{runnerUp.name}</span>
          </span>
          <span className="flex-shrink-0">{runnerUp.served} clients</span>
        </div>
      )}
    </div>
  );
}
