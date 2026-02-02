import { AlertPanel, EnhancedAlert } from './AlertPanel';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
};

interface SlaData {
  sla: {
    percentage: number;
    status: string;
  };
}

interface HeroStatusPanelProps {
  waitingCount: number;
  avgWaitMins: number;
  openCounters: number;
  totalCounters: number;
  slaData?: SlaData | null;
  onOpenCounter?: () => void;
  // Alert props
  alerts: EnhancedAlert[];
  branchId: string;
  onPrioritizeTicket?: (ticketId: string) => Promise<void>;
  onEndBreak?: (breakId: string, counterId: string) => Promise<void>;
  onExtendBreak?: (breakId: string, counterId: string) => Promise<void>;
  // Timestamp
  lastUpdated?: Date | null;
}

export function HeroStatusPanel({
  waitingCount,
  avgWaitMins,
  openCounters,
  totalCounters,
  slaData,
  onOpenCounter,
  alerts,
  branchId,
  onPrioritizeTicket,
  onEndBreak,
  onExtendBreak,
  lastUpdated,
}: HeroStatusPanelProps) {

  // Determine status colors
  const getWaitingColor = () => {
    if (waitingCount >= 20) return SG_COLORS.red;
    if (waitingCount >= 10) return SG_COLORS.amber;
    return SG_COLORS.black;
  };

  const getWaitTimeColor = () => {
    if (avgWaitMins > 20) return SG_COLORS.red;
    if (avgWaitMins > 15) return SG_COLORS.amber;
    return SG_COLORS.black;
  };

  const getSlaColor = () => {
    if (!slaData) return SG_COLORS.gray;
    switch (slaData.sla.status) {
      case 'green': return SG_COLORS.green;
      case 'yellow': return SG_COLORS.amber;
      case 'red': return SG_COLORS.red;
      default: return SG_COLORS.gray;
    }
  };

  const slaPercentage = slaData?.sla.percentage ?? 100;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Main Hero Section */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between gap-8">
          {/* Left: Primary Metrics */}
          <div className="flex items-end gap-10">
            {/* Primary Metric: Waiting Count (Largest) */}
            <div className="text-center">
              <div
                className="text-6xl font-extralight leading-none mb-1"
                style={{ color: getWaitingColor(), letterSpacing: '-0.02em' }}
              >
                {waitingCount}
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                En attente
              </div>
            </div>

            {/* Secondary Metric: Avg Wait Time */}
            <div className="text-center">
              <div
                className="text-4xl font-extralight leading-none mb-1"
                style={{ color: getWaitTimeColor(), letterSpacing: '-0.02em' }}
              >
                ~{avgWaitMins}
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                min attente moy.
              </div>
            </div>
          </div>

          {/* Center: SLA + Capacity */}
          <div className="flex-1 max-w-sm">
            {/* SLA Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm text-gray-600">SLA</span>
                  <span className="text-xs ml-2" style={{ color: '#999' }}>
                    (% servis en moins de 15 min)
                  </span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: getSlaColor() }}
                >
                  {slaPercentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${slaPercentage}%`,
                    backgroundColor: getSlaColor(),
                  }}
                />
              </div>
            </div>

            {/* Capacity + Open Counter Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                <span className="font-semibold" style={{ color: SG_COLORS.black }}>
                  {openCounters}/{totalCounters}
                </span>{' '}
                guichets ouverts
              </span>
              {openCounters < totalCounters && onOpenCounter && (
                <button
                  onClick={onOpenCounter}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: SG_COLORS.green,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    add
                  </span>
                  Ouvrir
                </button>
              )}
            </div>
          </div>

          {/* Right: Alerts + Timestamp */}
          <div className="flex items-center gap-4">
            {/* AlertPanel Dropdown */}
            {alerts.length > 0 && (
              <AlertPanel
                alerts={alerts}
                branchId={branchId}
                onOpenCounter={onOpenCounter}
                onPrioritizeTicket={onPrioritizeTicket}
                onEndBreak={onEndBreak}
                onExtendBreak={onExtendBreak}
              />
            )}

            {/* Timestamp */}
            {lastUpdated && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  schedule
                </span>
                {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
