import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { analyticsApi, adminApi, breaksApi, queueApi } from '@/lib/api';
import {
  getSocket,
  connectSocket,
  joinBranchRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';
import { BreakModal } from '@/components/manager/BreakModal';
import { TellerManagementModal } from '@/components/manager/TellerManagementModal';
import { HeroStatusPanel } from '@/components/manager/HeroStatusPanel';
import { QueueList } from '@/components/manager/QueueList';
import { buildEnhancedAlerts } from '@/components/manager/AlertPanel';
import {
  CollapsibleSection,
  SecondaryGrid,
  TeamPerformanceCard,
  DailyTargetCard,
  BranchRankingCard,
} from '@/components/manager/CollapsibleSection';

// SG Brand Colors - V1 Monochrome Palette
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  lightGray: '#F5F5F5',
  redBg: '#FEE2E2',
  roseBg: 'rgba(214, 104, 116, 0.1)',
  blackBg: 'rgba(26, 26, 26, 0.03)',
  grayBg: '#F0F0F0',
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  QUEUE_WARNING: 10,
  QUEUE_CRITICAL: 20,
  SLOW_TELLER_MINS: 15,
  LONG_WAIT_MINS: 20,
};

interface TodayStats {
  tickets: {
    total: number;
    waiting: number;
    completed: number;
    noShows: number;
  };
  times: {
    avgWaitMins: number;
    avgServiceMins: number;
  };
  counters: {
    total: number;
    open: number;
  };
}

interface AgentStat {
  userId: string;
  userName: string;
  totalServed: number;
  avgServiceMins: number;
}

interface Teller {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Comparison {
  today: { served: number; avgWait: number; noShows: number; total: number };
  yesterday: { served: number; avgWait: number; noShows: number; total: number };
  trends: { servedChange: number; waitChange: number; noShowChange: number };
}

interface BranchRank {
  branchId: string;
  branchName: string;
  branchCode: string;
  served: number;
  waiting: number;
  avgWait: number;
  rank: number;
  isUserBranch: boolean;
}

interface RankingData {
  branches: BranchRank[];
  yourRank: number | null;
  totalBranches: number;
  gapToLeader: number;
}

interface SlaData {
  sla: { percentage: number; status: string };
  dailyTarget: { target: number; served: number; progress: number };
}

export default function BranchDashboard() {
  const { t } = useTranslation();
  const { branch } = useAuthStore();
  const {
    branchStatus,
    fetchBranchStatus,
    handleTicketCalled,
    handleTicketCompleted,
    handleQueueUpdated,
  } = useQueueStore();

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [slaData, setSlaData] = useState<SlaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingCounter, setUpdatingCounter] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Break modal state
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedCounterForBreak, setSelectedCounterForBreak] = useState<{
    id: string;
    number: number;
    assignedUserName?: string;
  } | null>(null);

  // Teller management modal state
  const [tellerModalOpen, setTellerModalOpen] = useState(false);

  // Active breaks state
  const [activeBreaks, setActiveBreaks] = useState<Record<string, {
    breakId: string;
    reason: string;
    expectedEnd: string;
    userName: string;
  }>>({});

  // Build enhanced alerts with actionable context
  const enhancedAlerts = buildEnhancedAlerts(
    (branchStatus?.waitingTickets || []).map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      serviceName: t.serviceName,
      createdAt: t.createdAt,
    })),
    agentStats,
    stats ? { waiting: stats.tickets.waiting } : null,
    activeBreaks,
    branchStatus?.counters || [],
    ALERT_THRESHOLDS
  );

  // Team stats
  const teamAvgServiceMins =
    agentStats.length > 0
      ? agentStats.reduce((sum, a) => sum + a.avgServiceMins, 0) / agentStats.length
      : 0;
  const teamTotalServed = agentStats.reduce((sum, a) => sum + a.totalServed, 0);
  const teamAvgServed =
    agentStats.length > 0 ? Math.round(teamTotalServed / agentStats.length) : 0;
  const rankedTellers = [...agentStats].sort((a, b) => b.totalServed - a.totalServed);

  useEffect(() => {
    if (!branch?.id) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, agentsRes, tellersRes, comparisonRes, rankingRes, slaRes] = await Promise.all([
          analyticsApi.getTodayStats(branch.id),
          analyticsApi.getAgentStats(
            branch.id,
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
          adminApi.listUsers(1, 50, branch.id, 'teller'),
          analyticsApi.getBranchComparison(branch.id),
          analyticsApi.getBranchRanking(),
          analyticsApi.getSlaMetrics(branch.id),
        ]);

        setStats(statsRes.data.data);
        setAgentStats(agentsRes.data.data || []);
        setTellers(tellersRes.data.data || []);
        setComparison(comparisonRes.data.data);
        setRanking(rankingRes.data.data);
        setSlaData(slaRes.data.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }

      // Fetch breaks
      breaksApi.getBranchBreaks(branch.id)
        .then((breaksRes) => {
          const breaksData = breaksRes.data.data;
          if (breaksData?.activeBreaks) {
            const breaksMap: Record<string, any> = {};
            breaksData.activeBreaks.forEach((b: any) => {
              breaksMap[b.counterId] = {
                breakId: b.breakId,
                reason: b.reason,
                expectedEnd: b.expectedEnd,
                userName: b.userName,
              };
            });
            setActiveBreaks(breaksMap);
          }
        })
        .catch(() => {});
    };

    fetchData();
    fetchBranchStatus(branch.id);

    // Socket connection
    connectSocket();
    const socket = getSocket();
    joinBranchRoom(branch.id);

    const refreshStats = () => fetchData();

    const onTicketCreated = (data: any) => {
      if (data.queueStatus) handleQueueUpdated(data.queueStatus);
      refreshStats();
    };

    const onTicketCalled = (data: any) => {
      handleTicketCalled(data);
      refreshStats();
    };

    const onTicketCompleted = (data: any) => {
      handleTicketCompleted(data);
      refreshStats();
    };

    const onTicketNoShow = (data: any) => {
      if (data.queueStatus) handleQueueUpdated(data.queueStatus);
      refreshStats();
    };

    const onQueueUpdated = (data: any) => {
      handleQueueUpdated(data);
      refreshStats();
    };

    const onCounterUpdated = () => {
      fetchBranchStatus(branch.id);
      refreshStats();
    };

    socket.on(SOCKET_EVENTS.TICKET_CREATED, onTicketCreated);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, onTicketCompleted);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, onTicketCalled);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, onTicketNoShow);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, onQueueUpdated);
    socket.on(SOCKET_EVENTS.COUNTER_UPDATED, onCounterUpdated);

    socket.on('break:started', (data: any) => {
      setActiveBreaks((prev) => ({
        ...prev,
        [data.counterId]: {
          breakId: data.breakId,
          reason: data.reason,
          expectedEnd: data.expectedEnd,
          userName: data.userName,
        },
      }));
      fetchBranchStatus(branch.id);
    });

    socket.on('break:ended', (data: any) => {
      setActiveBreaks((prev) => {
        const updated = { ...prev };
        delete updated[data.counterId];
        return updated;
      });
      fetchBranchStatus(branch.id);
    });

    socket.on('break:extended', (data: any) => {
      setActiveBreaks((prev) => ({
        ...prev,
        [data.counterId]: {
          ...prev[data.counterId],
          expectedEnd: data.newExpectedEnd,
        },
      }));
    });

    const interval = setInterval(fetchData, 30000);

    return () => {
      socket.off(SOCKET_EVENTS.TICKET_CREATED, onTicketCreated);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, onTicketCompleted);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, onTicketCalled);
      socket.off(SOCKET_EVENTS.TICKET_NO_SHOW, onTicketNoShow);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, onQueueUpdated);
      socket.off(SOCKET_EVENTS.COUNTER_UPDATED, onCounterUpdated);
      socket.off('break:started');
      socket.off('break:ended');
      socket.off('break:extended');
      clearInterval(interval);
    };
  }, [branch?.id, fetchBranchStatus, handleTicketCalled, handleTicketCompleted, handleQueueUpdated]);

  // Counter actions
  const toggleCounter = async (counterId: string, currentStatus: string) => {
    setUpdatingCounter(counterId);
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      await adminApi.updateCounter(counterId, { status: newStatus });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to toggle counter:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  const assignTeller = async (counterId: string, userId: string | null) => {
    setUpdatingCounter(counterId);
    try {
      await adminApi.updateCounter(counterId, { assignedUserId: userId || null });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to assign teller:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  const openBreakModal = (counter: { id: string; number: number; assignedUserName?: string }) => {
    setSelectedCounterForBreak(counter);
    setBreakModalOpen(true);
  };

  const endBreak = async (breakId: string, counterId: string) => {
    setUpdatingCounter(counterId);
    try {
      await breaksApi.endBreak(breakId);
      setActiveBreaks((prev) => {
        const updated = { ...prev };
        delete updated[counterId];
        return updated;
      });
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to end break:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  const extendBreak = async (breakId: string, counterId: string) => {
    setUpdatingCounter(counterId);
    try {
      const result = await breaksApi.extendBreak(breakId, 15);
      setActiveBreaks((prev) => ({
        ...prev,
        [counterId]: {
          ...prev[counterId],
          expectedEnd: result.data.data.newExpectedEnd,
        },
      }));
    } catch (error) {
      console.error('Failed to extend break:', error);
    } finally {
      setUpdatingCounter(null);
    }
  };

  // Find first closed counter to open
  const openFirstClosedCounter = async () => {
    const closedCounter = branchStatus?.counters.find((c) => c.status === 'closed');
    if (closedCounter) {
      await toggleCounter(closedCounter.id, 'closed');
    }
  };

  // Prioritize a ticket (bump to front of queue)
  const prioritizeTicket = async (ticketId: string) => {
    try {
      await queueApi.bumpTicketPriority(ticketId);
      await fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to prioritize ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!branch?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-600 mb-4">{t('manager.noBranchAssigned')}</p>
        <p className="text-sm text-gray-500">{t('manager.useBranchSelector')}</p>
      </div>
    );
  }

  const openCounters = branchStatus?.counters.filter((c) => c.status === 'open').length || 0;
  const totalCounters = branchStatus?.counters.length || 0;

  return (
    <div className="bg-gray-50">
      {/* ======================= */}
      {/* HERO STATUS PANEL */}
      {/* ======================= */}
      <HeroStatusPanel
        waitingCount={stats?.tickets.waiting || 0}
        avgWaitMins={stats?.times.avgWaitMins || 0}
        openCounters={openCounters}
        totalCounters={totalCounters}
        slaData={slaData}
        onOpenCounter={openCounters < totalCounters ? openFirstClosedCounter : undefined}
        alerts={enhancedAlerts}
        branchId={branch?.id || ''}
        onPrioritizeTicket={prioritizeTicket}
        onEndBreak={endBreak}
        onExtendBreak={extendBreak}
        lastUpdated={lastUpdated}
      />

      {/* ======================= */}
      {/* COLLAPSIBLE TEAM PERFORMANCE BANNER */}
      {/* ======================= */}
      <CollapsibleSection
        summaryItems={[
          {
            icon: 'group',
            label: 'Equipe',
            value: rankedTellers.length > 0
              ? `${rankedTellers[0]?.userName} ${rankedTellers[0]?.totalServed}★`
              : 'Aucune activité',
          },
          {
            icon: 'check_circle',
            label: 'Objectif',
            value: slaData
              ? `${slaData.dailyTarget.served}/${slaData.dailyTarget.target} (${slaData.dailyTarget.progress}%)`
              : '-',
          },
          {
            icon: 'emoji_events',
            label: 'Classement',
            value: ranking?.yourRank
              ? `#${ranking.yourRank}/${ranking.totalBranches}${ranking.gapToLeader > 0 ? ` (-${ranking.gapToLeader})` : ''}`
              : '-',
            highlight: ranking?.yourRank === 1,
          },
        ]}
      >
        <SecondaryGrid>
          {/* Team Performance */}
          <TeamPerformanceCard
            agents={rankedTellers.map((a, i) => ({
              name: a.userName,
              served: a.totalServed,
              avgMins: a.avgServiceMins,
              isTop: i === 0 && a.totalServed > 0,
              isSlow: a.avgServiceMins > ALERT_THRESHOLDS.SLOW_TELLER_MINS,
            }))}
            teamAvgServed={teamAvgServed}
            teamAvgMins={teamAvgServiceMins}
          />

          {/* Daily Target */}
          <DailyTargetCard
            served={slaData?.dailyTarget.served || stats?.tickets.completed || 0}
            target={slaData?.dailyTarget.target || 100}
            progress={slaData?.dailyTarget.progress || 0}
          />

          {/* Branch Ranking */}
          <BranchRankingCard
            rank={ranking?.yourRank || null}
            totalBranches={ranking?.totalBranches || 0}
            gapToLeader={ranking?.gapToLeader || 0}
            isLeader={ranking?.yourRank === 1}
          />
        </SecondaryGrid>
      </CollapsibleSection>

      {/* ======================= */}
      {/* MAIN CONTENT: COUNTERS + QUEUE */}
      {/* ======================= */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* COUNTERS SECTION */}
          <div className="pt-6">
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#999' }}>
              Guichets
            </div>

            <div className="space-y-3">
              {branchStatus?.counters.map((counter) => {
                const breakInfo = activeBreaks[counter.id];
                const isOnBreak = (counter.status as string) === 'on_break' || !!breakInfo;
                const isOpen = counter.status === 'open' && !isOnBreak;
                const isClosed = !isOpen && !isOnBreak;
                const assignedTellerName = tellers.find((t) => t.id === counter.assignedUserId)?.name;

                // Get break remaining time for display
                const getBreakTimeRemaining = () => {
                  if (!breakInfo?.expectedEnd) return '';
                  const remaining = Math.max(0, Math.floor((new Date(breakInfo.expectedEnd).getTime() - Date.now()) / 60000));
                  return `(${remaining} min)`;
                };

                return (
                  <div
                    key={counter.id}
                    className="flex items-center gap-3 bg-white rounded-lg"
                    style={{
                      padding: '12px 16px',
                      borderLeft: `3px solid ${isOnBreak ? '#F59E0B' : isOpen ? '#10B981' : 'transparent'}`,
                    }}
                  >
                    {/* Status dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isOnBreak
                          ? '#F59E0B'
                          : isOpen
                          ? '#10B981'
                          : '#9CA3AF',
                      }}
                    />

                    {/* Counter info */}
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: '#1A1A1A' }}>
                        G{counter.number}
                        {assignedTellerName && (
                          <span className="font-normal" style={{ color: '#666' }}> {assignedTellerName}</span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: '#666' }}>
                        {isOnBreak ? (
                          <span style={{ color: '#B45309' }}>
                            Pause {getBreakTimeRemaining()}
                          </span>
                        ) : isClosed ? (
                          'Fermé'
                        ) : (
                          'En attente'
                        )}
                      </div>
                    </div>

                    {/* Current ticket (for open counters) */}
                    {isOpen && counter.currentTicket && (
                      <span className="font-semibold" style={{ color: '#10B981' }}>
                        {counter.currentTicket.ticketNumber}
                      </span>
                    )}

                    {/* Action button (only for closed) */}
                    {isClosed && (
                      <button
                        onClick={() => toggleCounter(counter.id, counter.status)}
                        disabled={updatingCounter === counter.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#666',
                        }}
                      >
                        {updatingCounter === counter.id ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span>
                        ) : (
                          'Ouvrir'
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUEUE SECTION */}
          <div className="lg:col-span-2 pt-6" style={{ borderLeft: '1px solid #E5E5E5', paddingLeft: '32px' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#999' }}>
              File d'attente - Prochains clients
            </div>

            <QueueList
              tickets={(branchStatus?.waitingTickets || []).map((t: any) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                serviceName: t.serviceName,
                createdAt: t.createdAt,
                priority: t.priority,
              }))}
              onTicketBumped={() => fetchBranchStatus(branch.id)}
              maxVisible={8}
            />
          </div>
        </div>
      </div>

      {/* Load Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />

      {/* Break Modal */}
      {selectedCounterForBreak && (
        <BreakModal
          isOpen={breakModalOpen}
          onClose={() => {
            setBreakModalOpen(false);
            setSelectedCounterForBreak(null);
          }}
          counter={selectedCounterForBreak}
          onBreakStarted={() => {
            fetchBranchStatus(branch!.id);
          }}
        />
      )}

      {/* Teller Management Modal */}
      <TellerManagementModal
        isOpen={tellerModalOpen}
        onClose={() => setTellerModalOpen(false)}
        branchId={branch.id}
        onTellerUpdated={() => {
          adminApi.listUsers(1, 50, branch.id, 'teller').then((res) => {
            setTellers(res.data.data || []);
          });
        }}
      />
    </div>
  );
}
