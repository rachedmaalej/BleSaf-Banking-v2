import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { analyticsApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
};

interface TodayStats {
  tickets: {
    total: number;
    waiting: number;
    serving: number;
    completed: number;
    noShow: number;
    cancelled: number;
  };
  waitTime: {
    avg: number;
    max: number;
    min: number;
  };
  serviceTime: {
    avg: number;
  };
}

interface AgentStat {
  userId: string;
  userName: string;
  ticketsServed: number;
  avgServiceTime: number;
  totalServiceTime: number;
  breakTime: number;
}

interface TopService {
  serviceId: string;
  serviceName: string;
  prefix: string;
  count: number;
  avgWaitMins: number;
}

interface SlaMetrics {
  sla: {
    targetMins: number;
    withinSla: number;
    totalServed: number;
    percentage: number;
    status: string;
  };
  dailyTarget: {
    target: number;
    served: number;
    remaining: number;
    progress: number;
  };
}

export default function ManagerReports() {
  const { t } = useTranslation();
  const { branch } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<SlaMetrics | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch all report data
  useEffect(() => {
    if (!branch?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get today's date range for agent stats
        const today = new Date().toISOString().split('T')[0];

        const [statsRes, agentsRes, servicesRes, slaRes] = await Promise.all([
          analyticsApi.getTodayStats(branch.id),
          analyticsApi.getAgentStats(branch.id, today, today),
          analyticsApi.getTopServices(branch.id),
          analyticsApi.getSlaMetrics(branch.id),
        ]);

        setStats(statsRes.data.data);
        setAgentStats(agentsRes.data.data || []);
        setTopServices(servicesRes.data.data || []);
        setSlaMetrics(slaRes.data.data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [branch?.id]);

  // Calculate no-show rate
  const noShowRate = stats?.tickets
    ? (stats.tickets.completed || 0) + (stats.tickets.noShow || 0) > 0
      ? Math.round(((stats.tickets.noShow || 0) / ((stats.tickets.completed || 0) + (stats.tickets.noShow || 0))) * 100)
      : 0
    : 0;

  // Format time in minutes
  const formatMins = (mins: number) => {
    if (mins < 1) return '< 1 min';
    return `${Math.round(mins)} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '24px', color: SG_COLORS.gray }}
          >
            progress_activity
          </span>
          <span style={{ color: SG_COLORS.gray }}>Chargement des rapports...</span>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '48px' }}>
            store_off
          </span>
          <p className="mt-2 text-gray-600">{t('manager.noBranchAssigned')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: SG_COLORS.black }}>
                analytics
              </span>
              <div>
                <h1 className="text-xl font-semibold" style={{ color: SG_COLORS.black }}>
                  Rapports du jour
                </h1>
                <p className="text-sm" style={{ color: SG_COLORS.gray }}>
                  {branch.name} - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-xs" style={{ color: SG_COLORS.gray }}>
                Mis a jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Clients Servis */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.green }}>
                check_circle
              </span>
              <span className="text-sm" style={{ color: SG_COLORS.gray }}>Clients servis</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
              {stats?.tickets?.completed || 0}
            </p>
            {slaMetrics && (
              <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                Objectif: {slaMetrics.dailyTarget.target} ({slaMetrics.dailyTarget.progress}%)
              </p>
            )}
          </div>

          {/* Temps d'attente */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.amber }}>
                schedule
              </span>
              <span className="text-sm" style={{ color: SG_COLORS.gray }}>Attente moyenne</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
              {stats?.waitTime?.avg ? Math.round(stats.waitTime.avg) : 0}
              <span className="text-lg font-normal" style={{ color: SG_COLORS.gray }}> min</span>
            </p>
            {stats?.waitTime?.max && (
              <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                Max: {Math.round(stats.waitTime.max)} min
              </p>
            )}
          </div>

          {/* SLA */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.red }}>
                speed
              </span>
              <span className="text-sm" style={{ color: SG_COLORS.gray }}>SLA</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
              {slaMetrics?.sla.percentage || 0}
              <span className="text-lg font-normal" style={{ color: SG_COLORS.gray }}>%</span>
            </p>
            {slaMetrics && (
              <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                {slaMetrics.sla.withinSla}/{slaMetrics.sla.totalServed} dans les {slaMetrics.sla.targetMins} min
              </p>
            )}
          </div>

          {/* No-show */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: SG_COLORS.rose }}>
                person_off
              </span>
              <span className="text-sm" style={{ color: SG_COLORS.gray }}>Taux no-show</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: SG_COLORS.black }}>
              {noShowRate}
              <span className="text-lg font-normal" style={{ color: SG_COLORS.gray }}>%</span>
            </p>
            <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
              {stats?.tickets?.noShow || 0} absent(s)
            </p>
          </div>
        </div>

        {/* Two Column Layout for Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: SG_COLORS.black }}>
                category
              </span>
              <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Par service
              </h2>
            </div>

            {topServices.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '40px' }}>
                  inbox
                </span>
                <p className="mt-2" style={{ color: SG_COLORS.gray }}>
                  Aucune donnee disponible
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Service
                      </th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Tickets
                      </th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Attente moy.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServices.map((service, index) => (
                      <tr
                        key={service.serviceId}
                        className={index !== topServices.length - 1 ? 'border-b border-gray-50' : ''}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 text-xs font-bold rounded"
                              style={{ backgroundColor: '#F3F4F6', color: SG_COLORS.black }}
                            >
                              {service.prefix}
                            </span>
                            <span className="text-sm font-medium" style={{ color: SG_COLORS.black }}>
                              {service.serviceName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                            {service.count}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm" style={{ color: SG_COLORS.gray }}>
                            {formatMins(service.avgWaitMins)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Agents Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: SG_COLORS.black }}>
                groups
              </span>
              <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Performance agents
              </h2>
            </div>

            {agentStats.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '40px' }}>
                  person_off
                </span>
                <p className="mt-2" style={{ color: SG_COLORS.gray }}>
                  Aucune donnee disponible
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Agent
                      </th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Servis
                      </th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Moy/serv
                      </th>
                      <th className="text-right text-xs font-medium px-4 py-3" style={{ color: SG_COLORS.gray }}>
                        Pause
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentStats.map((agent, index) => (
                      <tr
                        key={agent.userId}
                        className={index !== agentStats.length - 1 ? 'border-b border-gray-50' : ''}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ backgroundColor: SG_COLORS.black }}
                            >
                              {agent.userName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-medium" style={{ color: SG_COLORS.black }}>
                              {agent.userName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                            {agent.ticketsServed}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm" style={{ color: SG_COLORS.gray }}>
                            {formatMins(agent.avgServiceTime)}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm" style={{ color: SG_COLORS.gray }}>
                            {agent.breakTime ? formatMins(agent.breakTime) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: SG_COLORS.black }}>
              summarize
            </span>
            <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
              Resume de la journee
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>
                {stats?.tickets?.total || 0}
              </p>
              <p className="text-xs" style={{ color: SG_COLORS.gray }}>Total tickets</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-2xl font-bold" style={{ color: SG_COLORS.amber }}>
                {stats?.tickets?.waiting || 0}
              </p>
              <p className="text-xs" style={{ color: SG_COLORS.gray }}>En attente</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-2xl font-bold" style={{ color: SG_COLORS.green }}>
                {stats?.tickets?.serving || 0}
              </p>
              <p className="text-xs" style={{ color: SG_COLORS.gray }}>En cours</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-2xl font-bold" style={{ color: SG_COLORS.rose }}>
                {stats?.tickets?.cancelled || 0}
              </p>
              <p className="text-xs" style={{ color: SG_COLORS.gray }}>Annules</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
