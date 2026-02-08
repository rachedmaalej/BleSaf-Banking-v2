import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { useAiStore } from '@/stores/aiStore';
import { analyticsApi, adminApi, breaksApi, queueApi } from '@/lib/api';
import {
  getSocket,
  connectSocket,
  joinBranchRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';
import { BreakModal } from '@/components/manager/BreakModal';
import { TellerManagementModal } from '@/components/manager/TellerManagementModal';
import { buildEnhancedAlerts } from '@/components/manager/AlertPanel';
import { TargetEditModal } from '@/components/manager/TargetEditModal';
import { CounterConfigModal } from '@/components/manager/CounterConfigModal';
import { AnnouncementModal } from '@/components/manager/AnnouncementModal';
import { TellerTimelineModal } from '@/components/manager/TellerTimelineModal';

// New V2 components
import { KpiTooltip } from '@/components/manager/KpiTooltip';

// SG Brand Colors
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

const ALERT_THRESHOLDS = {
  QUEUE_WARNING: 10,
  QUEUE_CRITICAL: 20,
  SLOW_TELLER_MINS: 15,
  LONG_WAIT_MINS: 20,
};

interface TodayStats {
  tickets: { total: number; waiting: number; completed: number; noShows: number };
  times: { avgWaitMins: number; avgServiceMins: number };
  counters: { total: number; open: number };
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

interface SlaData {
  sla: { percentage: number; status: string };
  dailyTarget: { target: number; served: number; progress: number };
}

export default function BranchDashboardV2() {
  const { t } = useTranslation();
  const { branch } = useAuthStore();
  const {
    branchStatus,
    fetchBranchStatus,
    handleTicketCalled,
    handleTicketCompleted,
    handleQueueUpdated,
  } = useQueueStore();

  // AI store
  const {
    compositeMetrics,
    forecast,
    recommendations,
    isExecuting,
    fetchAll: fetchAiData,
    executeRecommendation,
  } = useAiStore();

  // V1 state (ported)
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [tellers, setTellers] = useState<{ id: string; name: string; email: string; status: string }[]>([]);
  const [slaData, setSlaData] = useState<SlaData | null>(null);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingCounter, setUpdatingCounter] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modal state
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedCounterForBreak, setSelectedCounterForBreak] = useState<{
    id: string; number: number; assignedUserName?: string;
  } | null>(null);
  const [tellerModalOpen, setTellerModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<{
    servedTarget: number; avgWaitTarget: number; slaTarget: number; slaThreshold: number;
  } | null>(null);
  const [counterConfigModalOpen, setCounterConfigModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [tellerTimelineOpen, setTellerTimelineOpen] = useState(false);
  const [selectedTeller, setSelectedTeller] = useState<{ id: string; name: string } | null>(null);

  // Break state
  const [activeBreaks, setActiveBreaks] = useState<Record<string, {
    breakId: string; reason: string; expectedEnd: string; userName: string;
  }>>({});

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Queue status
  const [queueStatus, setQueueStatus] = useState<'open' | 'paused' | 'closed'>('open');
  const [queuePausedAt, setQueuePausedAt] = useState<string | null>(null);
  const [autoQueueEnabled, setAutoQueueEnabled] = useState(false);

  // Confirmation states
  const [resetConfirm, setResetConfirm] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);

  // Build enhanced alerts
  const enhancedAlerts = buildEnhancedAlerts(
    (branchStatus?.waitingTickets || []).map((t: any) => ({
      id: t.id, ticketNumber: t.ticketNumber, serviceName: t.serviceName, createdAt: t.createdAt,
    })),
    agentStats,
    stats ? { waiting: stats.tickets.waiting } : null,
    activeBreaks,
    branchStatus?.counters || [],
    ALERT_THRESHOLDS
  );


  // ===== DATA FETCHING + SOCKET SETUP (ported from V1) =====
  const fetchData = useCallback(async () => {
    if (!branch?.id) return;
    try {
      const [statsRes, agentsRes, tellersRes, slaRes, branchRes, targetRes, topServicesRes] = await Promise.all([
        analyticsApi.getTodayStats(branch.id),
        analyticsApi.getAgentStats(branch.id, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
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
    breaksApi.getBranchBreaks(branch.id).then((breaksRes) => {
      const breaksData = breaksRes.data.data;
      if (breaksData?.activeBreaks) {
        const breaksMap: Record<string, any> = {};
        breaksData.activeBreaks.forEach((b: any) => {
          breaksMap[b.counterId] = {
            breakId: b.breakId, reason: b.reason, expectedEnd: b.expectedEnd, userName: b.userName,
          };
        });
        setActiveBreaks(breaksMap);
      }
    }).catch(() => {});
  }, [branch?.id]);

  useEffect(() => {
    if (!branch?.id) { setIsLoading(false); return; }

    fetchData();
    fetchBranchStatus(branch.id);
    fetchAiData(branch.id);

    // Socket connection
    connectSocket();
    const socket = getSocket();
    joinBranchRoom(branch.id);

    const refreshStats = () => fetchData();
    const refreshQueue = () => fetchBranchStatus(branch.id);
    const refreshAi = () => fetchAiData(branch.id);

    const onTicketCreated = (data: any) => {
      if (data.queueStatus) handleQueueUpdated(data.queueStatus);
      refreshQueue(); refreshStats(); refreshAi();
    };
    const onTicketCalled = (data: any) => { handleTicketCalled(data); refreshQueue(); refreshStats(); };
    const onTicketCompleted = (data: any) => { handleTicketCompleted(data); refreshQueue(); refreshStats(); refreshAi(); };
    const onTicketNoShow = (data: any) => { if (data.queueStatus) handleQueueUpdated(data.queueStatus); refreshQueue(); refreshStats(); };
    const onQueueUpdated = (data: any) => { if (data) handleQueueUpdated(data); refreshQueue(); refreshStats(); };
    const onCounterUpdated = () => { refreshQueue(); refreshStats(); refreshAi(); };

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
      setActiveBreaks((prev) => ({ ...prev, [data.counterId]: { breakId: data.breakId, reason: data.reason, expectedEnd: data.expectedEnd, userName: data.userName } }));
      fetchBranchStatus(branch.id);
    });
    socket.on('break:ended', (data: any) => {
      setActiveBreaks((prev) => { const updated = { ...prev }; delete updated[data.counterId]; return updated; });
      fetchBranchStatus(branch.id);
    });
    socket.on('break:extended', (data: any) => {
      setActiveBreaks((prev) => ({ ...prev, [data.counterId]: { ...prev[data.counterId], expectedEnd: data.newExpectedEnd } }));
    });

    socket.on(SOCKET_EVENTS.QUEUE_PAUSED, (data: any) => {
      setQueueStatus('paused'); setQueuePausedAt(data.pausedAt);
      setToast({ message: 'File d\'attente mise en pause', type: 'success' }); setTimeout(() => setToast(null), 3000);
    });
    socket.on(SOCKET_EVENTS.QUEUE_RESUMED, () => {
      setQueueStatus('open'); setQueuePausedAt(null);
      setToast({ message: 'File d\'attente reprise', type: 'success' }); setTimeout(() => setToast(null), 3000);
    });
    socket.on(SOCKET_EVENTS.QUEUE_RESET, (data: any) => {
      refreshQueue(); refreshStats();
      setToast({ message: `File reinitialisee (${data.cancelledCount || 0} tickets annules)`, type: 'success' }); setTimeout(() => setToast(null), 3000);
    });
    socket.on(SOCKET_EVENTS.QUEUE_AUTO_CLOSED, (data: any) => {
      setQueueStatus('closed'); refreshQueue(); refreshStats();
      setToast({ message: `Agence fermee automatiquement (${data.autoCompletedCount || 0} completes, ${data.autoCancelledCount || 0} annules)`, type: 'success' }); setTimeout(() => setToast(null), 5000);
    });
    socket.on(SOCKET_EVENTS.QUEUE_AUTO_OPENED, () => {
      setQueueStatus('open'); refreshQueue(); refreshStats();
      setToast({ message: 'Agence ouverte automatiquement', type: 'success' }); setTimeout(() => setToast(null), 3000);
    });

    // Auto-refresh: stats every 30s, AI every 60s
    const statsInterval = setInterval(refreshStats, 30000);
    const aiInterval = setInterval(refreshAi, 60000);

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
      clearInterval(statsInterval);
      clearInterval(aiInterval);
    };
  }, [branch?.id, fetchBranchStatus, handleTicketCalled, handleTicketCompleted, handleQueueUpdated, fetchData, fetchAiData]);

  // ===== ACTIONS (ported from V1) =====
  const toggleCounter = async (counterId: string, currentStatus: string) => {
    setUpdatingCounter(counterId);
    try {
      await adminApi.updateCounter(counterId, { status: currentStatus === 'open' ? 'closed' : 'open' });
      await fetchBranchStatus(branch!.id);
    } catch { /* silent */ } finally { setUpdatingCounter(null); }
  };

  const endBreak = async (breakId: string, counterId: string) => {
    setUpdatingCounter(counterId);
    try {
      await breaksApi.endBreak(breakId);
      setActiveBreaks((prev) => { const updated = { ...prev }; delete updated[counterId]; return updated; });
      await fetchBranchStatus(branch!.id);
    } catch { /* silent */ } finally { setUpdatingCounter(null); }
  };

  const prioritizeTicket = async (ticketId: string) => {
    try {
      await queueApi.bumpTicketPriority(ticketId);
      await fetchBranchStatus(branch!.id);
      setToast({ message: 'Client priorise avec succes', type: 'success' }); setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Erreur lors de la priorisation', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handleOpenAllCounters = async () => {
    try {
      await adminApi.openAllCounters(branch!.id);
      await fetchBranchStatus(branch!.id);
      setToast({ message: 'Tous les guichets ouverts', type: 'success' }); setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: 'Erreur', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePauseQueue = async () => {
    try { await queueApi.pauseQueue(branch!.id); } catch {
      setToast({ message: 'Erreur lors de la pause', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handleResumeQueue = async () => {
    try { await queueApi.resumeQueue(branch!.id); } catch {
      setToast({ message: 'Erreur lors de la reprise', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handleResetQueue = async () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    setResetConfirm(false);
    try { await queueApi.resetQueue(branch!.id); } catch {
      setToast({ message: 'Erreur lors de la reinitialisation', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCloseQueue = async () => {
    if (!closeConfirm) { setCloseConfirm(true); setTimeout(() => setCloseConfirm(false), 3000); return; }
    setCloseConfirm(false);
    try {
      const response = await queueApi.closeQueue(branch!.id);
      const data = response.data.data;
      setQueueStatus('closed');
      setToast({ message: `Agence fermee (${data.autoCompletedCount} completes, ${data.autoCancelledCount} annules)`, type: 'success' });
      setTimeout(() => setToast(null), 5000);
      fetchBranchStatus(branch!.id);
    } catch {
      setToast({ message: 'Erreur lors de la fermeture', type: 'error' }); setTimeout(() => setToast(null), 3000);
    }
  };

  const handleExecuteRecommendation = async (recommendationId: string) => {
    if (!branch?.id) return;
    const success = await executeRecommendation(branch.id, recommendationId);
    if (success) {
      setToast({ message: 'Action executee avec succes', type: 'success' });
      fetchBranchStatus(branch.id);
      fetchData();
    } else {
      setToast({ message: 'Erreur lors de l\'execution', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const getPauseDuration = () => {
    if (!queuePausedAt) return '';
    const mins = Math.floor((Date.now() - new Date(queuePausedAt).getTime()) / 60000);
    return mins > 0 ? ` (${mins} min)` : '';
  };

  // ===== LOADING / NO BRANCH =====
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

  // SLA trajectory arrow
  const slaTrajectoryIcon = compositeMetrics?.slaTrajectory === 'failing' ? 'trending_down'
    : compositeMetrics?.slaTrajectory === 'at_risk' ? 'trending_flat'
    : 'trending_up';
  const slaTrajectoryColor = compositeMetrics?.slaTrajectory === 'failing' ? SG_COLORS.red
    : compositeMetrics?.slaTrajectory === 'at_risk' ? SG_COLORS.amber
    : SG_COLORS.green;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>

      {/* ============================================== */}
      {/* TIER 1 — COMPACT KPI STRIP                     */}
      {/* ============================================== */}
      {(() => {
        const healthScore = compositeMetrics?.healthScore ?? 0;
        const healthLabel = compositeMetrics ? t(`dashboard.ai.health.${compositeMetrics.healthLabel}`) : '—';
        const healthColor = healthScore >= 80 ? '#059669'
          : healthScore >= 60 ? SG_COLORS.green
          : healthScore >= 30 ? SG_COLORS.amber
          : SG_COLORS.red;
        const ringCircumference = 263.9;
        const ringDash = (healthScore / 100) * ringCircumference;

        const avgWaitMins = Math.round(stats?.times.avgWaitMins || 0);
        const waitBarPct = Math.min((waitingCount / ALERT_THRESHOLDS.QUEUE_CRITICAL) * 100, 100);
        const waitBarColor = waitingCount > ALERT_THRESHOLDS.QUEUE_WARNING ? SG_COLORS.red
          : waitingCount > ALERT_THRESHOLDS.QUEUE_WARNING / 2 ? SG_COLORS.amber : SG_COLORS.green;
        const avgWaitBarPct = Math.min((avgWaitMins / 60) * 100, 100);
        const avgWaitBarColor = avgWaitMins > 30 ? SG_COLORS.red : avgWaitMins > 15 ? SG_COLORS.amber : SG_COLORS.green;
        const capacityVal = compositeMetrics?.capacityUtilization ?? Math.round((openCounters / Math.max(totalCounters, 1)) * 100);
        const capacityBarPct = Math.min(capacityVal, 100);
        const slaVal = compositeMetrics?.slaCurrent ?? slaData?.sla.percentage ?? 100;
        const slaBarPct = Math.min(slaVal, 100);
        const slaBarColor = slaVal < 70 ? SG_COLORS.red : slaVal < 85 ? SG_COLORS.amber : SG_COLORS.green;
        const servedCount = slaData?.dailyTarget.served || stats?.tickets.completed || 0;
        const servedTarget = dailyTarget?.servedTarget || slaData?.dailyTarget.target || 100;
        const servedBarPct = Math.min((servedCount / servedTarget) * 100, 100);

        return (
          <div className="bg-white border-b border-gray-200">
            <div className="flex items-stretch">
              {/* Health Score accent strip */}
              <KpiTooltip tooltipKey="healthScore">
                <div
                  className="w-24 flex-shrink-0 flex flex-col items-center justify-center py-4 transition-colors duration-700"
                  style={{
                    background: `linear-gradient(180deg, ${healthColor}18 0%, ${healthColor}08 100%)`,
                    borderRight: `3px solid ${healthColor}`,
                  }}
                >
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={healthColor} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${ringDash} ${ringCircumference}`}
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black transition-colors duration-700" style={{ color: healthColor }}>
                        {compositeMetrics ? healthScore : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[8px] uppercase tracking-widest font-bold mt-1 transition-colors duration-700" style={{ color: healthColor }}>
                    {healthLabel}
                  </div>
                </div>
              </KpiTooltip>

              {/* 5-Column KPI Row with dividers */}
              <div className="flex-1 grid grid-cols-5 divide-x divide-gray-100">
                {/* Waiting */}
                <KpiTooltip tooltipKey="waitingCount">
                  <div className="flex flex-col items-center justify-center py-4 px-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: waitBarColor }}>groups</span>
                    <span className="text-2xl font-bold mt-1" style={{ color: SG_COLORS.black }}>{waitingCount}</span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">{t('dashboard.ai.waiting')}</span>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-12">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${waitBarPct}%`, background: waitBarColor }} />
                    </div>
                  </div>
                </KpiTooltip>

                {/* Avg Wait */}
                <KpiTooltip tooltipKey="avgWait">
                  <div className="flex flex-col items-center justify-center py-4 px-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: avgWaitBarColor }}>schedule</span>
                    <span className="text-2xl font-bold mt-1" style={{ color: SG_COLORS.black }}>
                      ~{avgWaitMins}<span className="text-xs font-normal text-gray-400">m</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">{t('dashboard.ai.avgWait')}</span>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-12">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${avgWaitBarPct}%`, background: avgWaitBarColor }} />
                    </div>
                  </div>
                </KpiTooltip>

                {/* Capacity */}
                <KpiTooltip tooltipKey="capacity">
                  <div className="flex flex-col items-center justify-center py-4 px-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: SG_COLORS.green }}>storefront</span>
                    <span className="text-2xl font-bold mt-1" style={{ color: SG_COLORS.black }}>
                      {compositeMetrics ? `${capacityVal}%` : `${openCounters}/${totalCounters}`}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">{t('dashboard.ai.capacity')}</span>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-12">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${capacityBarPct}%`, background: SG_COLORS.green }} />
                    </div>
                  </div>
                </KpiTooltip>

                {/* SLA */}
                <KpiTooltip tooltipKey="slaTrajectory">
                  <div className="flex flex-col items-center justify-center py-4 px-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: slaTrajectoryColor }}>{slaTrajectoryIcon}</span>
                    <span className="text-2xl font-bold mt-1" style={{ color: slaTrajectoryColor }}>{slaVal}%</span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">SLA</span>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-12">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${slaBarPct}%`, background: slaBarColor }} />
                    </div>
                  </div>
                </KpiTooltip>

                {/* Served */}
                <KpiTooltip tooltipKey="ticketsServed">
                  <div className="flex flex-col items-center justify-center py-4 px-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: SG_COLORS.green }}>check_circle</span>
                    <span className="text-2xl font-bold mt-1" style={{ color: SG_COLORS.black }}>
                      {servedCount}<span className="text-sm font-normal text-gray-400">/{servedTarget}</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">{t('dashboard.ai.served')}</span>
                    <div className="h-1 bg-gray-100 rounded-full mt-1.5 w-12">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${servedBarPct}%`, background: SG_COLORS.green }} />
                    </div>
                  </div>
                </KpiTooltip>
              </div>

              {/* Icon-only Quick Actions */}
              <div className="flex items-center gap-2 px-4 border-l border-gray-100">
                <button
                  onClick={() => {
                    const longWaitTicket = (branchStatus?.waitingTickets || []).find((tk: any) => {
                      const wm = Math.floor((Date.now() - new Date(tk.createdAt).getTime()) / 60000);
                      return wm >= 15;
                    });
                    if (longWaitTicket) prioritizeTicket(longWaitTicket.id);
                    else if (branchStatus?.waitingTickets?.length) {
                      setToast({ message: 'Aucun client en attente prolongee', type: 'success' }); setTimeout(() => setToast(null), 2000);
                    }
                  }}
                  disabled={!branchStatus?.waitingTickets?.length}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 disabled:opacity-50"
                  style={{ background: SG_COLORS.red }}
                  title="Prioriser VIP"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>priority_high</span>
                </button>
                <button
                  onClick={() => setCounterConfigModalOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 transition-all hover:scale-110"
                  title={`Guichets ${openCounters}/${totalCounters}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>storefront</span>
                </button>
                {queueStatus === 'paused' ? (
                  <button onClick={handleResumeQueue} className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: SG_COLORS.green }} title="Reprendre la file">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                  </button>
                ) : queueStatus === 'closed' ? (
                  <button onClick={handleResumeQueue} className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: SG_COLORS.green }} title="Ouvrir la file">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>door_open</span>
                  </button>
                ) : (
                  <button onClick={handlePauseQueue} className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:scale-110" style={{ borderColor: SG_COLORS.amber, color: SG_COLORS.amber }} title="Pause file">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pause</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================== */}
      {/* TIER 2 — 4-PANEL OPERATIONAL GRID              */}
      {/* ============================================== */}
      {(() => {
        // Group waiting tickets by service for the stacked bar
        const serviceGroups: Record<string, { name: string; count: number }> = {};
        (branchStatus?.waitingTickets || []).forEach((tk: any) => {
          const key = tk.serviceName || 'Autre';
          if (!serviceGroups[key]) serviceGroups[key] = { name: key, count: 0 };
          serviceGroups[key].count++;
        });
        const serviceList = Object.values(serviceGroups).sort((a, b) => b.count - a.count);
        const totalWaiting = serviceList.reduce((s, v) => s + v.count, 0) || 1;
        const serviceColors = [SG_COLORS.red, SG_COLORS.amber, '#9CA3AF', '#6B7280'];

        // SLA values
        const slaVal = compositeMetrics?.slaCurrent ?? slaData?.sla.percentage ?? 100;
        const slaTarget = dailyTarget?.slaTarget || 80;

        // Forecast bars
        const forecastPoints = forecast || [];
        const maxVol = Math.max(...forecastPoints.map((f) => f.predictedVolume), 1);

        return (
          <div className="p-5 bg-white border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              {/* Panel 1: Services stacked bar */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-3">Services</div>
                {serviceList.length > 0 ? (
                  <>
                    <div className="h-5 rounded-full overflow-hidden flex mb-3">
                      {serviceList.map((svc, i) => (
                        <div key={svc.name} style={{ width: `${(svc.count / totalWaiting) * 100}%`, background: serviceColors[i] || '#D1D5DB' }} title={`${svc.name}: ${svc.count}`} />
                      ))}
                    </div>
                    <div className="space-y-1 text-xs">
                      {serviceList.map((svc, i) => (
                        <div key={svc.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: serviceColors[i] || '#D1D5DB' }} />
                            <span className="truncate max-w-[100px]">{svc.name}</span>
                          </span>
                          <span className="font-bold">{svc.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">Aucun client en attente</div>
                )}
              </div>

              {/* Panel 2: Counter 2x2 grid */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-3">Guichets</div>
                <div className="grid grid-cols-2 gap-2">
                  {(branchStatus?.counters || []).slice(0, 4).map((counter) => {
                    const breakInfo = activeBreaks[counter.id];
                    const isOnBreak = (counter.status as string) === 'on_break' || !!breakInfo;
                    const isOpen = counter.status === 'open' && !isOnBreak;
                    const agent = agentStats.find((a) => a.userId === counter.assignedUserId);
                    const tellerName = tellers.find((tl) => tl.id === counter.assignedUserId)?.name;

                    return (
                      <div
                        key={counter.id}
                        className="text-center p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          background: isOnBreak ? SG_COLORS.amberBg : isOpen ? '#ECFDF5' : '#F3F4F6',
                        }}
                        onClick={() => {
                          if (isOnBreak && breakInfo) endBreak(breakInfo.breakId, counter.id);
                          else toggleCounter(counter.id, counter.status);
                        }}
                      >
                        <div className="font-bold text-sm" style={{ color: isOnBreak ? SG_COLORS.amber : isOpen ? SG_COLORS.green : '#9CA3AF' }}>
                          G{counter.number}
                        </div>
                        <div className="text-[9px]" style={{ color: isOnBreak ? '#B45309' : isOpen ? '#6B7280' : '#9CA3AF' }}>
                          {isOnBreak ? 'Pause' : isOpen ? (counter.currentTicket ? counter.currentTicket.ticketNumber : (tellerName || 'Actif')) : 'Ferme'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(branchStatus?.counters || []).length > 4 && (
                  <div className="text-[9px] text-gray-400 text-center mt-2">
                    +{(branchStatus?.counters || []).length - 4} guichets
                  </div>
                )}
              </div>

              {/* Panel 3: SLA Progress */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-3">Objectif SLA</div>
                <div className="pt-2">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(slaVal, 100)}%`, background: slaVal < 70 ? SG_COLORS.red : slaVal < 85 ? SG_COLORS.amber : SG_COLORS.green }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold" style={{ color: slaTrajectoryColor }}>{slaVal}%</span>
                    <span className="text-gray-400">Cible: {slaTarget}%</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: slaTrajectoryColor }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{slaTrajectoryIcon}</span>
                    {compositeMetrics?.slaTrajectory === 'failing' ? 'En deterioration' : compositeMetrics?.slaTrajectory === 'at_risk' ? 'A risque' : 'En bonne voie'}
                  </div>
                </div>
              </div>

              {/* Panel 4: Forecast sparkline bars */}
              <div className="rounded-lg border border-gray-200 p-4">
                <KpiTooltip tooltipKey="forecast">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-3">Prevision +4h</div>
                </KpiTooltip>
                {forecastPoints.length > 0 ? (
                  <>
                    <div className="flex items-end gap-1 h-12">
                      {forecastPoints.slice(0, 4).map((fp, i) => {
                        const pct = (fp.predictedVolume / maxVol) * 100;
                        const barColor = pct > 80 ? SG_COLORS.red : pct > 50 ? SG_COLORS.amber : '#D1D5DB';
                        return <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${Math.max(pct, 5)}%`, background: barColor }} />;
                      })}
                    </div>
                    <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                      {forecastPoints.slice(0, 4).map((fp, i) => (
                        <span key={i}>{String(fp.hour).padStart(2, '0')}h</span>
                      ))}
                    </div>
                    {(() => {
                      const peak = forecastPoints.slice(0, 4).reduce((max, fp) => fp.predictedVolume > max.predictedVolume ? fp : max, forecastPoints[0]);
                      return peak ? (
                        <div className="mt-2 text-xs text-center">
                          <span className="font-bold" style={{ color: SG_COLORS.red }}>Pic: {peak.predictedVolume} clients a {peak.hour}h</span>
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">Donnees insuffisantes</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================== */}
      {/* TIER 3 — FULL-WIDTH QUEUE TABLE                */}
      {/* ============================================== */}
      <div className="p-5">
        {/* Queue status banners */}
        {queueStatus === 'closed' && (
          <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{ background: SG_COLORS.redBg, borderLeft: `3px solid ${SG_COLORS.red}` }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: SG_COLORS.red, fontSize: 20 }}>door_front</span>
              <div>
                <p className="font-medium text-sm" style={{ color: SG_COLORS.red }}>Agence fermee</p>
                <p className="text-xs text-gray-500">{autoQueueEnabled ? 'La file s\'ouvrira automatiquement demain' : 'File fermee manuellement'}</p>
              </div>
            </div>
            <button onClick={handleResumeQueue} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm" style={{ backgroundColor: SG_COLORS.green, color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>Ouvrir
            </button>
          </div>
        )}
        {queueStatus === 'paused' && (
          <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{ background: SG_COLORS.amberBg, borderLeft: `3px solid ${SG_COLORS.amber}` }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: SG_COLORS.amber, fontSize: 20 }}>pause_circle</span>
              <div>
                <p className="font-medium text-sm" style={{ color: SG_COLORS.amber }}>File d'attente en pause{getPauseDuration()}</p>
                <p className="text-xs text-gray-500">Les clients ne peuvent pas prendre de ticket</p>
              </div>
            </div>
            <button onClick={handleResumeQueue} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm" style={{ backgroundColor: SG_COLORS.green, color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>Reprendre
            </button>
          </div>
        )}

        {/* Queue table header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">File d'attente</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: SG_COLORS.red }}>{waitingCount}</span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Mis a jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => setAnnouncementModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-200 hover:bg-gray-50"
              style={{ color: SG_COLORS.gray }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>campaign</span>Annonce
            </button>
            {queueStatus === 'open' && (
              <button
                onClick={handleCloseQueue}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border hover:bg-gray-50"
                style={{ background: closeConfirm ? SG_COLORS.red : 'white', color: closeConfirm ? 'white' : SG_COLORS.gray, borderColor: closeConfirm ? SG_COLORS.red : '#E5E7EB' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{closeConfirm ? 'warning' : 'logout'}</span>
                {closeConfirm ? 'Confirmer?' : 'Fin journee'}
              </button>
            )}
          </div>
        </div>

        {/* Full-width queue table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200" style={{ background: '#FAFAFA' }}>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-gray-400">Ticket</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-gray-400">Service</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-gray-400">Attente</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-gray-400">Statut</th>
                <th className="text-right py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {(branchStatus?.waitingTickets || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#D1D5DB' }}>hourglass_empty</span>
                    <p className="mt-2">Aucun client en attente</p>
                  </td>
                </tr>
              ) : (
                (branchStatus?.waitingTickets || []).map((ticket: any) => {
                  const waitMins = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
                  const slaThreshold = dailyTarget?.slaThreshold || 20;
                  const isSlaRisk = waitMins >= slaThreshold;
                  const isAtRisk = waitMins >= slaThreshold * 0.75 && !isSlaRisk;
                  const isHighPriority = ticket.priority > 0;

                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      style={{ background: isSlaRisk ? 'rgba(233,4,30,0.02)' : isHighPriority ? 'rgba(245,158,11,0.02)' : undefined }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold" style={{ color: SG_COLORS.black }}>{ticket.ticketNumber}</span>
                        {isHighPriority && (
                          <span className="ml-1.5 material-symbols-outlined" style={{ fontSize: 14, color: SG_COLORS.amber }}>star</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{ticket.serviceName}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold" style={{ color: isSlaRisk ? SG_COLORS.red : isAtRisk ? SG_COLORS.amber : '#6B7280' }}>
                          {waitMins} min
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isSlaRisk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: SG_COLORS.red }}>SLA</span>
                        ) : isAtRisk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: SG_COLORS.amberBg, color: '#92400E' }}>A risque</span>
                        ) : (
                          <span className="text-xs text-gray-400">Normal</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(isSlaRisk || isAtRisk) && (
                          <button
                            onClick={() => prioritizeTicket(ticket.id)}
                            className="px-3 py-1 rounded text-xs font-medium text-white transition-opacity hover:opacity-80"
                            style={{ background: isSlaRisk ? SG_COLORS.red : '#9CA3AF' }}
                          >
                            Prioriser
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================== */}
      {/* TIER 4 — ALERT BANNER + RECOMMENDATION CHIPS  */}
      {/* ============================================== */}
      {(() => {
        // Build alert summary
        const longWaitTickets = (branchStatus?.waitingTickets || [])
          .map((tk: any) => ({ ...tk, waitMins: Math.floor((Date.now() - new Date(tk.createdAt).getTime()) / 60000) }))
          .filter((tk: any) => tk.waitMins >= (dailyTarget?.slaThreshold || 20));

        const breakAlerts = Object.entries(activeBreaks)
          .map(([counterId, breakInfo]) => {
            const counter = branchStatus?.counters?.find((c) => c.id === counterId);
            const overtimeMins = breakInfo.expectedEnd ? Math.max(0, -Math.floor((new Date(breakInfo.expectedEnd).getTime() - Date.now()) / 60000)) : 0;
            return { counterId, counterNumber: counter?.number || 0, userName: breakInfo.userName, breakId: breakInfo.breakId, overtimeMins };
          })
          .filter((b) => b.overtimeMins > 0);

        const alertParts: string[] = [];
        if (longWaitTickets.length > 0) alertParts.push(`${longWaitTickets[0].ticketNumber} attend ${longWaitTickets[0].waitMins} min`);
        if (breakAlerts.length > 0) alertParts.push(`G${breakAlerts[0].counterNumber} depasse la pause de ${breakAlerts[0].overtimeMins} min`);
        if (enhancedAlerts.length > alertParts.length) alertParts.push(`+${enhancedAlerts.length - alertParts.length} autre${enhancedAlerts.length - alertParts.length > 1 ? 's' : ''}`);

        const totalAlerts = longWaitTickets.length + breakAlerts.length;
        const hasAlerts = totalAlerts > 0 || enhancedAlerts.length > 0;
        const hasRecommendations = recommendations.length > 0;

        if (!hasAlerts && !hasRecommendations) return null;

        return (
          <div className="border-t border-gray-200">
            {/* Alert banner */}
            {hasAlerts && (
              <div className="flex items-center gap-4 px-6 py-3" style={{
                background: longWaitTickets.length > 0 ? SG_COLORS.redBg : SG_COLORS.amberBg,
                borderLeft: `4px solid ${longWaitTickets.length > 0 ? SG_COLORS.red : SG_COLORS.amber}`,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: longWaitTickets.length > 0 ? SG_COLORS.red : SG_COLORS.amber }}>warning</span>
                <span className="flex-1 text-sm font-semibold" style={{ color: longWaitTickets.length > 0 ? '#991B1B' : '#92400E' }}>
                  {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''}: {alertParts.join(' | ')}
                </span>
              </div>
            )}

            {/* Horizontal recommendation chips */}
            {hasRecommendations && (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: SG_COLORS.red }}>auto_awesome</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-3">
                  {recommendations.map((rec) => {
                    const urgencyColor = rec.urgency === 'critical' ? SG_COLORS.red
                      : rec.urgency === 'high' ? SG_COLORS.amber : '#9CA3AF';
                    const urgencyBg = rec.urgency === 'critical' ? 'rgba(233,4,30,0.02)'
                      : rec.urgency === 'high' ? 'rgba(245,158,11,0.02)' : 'transparent';
                    const icon = rec.actionType === 'open_counter' ? 'door_open'
                      : rec.actionType === 'end_break' ? 'alarm_off'
                      : rec.actionType === 'bump_priority' ? 'priority_high'
                      : 'auto_awesome';

                    return (
                      <div
                        key={rec.id}
                        className="flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-sm"
                        style={{
                          borderColor: rec.urgency === 'critical' || rec.urgency === 'high' ? urgencyColor : '#E5E7EB',
                          background: urgencyBg,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: urgencyColor }}>{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{rec.action}</div>
                          <div className="text-xs text-gray-500 truncate">{rec.rationale}</div>
                        </div>
                        {rec.executable && (
                          <button
                            onClick={() => handleExecuteRecommendation(rec.id)}
                            disabled={isExecuting === rec.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ background: urgencyColor }}
                          >
                            {isExecuting === rec.id ? (
                              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                            ) : 'Executer'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ============================================== */}
      {/* MODALS */}
      {/* ============================================== */}
      {selectedCounterForBreak && (
        <BreakModal isOpen={breakModalOpen} onClose={() => { setBreakModalOpen(false); setSelectedCounterForBreak(null); }}
          counter={selectedCounterForBreak} onBreakStarted={() => fetchBranchStatus(branch!.id)} />
      )}
      <TellerManagementModal isOpen={tellerModalOpen} onClose={() => setTellerModalOpen(false)} branchId={branch.id}
        onTellerUpdated={() => { adminApi.listUsers(1, 50, branch.id, 'teller').then((res) => setTellers(res.data.data || [])); }} />
      <TargetEditModal branchId={branch.id} isOpen={targetModalOpen} onClose={() => setTargetModalOpen(false)}
        onSaved={() => { adminApi.getBranchTarget(branch.id).then((res) => setDailyTarget(res.data.data)); setToast({ message: 'Objectifs mis a jour', type: 'success' }); setTimeout(() => setToast(null), 3000); }}
        currentTarget={dailyTarget || undefined} />
      <AnnouncementModal branchId={branch.id} isOpen={announcementModalOpen} onClose={() => setAnnouncementModalOpen(false)}
        onSent={() => { setToast({ message: 'Annonce envoyee', type: 'success' }); setTimeout(() => setToast(null), 3000); }} />
      <CounterConfigModal branchId={branch.id} isOpen={counterConfigModalOpen} onClose={() => setCounterConfigModalOpen(false)}
        onSaved={() => { analyticsApi.getTodayStats(branch.id).then((res) => setStats(res.data.data)); setToast({ message: 'Guichets configures', type: 'success' }); setTimeout(() => setToast(null), 3000); }}
        currentCount={stats?.counters?.total || 0} openCounters={branchStatus?.counters?.filter((c) => c.status !== 'closed').length || 0} />
      {selectedTeller && (
        <TellerTimelineModal branchId={branch.id} tellerId={selectedTeller.id} tellerName={selectedTeller.name}
          isOpen={tellerTimelineOpen} onClose={() => { setTellerTimelineOpen(false); setSelectedTeller(null); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
          style={{ backgroundColor: toast.type === 'success' ? SG_COLORS.green : '#EF4444', color: 'white' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
