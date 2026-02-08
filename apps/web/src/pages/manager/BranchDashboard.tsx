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
import { QueueList } from '@/components/manager/QueueList';
import { buildEnhancedAlerts } from '@/components/manager/AlertPanel';
import { TargetEditModal } from '@/components/manager/TargetEditModal';
import { CounterConfigModal } from '@/components/manager/CounterConfigModal';
import {
  CollapsibleSection,
  SecondaryGrid,
  EnhancedTeamPerformanceCard,
  BranchObjectivesCard,
  TeamChampionCard,
} from '@/components/manager/CollapsibleSection';
import { HistoricalTrendsSection } from '@/components/manager/HistoricalTrendsSection';
import { AnnouncementModal } from '@/components/manager/AnnouncementModal';
import { TellerTimelineModal } from '@/components/manager/TellerTimelineModal';

// SG Brand Colors - V1 Monochrome Palette
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
  lightGray: '#F5F5F5',
  redBg: '#FEE2E2',
  amberBg: '#FEF3C7',
  greenBg: '#D1FAE5',
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
  avgRestMins: number;
  utilization: number;
  championScore: number;
}

interface TopService {
  serviceId: string;
  serviceName: string;
  prefix: string;
  count: number;
}

interface Teller {
  id: string;
  name: string;
  email: string;
  status: string;
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
  const [slaData, setSlaData] = useState<SlaData | null>(null);
  const [topServices, setTopServices] = useState<TopService[]>([]);
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

  // Target edit modal state
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<{
    servedTarget: number;
    avgWaitTarget: number;
    slaTarget: number;
    slaThreshold: number;
  } | null>(null);

  // Counter config modal state
  const [counterConfigModalOpen, setCounterConfigModalOpen] = useState(false);

  // Announcement modal state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  // Teller timeline modal state
  const [tellerTimelineOpen, setTellerTimelineOpen] = useState(false);
  const [selectedTeller, setSelectedTeller] = useState<{ id: string; name: string } | null>(null);

  // Active breaks state
  const [activeBreaks, setActiveBreaks] = useState<Record<string, {
    breakId: string;
    reason: string;
    expectedEnd: string;
    userName: string;
  }>>({});

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Queue status state
  const [queueStatus, setQueueStatus] = useState<'open' | 'paused' | 'closed'>('open');
  const [queuePausedAt, setQueuePausedAt] = useState<string | null>(null);
  const [autoQueueEnabled, setAutoQueueEnabled] = useState(false);

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

  // Team stats - enhanced with rest time and champion
  const activeTellers = agentStats.filter((a) => a.totalServed > 0);
  const teamAvgServiceMins =
    activeTellers.length > 0
      ? Math.round(activeTellers.reduce((sum, a) => sum + a.avgServiceMins, 0) / activeTellers.length)
      : 0;
  const teamAvgRestMins =
    activeTellers.length > 0
      ? Math.round(activeTellers.reduce((sum, a) => sum + a.avgRestMins, 0) / activeTellers.length)
      : 0;
  const teamTotalServed = agentStats.reduce((sum, a) => sum + a.totalServed, 0);

  // Champion ranking by champion score
  const rankedByChampionScore = [...agentStats].sort((a, b) => b.championScore - a.championScore);
  const champion = rankedByChampionScore.find((a) => a.totalServed > 0) || null;
  const runnerUp = rankedByChampionScore.filter((a) => a.totalServed > 0)[1] || null;

  useEffect(() => {
    if (!branch?.id) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, agentsRes, tellersRes, slaRes, branchRes, targetRes, topServicesRes] = await Promise.all([
          analyticsApi.getTodayStats(branch.id),
          analyticsApi.getAgentStats(
            branch.id,
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
          adminApi.listUsers(1, 50, branch.id, 'teller'),
          analyticsApi.getSlaMetrics(branch.id),
          adminApi.getBranch(branch.id),
          adminApi.getBranchTarget(branch.id),
          analyticsApi.getTopServices(branch.id),
        ]);

        setStats(statsRes.data.data);
        setAgentStats(agentsRes.data.data || []);
        setTellers(tellersRes.data.data || []);
        setSlaData(slaRes.data.data);
        setDailyTarget(targetRes.data.data);
        setTopServices(topServicesRes.data.data || []);
        setLastUpdated(new Date());

        // Update queue status from branch data
        const branchData = branchRes.data.data;
        if (branchData) {
          setQueueStatus(branchData.queueStatus || 'open');
          setQueuePausedAt(branchData.queuePausedAt || null);
          setAutoQueueEnabled(branchData.autoQueueEnabled || false);
        }
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
    const refreshQueue = () => fetchBranchStatus(branch.id);

    const onTicketCreated = (data: any) => {
      if (data.queueStatus) handleQueueUpdated(data.queueStatus);
      refreshQueue();
      refreshStats();
    };

    const onTicketCalled = (data: any) => {
      handleTicketCalled(data);
      refreshQueue();
      refreshStats();
    };

    const onTicketCompleted = (data: any) => {
      handleTicketCompleted(data);
      refreshQueue();
      refreshStats();
    };

    const onTicketNoShow = (data: any) => {
      if (data.queueStatus) handleQueueUpdated(data.queueStatus);
      refreshQueue();
      refreshStats();
    };

    const onQueueUpdated = (data: any) => {
      if (data) handleQueueUpdated(data);
      refreshQueue();
      refreshStats();
    };

    const onCounterUpdated = () => {
      refreshQueue();
      refreshStats();
    };

    socket.on(SOCKET_EVENTS.TICKET_CREATED, onTicketCreated);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, onTicketCompleted);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, onTicketCalled);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, onTicketNoShow);
    socket.on(SOCKET_EVENTS.TICKET_SERVING, onQueueUpdated);
    socket.on(SOCKET_EVENTS.TICKET_TRANSFERRED, onQueueUpdated);
    socket.on(SOCKET_EVENTS.TICKET_PRIORITIZED, onQueueUpdated);
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

    socket.on(SOCKET_EVENTS.QUEUE_PAUSED, (data: any) => {
      setQueueStatus('paused');
      setQueuePausedAt(data.pausedAt);
      setToast({ message: 'File d\'attente mise en pause', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    });

    socket.on(SOCKET_EVENTS.QUEUE_RESUMED, () => {
      setQueueStatus('open');
      setQueuePausedAt(null);
      setToast({ message: 'File d\'attente reprise', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    });

    socket.on(SOCKET_EVENTS.QUEUE_RESET, (data: any) => {
      refreshQueue();
      refreshStats();
      setToast({ message: `File reinitialisee (${data.cancelledCount || 0} tickets annules)`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    });

    socket.on(SOCKET_EVENTS.QUEUE_AUTO_CLOSED, (data: any) => {
      setQueueStatus('closed');
      refreshQueue();
      refreshStats();
      const msg = `Agence fermee automatiquement (${data.autoCompletedCount || 0} completes, ${data.autoCancelledCount || 0} annules)`;
      setToast({ message: msg, type: 'success' });
      setTimeout(() => setToast(null), 5000);
    });

    socket.on(SOCKET_EVENTS.QUEUE_AUTO_OPENED, () => {
      setQueueStatus('open');
      refreshQueue();
      refreshStats();
      setToast({ message: 'Agence ouverte automatiquement', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    });

    const interval = setInterval(fetchData, 30000);

    return () => {
      socket.off(SOCKET_EVENTS.TICKET_CREATED, onTicketCreated);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, onTicketCompleted);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, onTicketCalled);
      socket.off(SOCKET_EVENTS.TICKET_NO_SHOW, onTicketNoShow);
      socket.off(SOCKET_EVENTS.TICKET_SERVING, onQueueUpdated);
      socket.off(SOCKET_EVENTS.TICKET_TRANSFERRED, onQueueUpdated);
      socket.off(SOCKET_EVENTS.TICKET_PRIORITIZED, onQueueUpdated);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, onQueueUpdated);
      socket.off(SOCKET_EVENTS.COUNTER_UPDATED, onCounterUpdated);
      socket.off('break:started');
      socket.off('break:ended');
      socket.off('break:extended');
      socket.off(SOCKET_EVENTS.QUEUE_PAUSED);
      socket.off(SOCKET_EVENTS.QUEUE_RESUMED);
      socket.off(SOCKET_EVENTS.QUEUE_RESET);
      socket.off(SOCKET_EVENTS.QUEUE_AUTO_CLOSED);
      socket.off(SOCKET_EVENTS.QUEUE_AUTO_OPENED);
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

  // Prioritize a ticket (bump to front of queue)
  const prioritizeTicket = async (ticketId: string) => {
    try {
      await queueApi.bumpTicketPriority(ticketId);
      await fetchBranchStatus(branch!.id);
      setToast({ message: 'Client priorise avec succes', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Failed to prioritize ticket:', error);
      setToast({ message: 'Erreur lors de la priorisation', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Quick action handlers
  const handleOpenAllCounters = async () => {
    try {
      await adminApi.openAllCounters(branch!.id);
      await fetchBranchStatus(branch!.id);
      setToast({ message: 'Tous les guichets ouverts', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Failed to open all counters:', error);
      setToast({ message: 'Erreur', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePauseQueue = async () => {
    try {
      await queueApi.pauseQueue(branch!.id);
    } catch (error) {
      console.error('Failed to pause queue:', error);
      setToast({ message: 'Erreur lors de la pause', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleResumeQueue = async () => {
    try {
      await queueApi.resumeQueue(branch!.id);
    } catch (error) {
      console.error('Failed to resume queue:', error);
      setToast({ message: 'Erreur lors de la reprise', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const [resetConfirm, setResetConfirm] = useState(false);
  const handleResetQueue = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    setResetConfirm(false);
    try {
      await queueApi.resetQueue(branch!.id);
    } catch (error) {
      console.error('Failed to reset queue:', error);
      setToast({ message: 'Erreur lors de la reinitialisation', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const [closeConfirm, setCloseConfirm] = useState(false);
  const handleCloseQueue = async () => {
    if (!closeConfirm) {
      setCloseConfirm(true);
      setTimeout(() => setCloseConfirm(false), 3000);
      return;
    }
    setCloseConfirm(false);
    try {
      const response = await queueApi.closeQueue(branch!.id);
      const data = response.data.data;
      setQueueStatus('closed');
      setToast({
        message: `Agence fermee (${data.autoCompletedCount} completes, ${data.autoCancelledCount} annules)`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 5000);
      fetchBranchStatus(branch!.id);
    } catch (error) {
      console.error('Failed to close queue:', error);
      setToast({ message: 'Erreur lors de la fermeture', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Get pause duration
  const getPauseDuration = () => {
    if (!queuePausedAt) return '';
    const mins = Math.floor((Date.now() - new Date(queuePausedAt).getTime()) / 60000);
    return mins > 0 ? ` (${mins} min)` : '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: SG_COLORS.red }} />
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

  const openCounters = branchStatus?.counters?.filter((c) => c.status === 'open').length || 0;
  const closedCounters = branchStatus?.counters?.filter((c) => c.status === 'closed').length || 0;
  const onBreakCounters = branchStatus?.counters?.filter((c) => c.status === 'on_break' || activeBreaks[c.id]).length || 0;
  const totalCounters = branchStatus?.counters?.length || 0;
  const waitingCount = stats?.tickets.waiting || 0;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* ============================================== */}
      {/* COMPACT METRICS BAR - Replaces Hero Panel */}
      {/* ============================================== */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Key Metrics */}
          <div className="flex items-center gap-8">
            {/* Waiting Count - Primary */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: waitingCount > 10 ? SG_COLORS.redBg : 'rgba(233, 4, 30, 0.08)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.red }}>
                  groups
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>{waitingCount}</div>
                <div className="text-xs uppercase tracking-wide" style={{ color: SG_COLORS.gray }}>En attente</div>
              </div>
            </div>

            {/* Avg Wait Time */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: SG_COLORS.greenBg }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.green }}>
                  schedule
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>~{Math.round(stats?.times.avgWaitMins || 0)}</div>
                <div className="text-xs uppercase tracking-wide" style={{ color: SG_COLORS.gray }}>Min attente</div>
              </div>
            </div>

            {/* SLA */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: SG_COLORS.greenBg }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.green }}>
                  verified
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: SG_COLORS.green }}>{slaData?.sla.percentage || 100}%</div>
                <div className="text-xs uppercase tracking-wide" style={{ color: SG_COLORS.gray }}>SLA</div>
              </div>
            </div>

            {/* Counters */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(26, 26, 26, 0.05)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.black }}>
                  storefront
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>{openCounters}/{totalCounters}</div>
                <div className="text-xs uppercase tracking-wide" style={{ color: SG_COLORS.gray }}>Guichets</div>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions + Objective */}
          <div className="flex items-center gap-4">
            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2">
              {/* VIP / Priority Bump - Opens modal to select ticket */}
              <button
                onClick={() => {
                  // Find first long-waiting ticket and prioritize, or show all waiting for selection
                  const longWaitTicket = (branchStatus?.waitingTickets || []).find((t: any) => {
                    const waitMins = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
                    return waitMins >= 15;
                  });
                  if (longWaitTicket) {
                    prioritizeTicket(longWaitTicket.id);
                  } else if (branchStatus?.waitingTickets?.length > 0) {
                    // Show toast that no urgent tickets
                    setToast({ message: 'Aucun client en attente prolongee', type: 'success' });
                    setTimeout(() => setToast(null), 2000);
                  }
                }}
                disabled={!branchStatus?.waitingTickets?.length}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: SG_COLORS.red, color: 'white' }}
                title="Prioriser un client VIP"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>priority_high</span>
                VIP
              </button>

              {/* Breaks Quick View - scrolls to counters or shows info */}
              <button
                onClick={() => {
                  if (onBreakCounters > 0) {
                    // Scroll to counters section where breaks are shown
                    document.getElementById('counters-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setToast({ message: 'Aucun guichet en pause', type: 'success' });
                    setTimeout(() => setToast(null), 2000);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: onBreakCounters > 0 ? SG_COLORS.amberBg : '#F3F4F6',
                  color: onBreakCounters > 0 ? '#B45309' : SG_COLORS.gray,
                  border: onBreakCounters > 0 ? `1px solid ${SG_COLORS.amber}` : '1px solid #E5E7EB',
                }}
                title="Voir les guichets en pause"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>coffee</span>
                {onBreakCounters > 0 ? `${onBreakCounters} pause${onBreakCounters > 1 ? 's' : ''}` : 'Pauses'}
              </button>

              {/* Counter Quick Open */}
              <button
                onClick={() => setCounterConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: closedCounters > 0 ? 'rgba(26, 26, 26, 0.08)' : '#F3F4F6',
                  color: SG_COLORS.black,
                  border: '1px solid #E5E7EB',
                }}
                title="Configurer les guichets"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>storefront</span>
                {openCounters}/{totalCounters}
              </button>

              {/* Pause/Resume Toggle */}
              {queueStatus === 'paused' ? (
                <button
                  onClick={handleResumeQueue}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ background: SG_COLORS.green, color: 'white' }}
                  title="Reprendre la file"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
                  Reprendre
                </button>
              ) : queueStatus === 'closed' ? (
                <button
                  onClick={handleResumeQueue}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ background: SG_COLORS.green, color: 'white' }}
                  title="Ouvrir l'agence"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>door_open</span>
                  Ouvrir
                </button>
              ) : (
                <button
                  onClick={handlePauseQueue}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ background: '#F3F4F6', color: SG_COLORS.amber, border: `1px solid ${SG_COLORS.amber}` }}
                  title="Mettre la file en pause"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pause</span>
                  Pause
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200" />

            {/* Objective */}
            <div className="text-right">
              <div className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
                {slaData?.dailyTarget.served || 0}/{dailyTarget?.servedTarget || slaData?.dailyTarget.target || 100}
              </div>
              <div className="text-xs" style={{ color: SG_COLORS.gray }}>Objectif du jour</div>
            </div>
            {lastUpdated && (
              <div className="text-xs" style={{ color: SG_COLORS.gray }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>schedule</span>
                {' '}{lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* CONTEXTUAL ESCALATIONS - Long-wait customers with quick actions */}
      {/* ============================================== */}
      {(() => {
        const longWaitTickets = (branchStatus?.waitingTickets || [])
          .map((t: any) => ({
            ...t,
            waitMins: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000),
          }))
          .filter((t: any) => t.waitMins >= 15)
          .sort((a: any, b: any) => b.waitMins - a.waitMins)
          .slice(0, 3);

        const breakAlerts = Object.entries(activeBreaks)
          .map(([counterId, breakInfo]) => {
            const counter = branchStatus?.counters?.find((c) => c.id === counterId);
            const breakMins = breakInfo.expectedEnd
              ? Math.max(0, -Math.floor((new Date(breakInfo.expectedEnd).getTime() - Date.now()) / 60000))
              : 0;
            return {
              counterId,
              counterNumber: counter?.number || 0,
              userName: breakInfo.userName,
              breakId: breakInfo.breakId,
              isOvertime: breakMins > 0,
              overtimeMins: breakMins,
            };
          })
          .filter((b) => b.isOvertime);

        if (longWaitTickets.length === 0 && breakAlerts.length === 0) return null;

        return (
          <div className="bg-white border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: SG_COLORS.red }}>
                  notification_important
                </span>
                <span className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                  Actions requises
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: SG_COLORS.redBg, color: SG_COLORS.red }}
                >
                  {longWaitTickets.length + breakAlerts.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Long-wait tickets */}
                {longWaitTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{
                      background: ticket.waitMins >= 20 ? SG_COLORS.redBg : SG_COLORS.amberBg,
                      border: `1px solid ${ticket.waitMins >= 20 ? SG_COLORS.red : SG_COLORS.amber}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px', color: ticket.waitMins >= 20 ? SG_COLORS.red : SG_COLORS.amber }}
                      >
                        schedule
                      </span>
                      <div>
                        <span className="font-semibold text-sm" style={{ color: SG_COLORS.black }}>
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-xs ml-2" style={{ color: SG_COLORS.gray }}>
                          {ticket.waitMins} min
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => prioritizeTicket(ticket.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                      style={{ background: SG_COLORS.red, color: 'white' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>priority_high</span>
                      Prioriser
                    </button>
                  </div>
                ))}

                {/* Overtime breaks */}
                {breakAlerts.map((breakAlert) => (
                  <div
                    key={breakAlert.counterId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: SG_COLORS.amberBg, border: `1px solid ${SG_COLORS.amber}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: SG_COLORS.amber }}>
                        coffee
                      </span>
                      <div>
                        <span className="font-semibold text-sm" style={{ color: SG_COLORS.black }}>
                          G{breakAlert.counterNumber}
                        </span>
                        <span className="text-xs ml-2" style={{ color: '#B45309' }}>
                          +{breakAlert.overtimeMins} min
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => endBreak(breakAlert.breakId, breakAlert.counterId)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                      style={{ background: SG_COLORS.amber, color: 'white' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>alarm_off</span>
                      Fin pause
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================== */}
      {/* ALERT BANNER - General alerts (if no specific escalations) */}
      {/* ============================================== */}
      {enhancedAlerts.length > 0 && (
        <div
          className="flex items-center gap-4 px-6 py-3"
          style={{
            background: enhancedAlerts.some(a => a.severity === 'critical') ? SG_COLORS.redBg : SG_COLORS.amberBg,
            borderLeft: `4px solid ${enhancedAlerts.some(a => a.severity === 'critical') ? SG_COLORS.red : SG_COLORS.amber}`,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px', color: enhancedAlerts.some(a => a.severity === 'critical') ? SG_COLORS.red : SG_COLORS.amber }}
          >
            warning
          </span>
          <span className="flex-1 text-sm font-medium" style={{ color: enhancedAlerts.some(a => a.severity === 'critical') ? '#991B1B' : '#92400E' }}>
            {enhancedAlerts.length} alerte{enhancedAlerts.length > 1 ? 's' : ''}:
            {' '}{enhancedAlerts.slice(0, 2).map(a => a.title).join(' | ')}
            {enhancedAlerts.length > 2 && ` (+${enhancedAlerts.length - 2})`}
          </span>
        </div>
      )}

      {/* ============================================== */}
      {/* MAIN CONTENT: Queue (Primary) + Sidebar */}
      {/* ============================================== */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* ====== LEFT: QUEUE LIST (PRIMARY FOCUS) ====== */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
                File d'attente
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: SG_COLORS.red, color: 'white' }}
              >
                {waitingCount}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-xs" style={{ color: '#999' }}>
                Mis a jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Queue Closed Banner */}
          {queueStatus === 'closed' && (
            <div
              className="flex items-center justify-between p-3 rounded-lg mb-4"
              style={{ background: SG_COLORS.redBg, borderLeft: `3px solid ${SG_COLORS.red}` }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: SG_COLORS.red, fontSize: '20px' }}>door_front</span>
                <div>
                  <p className="font-medium text-sm" style={{ color: SG_COLORS.red }}>
                    Agence fermee
                  </p>
                  <p className="text-xs text-gray-500">
                    {autoQueueEnabled ? 'La file s\'ouvrira automatiquement demain' : 'File fermee manuellement'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleResumeQueue}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ backgroundColor: SG_COLORS.green, color: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
                Ouvrir
              </button>
            </div>
          )}

          {/* Queue Paused Banner */}
          {queueStatus === 'paused' && (
            <div
              className="flex items-center justify-between p-3 rounded-lg mb-4"
              style={{ background: SG_COLORS.amberBg, borderLeft: `3px solid ${SG_COLORS.amber}` }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: SG_COLORS.amber, fontSize: '20px' }}>pause_circle</span>
                <div>
                  <p className="font-medium text-sm" style={{ color: SG_COLORS.amber }}>
                    File d'attente en pause{getPauseDuration()}
                  </p>
                  <p className="text-xs text-gray-500">Les clients ne peuvent pas prendre de ticket</p>
                </div>
              </div>
              <button
                onClick={handleResumeQueue}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ backgroundColor: SG_COLORS.green, color: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
                Reprendre
              </button>
            </div>
          )}

          {/* Queue List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <QueueList
              tickets={(branchStatus?.waitingTickets || []).map((t: any) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                serviceName: t.serviceName,
                createdAt: t.createdAt,
                priority: t.priority,
              }))}
              onTicketBumped={() => fetchBranchStatus(branch.id)}
              maxVisible={12}
            />
          </div>
        </div>

        {/* ====== RIGHT: SIDEBAR (Counters + Actions) ====== */}
        <div className="w-80 border-l border-gray-200 bg-white p-5">
          {/* Counters Section */}
          <div id="counters-section" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
                Guichets
              </h3>
              <button
                onClick={() => setCounterConfigModalOpen(true)}
                className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                style={{ color: SG_COLORS.gray }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span>
                Configurer
              </button>
            </div>
            <div className="space-y-2">
              {branchStatus?.counters?.map((counter) => {
                const breakInfo = activeBreaks[counter.id];
                const isOnBreak = (counter.status as string) === 'on_break' || !!breakInfo;
                const isOpen = counter.status === 'open' && !isOnBreak;
                const isClosed = !isOpen && !isOnBreak;
                const assignedTellerName = tellers.find((t) => t.id === counter.assignedUserId)?.name;

                const getBreakTimeRemaining = () => {
                  if (!breakInfo?.expectedEnd) return '';
                  const remaining = Math.max(0, Math.floor((new Date(breakInfo.expectedEnd).getTime() - Date.now()) / 60000));
                  return `(${remaining} min)`;
                };

                return (
                  <div
                    key={counter.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: '#FAFAFA',
                      borderLeft: `3px solid ${isOnBreak ? SG_COLORS.amber : isOpen ? SG_COLORS.green : 'transparent'}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isOnBreak ? SG_COLORS.amber : isOpen ? SG_COLORS.green : '#9CA3AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: SG_COLORS.black }}>
                        G{counter.number}
                        {assignedTellerName && (
                          <span className="font-normal" style={{ color: SG_COLORS.gray }}> {assignedTellerName}</span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: SG_COLORS.gray }}>
                        {isOnBreak ? (
                          <span style={{ color: '#B45309' }}>Pause {getBreakTimeRemaining()}</span>
                        ) : isClosed ? 'Ferme' : 'En attente'}
                      </div>
                    </div>
                    {isOpen && counter.currentTicket && (
                      <span className="font-semibold text-sm" style={{ color: SG_COLORS.green }}>
                        {counter.currentTicket.ticketNumber}
                      </span>
                    )}
                    {isOpen && (
                      <button
                        onClick={() => toggleCounter(counter.id, counter.status)}
                        disabled={updatingCounter === counter.id}
                        className="px-2 py-1 text-xs font-medium rounded transition-colors"
                        style={{ background: '#FEE2E2', color: SG_COLORS.red }}
                      >
                        {updatingCounter === counter.id ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px' }}>progress_activity</span>
                        ) : 'Fermer'}
                      </button>
                    )}
                    {isClosed && (
                      <button
                        onClick={() => toggleCounter(counter.id, counter.status)}
                        disabled={updatingCounter === counter.id}
                        className="px-2 py-1 text-xs font-medium rounded transition-colors"
                        style={{ background: '#E5E7EB', color: SG_COLORS.gray }}
                      >
                        {updatingCounter === counter.id ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px' }}>progress_activity</span>
                        ) : 'Ouvrir'}
                      </button>
                    )}
                    {isOnBreak && breakInfo && (
                      <button
                        onClick={() => endBreak(breakInfo.breakId, counter.id)}
                        disabled={updatingCounter === counter.id}
                        className="px-2 py-1 text-xs font-medium rounded transition-colors"
                        style={{ background: SG_COLORS.amberBg, color: '#B45309' }}
                      >
                        Fin pause
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Section - Simplified */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#999' }}>
              Autres actions
            </h3>
            <div className="space-y-2">
              {/* Announcement - Primary action */}
              <button
                onClick={() => setAnnouncementModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: SG_COLORS.red, color: SG_COLORS.red, background: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
                Envoyer une annonce
              </button>

              {/* End of Day / Close Queue */}
              {queueStatus === 'open' && (
                <button
                  onClick={handleCloseQueue}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                  style={{
                    background: closeConfirm ? SG_COLORS.red : 'white',
                    color: closeConfirm ? 'white' : SG_COLORS.black,
                    borderColor: closeConfirm ? SG_COLORS.red : '#E5E7EB',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {closeConfirm ? 'warning' : 'logout'}
                  </span>
                  {closeConfirm ? 'Confirmer fermeture?' : 'Fin de journee'}
                </button>
              )}

              {/* Divider */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-center mb-2" style={{ color: '#999' }}>Actions avancees</p>
                <div className="flex gap-2">
                  {/* Open All - Useful for morning */}
                  <button
                    onClick={handleOpenAllCounters}
                    disabled={closedCounters === 0}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs font-medium transition-colors disabled:opacity-40"
                    style={{ background: '#F3F4F6', color: SG_COLORS.black }}
                    title="Ouvrir tous les guichets"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>door_open</span>
                    Ouvrir tous
                  </button>

                  {/* Reset - Rarely used, subtle */}
                  <button
                    onClick={handleResetQueue}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs font-medium transition-colors"
                    style={{
                      background: resetConfirm ? SG_COLORS.red : '#F3F4F6',
                      color: resetConfirm ? 'white' : SG_COLORS.gray,
                    }}
                    title="Reinitialiser la file (annule tous les tickets)"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {resetConfirm ? 'warning' : 'restart_alt'}
                    </span>
                    {resetConfirm ? 'Confirmer?' : 'Reset'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* SECONDARY SECTIONS (Collapsed by default) */}
      {/* ============================================== */}
      <div className="border-t border-gray-200">
        {/* Team Performance & Stats - Enhanced */}
        <CollapsibleSection
          summaryItems={[
            {
              icon: 'emoji_events',
              label: 'Champion',
              value: champion ? `${champion.userName} (${champion.totalServed})` : 'En attente',
              highlight: !!champion,
            },
            {
              icon: 'check_circle',
              label: 'Objectif',
              value: slaData
                ? `${slaData.dailyTarget.served}/${slaData.dailyTarget.target} (${slaData.dailyTarget.progress}%)`
                : '-',
            },
            {
              icon: 'group',
              label: 'Equipe',
              value: `${activeTellers.length} agent${activeTellers.length !== 1 ? 's' : ''} actif${activeTellers.length !== 1 ? 's' : ''}`,
            },
          ]}
          defaultExpanded={false}
        >
          <SecondaryGrid>
            <EnhancedTeamPerformanceCard
              totalServed={teamTotalServed}
              avgServiceMins={teamAvgServiceMins}
              avgRestMins={teamAvgRestMins}
              agents={rankedByChampionScore.map((a) => ({
                id: a.userId,
                name: a.userName,
                served: a.totalServed,
                avgMins: a.avgServiceMins,
                avgRestMins: a.avgRestMins,
                utilization: a.utilization,
                championScore: a.championScore,
              }))}
              onTellerClick={(tellerId, tellerName) => {
                setSelectedTeller({ id: tellerId, name: tellerName });
                setTellerTimelineOpen(true);
              }}
            />
            <BranchObjectivesCard
              served={slaData?.dailyTarget.served || stats?.tickets.completed || 0}
              target={dailyTarget?.servedTarget || slaData?.dailyTarget.target || 100}
              avgWaitMins={stats?.times.avgWaitMins || 0}
              waitTarget={dailyTarget?.avgWaitTarget || 10}
              topServices={topServices}
              onEditTarget={() => setTargetModalOpen(true)}
            />
            <TeamChampionCard
              champion={champion ? {
                id: champion.userId,
                name: champion.userName,
                served: champion.totalServed,
                avgMins: champion.avgServiceMins,
                avgRestMins: champion.avgRestMins,
                utilization: champion.utilization,
                championScore: champion.championScore,
              } : null}
              runnerUp={runnerUp ? {
                id: runnerUp.userId,
                name: runnerUp.userName,
                served: runnerUp.totalServed,
                avgMins: runnerUp.avgServiceMins,
                avgRestMins: runnerUp.avgRestMins,
                utilization: runnerUp.utilization,
                championScore: runnerUp.championScore,
              } : null}
              onViewTimeline={(tellerId, tellerName) => {
                setSelectedTeller({ id: tellerId, name: tellerName });
                setTellerTimelineOpen(true);
              }}
            />
          </SecondaryGrid>
        </CollapsibleSection>

        {/* Historical Trends */}
        <CollapsibleSection
          summaryItems={[
            {
              icon: 'trending_up',
              label: 'Tendances',
              value: 'Historique',
            },
          ]}
          defaultExpanded={false}
        >
          <HistoricalTrendsSection branchId={branch.id} />
        </CollapsibleSection>
      </div>

      {/* Load Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />

      {/* ============================================== */}
      {/* MODALS */}
      {/* ============================================== */}
      {selectedCounterForBreak && (
        <BreakModal
          isOpen={breakModalOpen}
          onClose={() => {
            setBreakModalOpen(false);
            setSelectedCounterForBreak(null);
          }}
          counter={selectedCounterForBreak}
          onBreakStarted={() => fetchBranchStatus(branch!.id)}
        />
      )}

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

      <TargetEditModal
        branchId={branch.id}
        isOpen={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        onSaved={() => {
          adminApi.getBranchTarget(branch.id).then((res) => {
            setDailyTarget(res.data.data);
          });
          setToast({ message: 'Objectifs mis a jour', type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }}
        currentTarget={dailyTarget || undefined}
      />

      <AnnouncementModal
        branchId={branch.id}
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        onSent={() => {
          setToast({ message: 'Annonce envoyee', type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }}
      />

      <CounterConfigModal
        branchId={branch.id}
        isOpen={counterConfigModalOpen}
        onClose={() => setCounterConfigModalOpen(false)}
        onSaved={() => {
          // Refresh stats to get updated counter count
          analyticsApi.getTodayStats(branch.id).then((res) => {
            setStats(res.data.data);
          });
          setToast({ message: 'Guichets configures', type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }}
        currentCount={stats?.counters?.total || 0}
        openCounters={branchStatus?.counters?.filter((c) => c.status !== 'closed').length || 0}
      />

      {selectedTeller && (
        <TellerTimelineModal
          branchId={branch.id}
          tellerId={selectedTeller.id}
          tellerName={selectedTeller.name}
          isOpen={tellerTimelineOpen}
          onClose={() => {
            setTellerTimelineOpen(false);
            setSelectedTeller(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
          style={{
            backgroundColor: toast.type === 'success' ? SG_COLORS.green : '#EF4444',
            color: 'white',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
