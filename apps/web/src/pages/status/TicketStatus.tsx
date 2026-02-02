import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueueStore } from '@/stores/queueStore';
import {
  getSocket,
  connectSocket,
  joinTicketRoom,
  leaveTicketRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';

export default function TicketStatus() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, i18n } = useTranslation();
  const {
    ticketPosition,
    isLoadingTicketPosition,
    fetchTicketPosition,
  } = useQueueStore();

  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticketId) return;

    // Fetch initial status
    fetchTicketPosition(ticketId).catch(() => {
      setError(t('errors.notFound'));
    });

    // Connect to socket for real-time updates
    connectSocket();
    const socket = getSocket();

    joinTicketRoom(ticketId);

    // Listen for updates
    socket.on(SOCKET_EVENTS.TICKET_CALLED, (data) => {
      if (data.ticket?.id === ticketId) {
        fetchTicketPosition(ticketId);
      }
    });

    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, (data) => {
      if (data.ticketId === ticketId) {
        fetchTicketPosition(ticketId);
      }
    });

    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, () => {
      fetchTicketPosition(ticketId);
    });

    // Refresh periodically as backup
    const interval = setInterval(() => {
      fetchTicketPosition(ticketId);
    }, 30000);

    return () => {
      leaveTicketRoom(ticketId);
      clearInterval(interval);
      socket.off(SOCKET_EVENTS.TICKET_CALLED);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED);
    };
  }, [ticketId, fetchTicketPosition, t]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  if (isLoadingTicketPosition && !ticketPosition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !ticketPosition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || t('errors.notFound')}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (ticketPosition.status) {
      case 'called':
        return 'bg-green-600';
      case 'serving':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-gray-400';
      case 'no_show':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-primary-600';
    }
  };

  const isYourTurn = ticketPosition.status === 'called';
  const isServing = ticketPosition.status === 'serving';
  const isDone =
    ticketPosition.status === 'completed' ||
    ticketPosition.status === 'no_show' ||
    ticketPosition.status === 'cancelled';

  return (
    <div
      className={`min-h-screen ${
        isYourTurn ? 'bg-green-600' : isDone ? 'bg-gray-100' : 'bg-primary-600'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white">
        <span className="text-xl font-bold">BléSaf</span>
        <button onClick={toggleLanguage} className="text-sm opacity-80">
          {i18n.language === 'fr' ? 'العربية' : 'Français'}
        </button>
      </div>

      <div className="px-4 pb-8">
        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Ticket header */}
          <div className={`${getStatusColor()} text-white p-6 text-center`}>
            {isYourTurn && (
              <div className="text-2xl font-bold mb-2 animate-pulse">
                🎉 {t('status.yourTurn')}
              </div>
            )}
            <div className="text-6xl font-bold">
              {ticketPosition.ticketNumber}
            </div>
            <div className="text-lg mt-2 opacity-90">
              {ticketPosition.serviceName}
            </div>
          </div>

          {/* Status info */}
          <div className="p-6">
            {/* Position */}
            {ticketPosition.status === 'waiting' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-primary-600">
                    #{ticketPosition.position}
                  </div>
                  <div className="text-gray-600 mt-1">
                    {t('status.position')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {ticketPosition.position - 1}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('status.waitingAhead', {
                        count: ticketPosition.position - 1,
                      })}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ~{ticketPosition.estimatedWaitMins}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('common.minutes')}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Called - show counter */}
            {isYourTurn && ticketPosition.counterNumber && (
              <div className="text-center mb-6">
                <div className="text-xl text-gray-600">
                  {t('status.goToCounter')}
                </div>
                <div className="text-6xl font-bold text-primary-600 mt-2">
                  {ticketPosition.counterNumber}
                </div>
              </div>
            )}

            {/* Done */}
            {isDone && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">
                  {ticketPosition.status === 'completed' ? '✅' : '❌'}
                </div>
                <div className="text-xl text-gray-600">
                  {ticketPosition.status === 'completed'
                    ? t('status.thankYou')
                    : t(`status.${ticketPosition.status}`)}
                </div>
              </div>
            )}

            {/* Branch info */}
            <div className="border-t pt-4 mt-4">
              <div className="text-sm text-gray-500">{t('status.branchName')}</div>
              <div className="font-medium">{ticketPosition.branchName}</div>
            </div>
          </div>
        </div>

        {/* Refresh indicator */}
        {isLoadingTicketPosition && (
          <div className="text-center mt-4">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
