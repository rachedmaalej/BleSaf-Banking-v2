import { useState, useRef, useEffect } from 'react';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
  redBg: '#FEE2E2',
  amberBg: '#FEF3C7',
};

// Alert types
export type AlertType = 'long_wait' | 'queue_backup' | 'slow_teller' | 'break_overtime';
export type AlertSeverity = 'warning' | 'critical';

export interface AlertAction {
  label: string;
  icon: string;
  onClick: () => Promise<void> | void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export interface EnhancedAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  details: string;
  timestamp: Date;
  // Contextual data
  ticketId?: string;
  ticketNumber?: string;
  serviceName?: string;
  tellerId?: string;
  tellerName?: string;
  counterId?: string;
  counterNumber?: number;
  waitMins?: number;
  // Actions will be computed based on type
}

interface AlertPanelProps {
  alerts: EnhancedAlert[];
  onAlertAction?: (alertId: string, action: string) => void;
  onOpenCounter?: () => Promise<void>;
  onPrioritizeTicket?: (ticketId: string) => Promise<void>;
  onEndBreak?: (breakId: string, counterId: string) => Promise<void>;
  onExtendBreak?: (breakId: string, counterId: string) => Promise<void>;
  branchId?: string;
}

export function AlertPanel({
  alerts,
  onOpenCounter,
  onPrioritizeTicket,
  onEndBreak,
  onExtendBreak,
}: AlertPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (alerts.length === 0) return null;

  const hasCritical = alerts.some((a) => a.severity === 'critical');

  const handleAction = async (actionId: string, callback: () => Promise<void> | void) => {
    setLoadingAction(actionId);
    try {
      await callback();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'long_wait':
        return 'schedule';
      case 'queue_backup':
        return 'groups';
      case 'slow_teller':
        return 'speed';
      case 'break_overtime':
        return 'coffee';
      default:
        return 'warning';
    }
  };

  const getAlertActions = (alert: EnhancedAlert): AlertAction[] => {
    const actions: AlertAction[] = [];

    switch (alert.type) {
      case 'long_wait':
        if (alert.ticketId && onPrioritizeTicket) {
          actions.push({
            label: 'Prioritiser',
            icon: 'vertical_align_top',
            onClick: () => onPrioritizeTicket(alert.ticketId!),
            variant: 'primary',
          });
        }
        break;

      case 'queue_backup':
        if (onOpenCounter) {
          actions.push({
            label: 'Ouvrir guichet',
            icon: 'add_circle',
            onClick: onOpenCounter,
            variant: 'primary',
          });
        }
        break;

      case 'slow_teller':
        // Could add "View Activity" or "Send Message" actions here
        break;

      case 'break_overtime':
        if (alert.counterId && onEndBreak) {
          actions.push({
            label: 'Fin pause',
            icon: 'stop_circle',
            onClick: () => onEndBreak(alert.id, alert.counterId!),
            variant: 'danger',
          });
        }
        if (alert.counterId && onExtendBreak) {
          actions.push({
            label: '+10 min',
            icon: 'more_time',
            onClick: () => onExtendBreak(alert.id, alert.counterId!),
            variant: 'secondary',
          });
        }
        break;
    }

    return actions;
  };

  // Get a brief summary of the most critical alert for the badge
  const getBadgeSummary = () => {
    const criticalAlert = alerts.find((a) => a.severity === 'critical') || alerts[0];
    if (!criticalAlert) return '';

    switch (criticalAlert.type) {
      case 'long_wait':
        return criticalAlert.ticketNumber
          ? `${criticalAlert.ticketNumber} +${criticalAlert.waitMins}min`
          : `${alerts.filter((a) => a.type === 'long_wait').length} client(s) +20min`;
      case 'queue_backup':
        return 'File longue';
      case 'slow_teller':
        return 'Guichetier lent';
      case 'break_overtime':
        return 'Pause dépassée';
      default:
        return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Alert Badge Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
        style={{
          backgroundColor: hasCritical ? SG_COLORS.redBg : SG_COLORS.amberBg,
          color: hasCritical ? SG_COLORS.red : SG_COLORS.amber,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          warning
        </span>
        <span>{alerts.length}</span>
        <span className="mx-1 text-xs opacity-75">·</span>
        <span className="text-xs">{getBadgeSummary()}</span>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{ backgroundColor: hasCritical ? SG_COLORS.redBg : SG_COLORS.amberBg }}
          >
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: hasCritical ? SG_COLORS.red : SG_COLORS.amber }}
              >
                warning
              </span>
              <span className="font-semibold" style={{ color: SG_COLORS.black }}>
                {alerts.length} Alerte{alerts.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.gray }}>
                close
              </span>
            </button>
          </div>

          {/* Alert List */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {alerts.map((alert, index) => {
              const actions = getAlertActions(alert);
              const isLast = index === alerts.length - 1;

              return (
                <div
                  key={alert.id}
                  className={`p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
                >
                  {/* Alert Header */}
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: alert.severity === 'critical' ? SG_COLORS.redBg : SG_COLORS.amberBg,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '18px',
                          color: alert.severity === 'critical' ? SG_COLORS.red : SG_COLORS.amber,
                        }}
                      >
                        {getAlertIcon(alert.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: alert.severity === 'critical' ? SG_COLORS.red : SG_COLORS.amber,
                          }}
                        >
                          {alert.severity === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm" style={{ color: SG_COLORS.black }}>
                        {alert.title}
                      </h4>
                    </div>
                  </div>

                  {/* Alert Details Card */}
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{ backgroundColor: '#F8F8F8' }}
                  >
                    {alert.type === 'long_wait' && alert.ticketNumber && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold" style={{ color: SG_COLORS.black }}>
                            {alert.ticketNumber}
                          </span>
                          {alert.serviceName && (
                            <span className="text-sm ml-2" style={{ color: SG_COLORS.gray }}>
                              · {alert.serviceName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm" style={{ color: SG_COLORS.red }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            schedule
                          </span>
                          <span className="font-medium">{alert.waitMins} min</span>
                        </div>
                      </div>
                    )}

                    {alert.type === 'queue_backup' && (
                      <div className="text-sm" style={{ color: SG_COLORS.gray }}>
                        {alert.details}
                      </div>
                    )}

                    {alert.type === 'slow_teller' && alert.tellerName && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: SG_COLORS.black }}>
                          {alert.tellerName}
                        </span>
                        <span className="text-sm" style={{ color: SG_COLORS.amber }}>
                          Moy. {alert.waitMins} min/client
                        </span>
                      </div>
                    )}

                    {alert.type === 'break_overtime' && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: SG_COLORS.black }}>
                          Guichet {alert.counterNumber}
                        </span>
                        <span className="text-sm" style={{ color: SG_COLORS.amber }}>
                          {alert.details}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {actions.length > 0 && (
                    <div className="flex items-center gap-2">
                      {actions.map((action, actionIndex) => {
                        const actionId = `${alert.id}-${actionIndex}`;
                        const isLoading = loadingAction === actionId;

                        return (
                          <button
                            key={actionIndex}
                            onClick={() => handleAction(actionId, action.onClick)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{
                              backgroundColor:
                                action.variant === 'primary'
                                  ? SG_COLORS.red
                                  : action.variant === 'danger'
                                  ? SG_COLORS.red
                                  : '#F3F4F6',
                              color:
                                action.variant === 'primary' || action.variant === 'danger'
                                  ? 'white'
                                  : SG_COLORS.gray,
                            }}
                          >
                            {isLoading ? (
                              <span
                                className="material-symbols-outlined animate-spin"
                                style={{ fontSize: '14px' }}
                              >
                                progress_activity
                              </span>
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                {action.icon}
                              </span>
                            )}
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to build enhanced alerts from dashboard data
export function buildEnhancedAlerts(
  waitingTickets: Array<{
    id: string;
    ticketNumber: string;
    serviceName?: string;
    createdAt: string | Date;
  }>,
  agentStats: Array<{
    userId: string;
    userName: string;
    avgServiceMins: number;
  }>,
  stats: { waiting: number } | null,
  activeBreaks: Record<string, {
    breakId: string;
    reason: string;
    expectedEnd: string;
    userName: string;
  }>,
  counters: Array<{ id: string; number: number }>,
  thresholds: {
    LONG_WAIT_MINS: number;
    QUEUE_WARNING: number;
    QUEUE_CRITICAL: number;
    SLOW_TELLER_MINS: number;
  }
): EnhancedAlert[] {
  const alerts: EnhancedAlert[] = [];
  const now = new Date();

  // Long wait alerts - individual customers waiting too long
  waitingTickets.forEach((ticket) => {
    const createdAt = new Date(ticket.createdAt);
    const waitMins = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    if (waitMins >= thresholds.LONG_WAIT_MINS) {
      alerts.push({
        id: `long-wait-${ticket.id}`,
        type: 'long_wait',
        severity: waitMins >= thresholds.LONG_WAIT_MINS + 10 ? 'critical' : 'warning',
        title: 'Client en attente prolongée',
        details: `${ticket.ticketNumber} attend depuis ${waitMins} minutes`,
        timestamp: createdAt,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceName: ticket.serviceName,
        waitMins,
      });
    }
  });

  // Queue backup alert
  if (stats && stats.waiting >= thresholds.QUEUE_WARNING) {
    const isCritical = stats.waiting >= thresholds.QUEUE_CRITICAL;
    alerts.push({
      id: 'queue-backup',
      type: 'queue_backup',
      severity: isCritical ? 'critical' : 'warning',
      title: isCritical ? 'File critique' : 'File longue',
      details: `${stats.waiting} clients en attente`,
      timestamp: now,
    });
  }

  // Slow teller alerts
  agentStats.forEach((agent) => {
    if (agent.avgServiceMins > thresholds.SLOW_TELLER_MINS) {
      alerts.push({
        id: `slow-teller-${agent.userId}`,
        type: 'slow_teller',
        severity: 'warning',
        title: 'Guichetier lent',
        details: `${agent.userName} - moyenne ${Math.round(agent.avgServiceMins)} min/client`,
        timestamp: now,
        tellerId: agent.userId,
        tellerName: agent.userName,
        waitMins: Math.round(agent.avgServiceMins),
      });
    }
  });

  // Break overtime alerts
  Object.entries(activeBreaks).forEach(([counterId, breakInfo]) => {
    const expectedEnd = new Date(breakInfo.expectedEnd);
    const overtimeMins = Math.floor((now.getTime() - expectedEnd.getTime()) / 60000);

    if (overtimeMins > 0) {
      const counter = counters.find((c) => c.id === counterId);
      alerts.push({
        id: breakInfo.breakId,
        type: 'break_overtime',
        severity: overtimeMins >= 10 ? 'critical' : 'warning',
        title: 'Pause dépassée',
        details: `Dépassement de ${overtimeMins} min`,
        timestamp: expectedEnd,
        counterId,
        counterNumber: counter?.number,
      });
    }
  });

  // Sort by severity (critical first) then by timestamp
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}
