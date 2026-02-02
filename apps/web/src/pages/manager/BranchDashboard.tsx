import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { analyticsApi, adminApi } from '@/lib/api';
import {
  getSocket,
  connectSocket,
  joinBranchRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';
import Card, { CardTitle } from '@/components/ui/Card';
import Badge, { StatusBadge } from '@/components/ui/Badge';

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

export default function BranchDashboard() {
  const { t, i18n } = useTranslation();
  const { branch } = useAuthStore();
  const { branchStatus, fetchBranchStatus } = useQueueStore();

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [agentStats, setAgentStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!branch?.id) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, agentsRes] = await Promise.all([
          analyticsApi.getTodayStats(branch.id),
          analyticsApi.getAgentStats(
            branch.id,
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
        ]);

        setStats(statsRes.data.data);
        setAgentStats(agentsRes.data.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    fetchBranchStatus(branch.id);

    // Socket connection
    connectSocket();
    const socket = getSocket();
    joinBranchRoom(branch.id);

    const refreshStats = () => fetchData();
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshStats);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, () => fetchBranchStatus(branch.id));

    // Refresh every minute
    const interval = setInterval(fetchData, 60000);

    return () => {
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, refreshStats);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED);
      clearInterval(interval);
    };
  }, [branch?.id, fetchBranchStatus]);

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
        <p className="text-sm text-gray-500">
          {t('manager.useBranchSelector')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('manager.dashboard')}
        </h1>
        <p className="text-gray-600">{branch?.name}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">
              {stats?.tickets.waiting || 0}
            </div>
            <div className="text-sm text-gray-600">{t('manager.waiting')}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {stats?.tickets.completed || 0}
            </div>
            <div className="text-sm text-gray-600">{t('manager.served')}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              ~{stats?.times.avgWaitMins || 0}
            </div>
            <div className="text-sm text-gray-600">
              {t('manager.avgWaitTime')}
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {stats?.counters.open || 0}/{stats?.counters.total || 0}
            </div>
            <div className="text-sm text-gray-600">
              {t('manager.openCounters')}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Counters status */}
        <Card>
          <CardTitle>{t('manager.counters')}</CardTitle>
          <div className="mt-4 space-y-3">
            {branchStatus?.counters.map((counter) => (
              <div
                key={counter.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={
                      counter.status === 'open'
                        ? counter.currentTicket
                          ? 'busy'
                          : 'online'
                        : 'offline'
                    }
                  />
                  <div>
                    <div className="font-medium">
                      {t('display.counter')} {counter.number}
                    </div>
                    {counter.label && (
                      <div className="text-sm text-gray-500">{counter.label}</div>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  {counter.currentTicket ? (
                    <div className="font-bold text-primary-600">
                      {counter.currentTicket.ticketNumber}
                    </div>
                  ) : counter.status === 'open' ? (
                    <span className="text-green-600 text-sm">
                      {t('status.waiting')}...
                    </span>
                  ) : (
                    <Badge variant="gray">{t('status.cancelled')}</Badge>
                  )}
                  {counter.assignedUserName && (
                    <div className="text-sm text-gray-500">
                      {counter.assignedUserName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent performance */}
        <Card>
          <CardTitle>{t('manager.agentPerformance')}</CardTitle>
          <div className="mt-4">
            {agentStats.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-gray-500">
                    <th className="text-start pb-3">{t('admin.users')}</th>
                    <th className="text-end pb-3">{t('manager.ticketsServed')}</th>
                    <th className="text-end pb-3">{t('manager.avgServiceTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((agent) => (
                    <tr key={agent.userId} className="border-t">
                      <td className="py-3">{agent.userName}</td>
                      <td className="text-end font-semibold">{agent.totalServed}</td>
                      <td className="text-end text-gray-600">
                        {agent.avgServiceMins} {t('common.minutes')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {t('display.noTickets')}
              </p>
            )}
          </div>
        </Card>

        {/* Queue preview */}
        <Card className="lg:col-span-2">
          <CardTitle>{t('display.waiting')}</CardTitle>
          <div className="mt-4">
            {branchStatus?.waitingTickets && branchStatus.waitingTickets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {branchStatus.waitingTickets.slice(0, 12).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="font-bold text-lg">{ticket.ticketNumber}</div>
                    <div className="text-xs text-gray-500">
                      {ticket.serviceName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {t('display.noTickets')}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
