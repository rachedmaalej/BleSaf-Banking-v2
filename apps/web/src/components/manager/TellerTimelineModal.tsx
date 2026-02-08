import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
};

interface TellerTimelineData {
  teller: { id: string; name: string };
  date: string;
  summary: {
    ticketsServed: number;
    avgServiceMins: number;
    totalBreakMins: number;
    activeHours: number;
  };
  hourlyBreakdown: { hour: number; ticketsServed: number }[];
  events: Array<{
    type: 'ticket' | 'break_start' | 'break_end';
    time: string;
    details: Record<string, unknown>;
  }>;
}

interface TellerTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  tellerId: string;
  tellerName: string;
}

export function TellerTimelineModal({
  isOpen,
  onClose,
  branchId,
  tellerId,
  tellerName,
}: TellerTimelineModalProps) {
  const [data, setData] = useState<TellerTimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isOpen && tellerId) {
      fetchTimeline();
    }
  }, [isOpen, tellerId, selectedDate]);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getTellerTimeline(branchId, tellerId, selectedDate);
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}h`;
  };

  const getBreakReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      lunch: 'Déjeuner',
      prayer: 'Prière',
      personal: 'Personnel',
      urgent: 'Urgent',
    };
    return labels[reason] || reason;
  };

  if (!isOpen) return null;

  // Filter hourly data to only show business hours (7-20)
  const businessHoursData = data?.hourlyBreakdown.filter(
    (h) => h.hour >= 7 && h.hour <= 20
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: SG_COLORS.black }}>
              timeline
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tellerName}</h2>
              <p className="text-sm text-gray-500">Activité détaillée</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Date picker */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
              <p className="text-gray-500">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-light" style={{ color: SG_COLORS.black }}>
                    {data.summary.ticketsServed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Clients servis</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-light" style={{ color: SG_COLORS.black }}>
                    {data.summary.avgServiceMins}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Min/client</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-light" style={{ color: SG_COLORS.rose }}>
                    {data.summary.totalBreakMins}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Min en pause</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-light" style={{ color: SG_COLORS.green }}>
                    {data.summary.activeHours}h
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Actif</div>
                </div>
              </div>

              {/* Hourly Chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
                    bar_chart
                  </span>
                  Tickets par heure
                </h3>
                <div className="h-48 bg-gray-50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={businessHoursData}>
                      <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        fontSize={11}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        fontSize={11}
                        stroke="#9CA3AF"
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} tickets`, 'Servis']}
                        labelFormatter={(label: number) => `${formatHour(label)}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      />
                      <Bar
                        dataKey="ticketsServed"
                        fill={SG_COLORS.black}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Event Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '18px' }}>
                    history
                  </span>
                  Chronologie des événements
                </h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {data.events.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Aucune activité ce jour
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {data.events.map((event, index) => (
                        <div key={index} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          {/* Event icon */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor:
                                event.type === 'ticket'
                                  ? 'rgba(26, 26, 26, 0.1)'
                                  : event.type === 'break_start'
                                  ? 'rgba(214, 104, 116, 0.1)'
                                  : 'rgba(16, 185, 129, 0.1)',
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '16px',
                                color:
                                  event.type === 'ticket'
                                    ? SG_COLORS.black
                                    : event.type === 'break_start'
                                    ? SG_COLORS.rose
                                    : SG_COLORS.green,
                              }}
                            >
                              {event.type === 'ticket'
                                ? 'confirmation_number'
                                : event.type === 'break_start'
                                ? 'pause_circle'
                                : 'play_circle'}
                            </span>
                          </div>

                          {/* Event details */}
                          <div className="flex-1 min-w-0">
                            {event.type === 'ticket' ? (
                              <>
                                <div className="text-sm font-medium text-gray-900">
                                  Ticket {String(event.details.ticketNumber)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {String(event.details.service)} • {event.details.durationMins} min
                                </div>
                              </>
                            ) : event.type === 'break_start' ? (
                              <>
                                <div className="text-sm font-medium" style={{ color: SG_COLORS.rose }}>
                                  Début de pause
                                </div>
                                <div className="text-xs text-gray-500">
                                  {getBreakReasonLabel(String(event.details.reason))} • {String(event.details.plannedMins)} min prévues
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-medium" style={{ color: SG_COLORS.green }}>
                                  Fin de pause
                                </div>
                                <div className="text-xs text-gray-500">
                                  {String(event.details.actualMins)} min effectives
                                </div>
                              </>
                            )}
                          </div>

                          {/* Time */}
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(event.time)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TellerTimelineModal;
