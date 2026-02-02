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

// Service colors - Subtle Elegance (matching Kiosk)
const SERVICE_COLORS: Record<string, { bg: string; accent: string; tint: string }> = {
  "Retrait d'espèces": { bg: '#FEE2E2', accent: '#E9041E', tint: '#FEF7F7' },
  'Relevés de compte': { bg: '#F0F0F0', accent: '#1A1A1A', tint: '#F5F5F5' },
  "Dépôt d'espèces": { bg: '#FCE8EB', accent: '#D66874', tint: '#FDF5F6' },
  'Autres': { bg: '#F0F0F0', accent: '#666666', tint: '#F5F5F5' },
};

// SG Brand colors
const SG_RED = '#E9041E';

export default function TicketStatus() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, i18n } = useTranslation();
  const {
    ticketPosition,
    isLoadingTicketPosition,
    fetchTicketPosition,
  } = useQueueStore();

  const [error, setError] = useState('');

  // Load Material Symbols font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

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

    // Refresh function for any queue change
    const refreshPosition = () => {
      fetchTicketPosition(ticketId);
    };

    // Re-join room on reconnect
    const onConnect = () => {
      joinTicketRoom(ticketId);
    };

    // Listen for all queue-affecting events
    socket.on('connect', onConnect);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_SERVING, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, refreshPosition);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, refreshPosition);

    // Polling fallback: refresh every 5 seconds for reliable updates
    const interval = setInterval(() => {
      fetchTicketPosition(ticketId);
    }, 5000);

    return () => {
      leaveTicketRoom(ticketId);
      clearInterval(interval);
      socket.off('connect', onConnect);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_SERVING, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_NO_SHOW, refreshPosition);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, refreshPosition);
    };
  }, [ticketId, fetchTicketPosition, t]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  // Get service colors
  const getServiceColors = (serviceName: string) => {
    return SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];
  };

  if (isLoadingTicketPosition && !ticketPosition) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 mx-auto mb-4" style={{ borderTopColor: SG_RED }} />
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !ticketPosition) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <span
            className="material-symbols-outlined mb-4 block"
            style={{ fontSize: '64px', color: '#DDD' }}
          >
            error_outline
          </span>
          <p className="text-gray-600 mb-4">{error || t('errors.notFound')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg text-white font-medium"
            style={{ background: SG_RED }}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const serviceColors = getServiceColors(ticketPosition.serviceName);
  const isYourTurn = ticketPosition.status === 'called';
  const isServing = ticketPosition.status === 'serving';
  const isDone =
    ticketPosition.status === 'completed' ||
    ticketPosition.status === 'no_show' ||
    ticketPosition.status === 'cancelled';
  const isWaiting = ticketPosition.status === 'waiting';

  // Background color based on status
  const getBackgroundColor = () => {
    if (isYourTurn) return '#22C55E'; // Green for your turn
    if (isServing) return serviceColors.accent;
    if (isDone) return '#F5F5F5';
    return serviceColors.tint;
  };

  return (
    <>
      <style>{`
        .status-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .status-container * {
          box-sizing: border-box;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }
        .pulse-animation {
          animation: pulse-ring 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className="status-container min-h-screen flex flex-col"
        style={{ background: getBackgroundColor() }}
      >
        {/* Header */}
        <header
          className="flex justify-between items-center px-4 py-3"
          style={{
            background: isYourTurn || isServing ? 'transparent' : 'white',
            borderBottom: isYourTurn || isServing ? 'none' : '1px solid #E5E5E5',
          }}
        >
          <img
            src="/uib-logo.png"
            alt="UIB"
            className="h-8 w-auto"
            style={{ filter: isYourTurn || isServing ? 'brightness(0) invert(1)' : 'none' }}
          />
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: isYourTurn || isServing ? 'rgba(255,255,255,0.2)' : '#F5F5F5',
              color: isYourTurn || isServing ? 'white' : '#666',
            }}
          >
            {i18n.language === 'fr' ? 'العربية' : 'Français'}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'white',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            {/* Your Turn Banner */}
            {isYourTurn && (
              <div
                className="py-4 text-center pulse-animation"
                style={{ background: '#22C55E', color: 'white' }}
              >
                <span
                  className="material-symbols-outlined mb-1"
                  style={{ fontSize: '32px' }}
                >
                  celebration
                </span>
                <div className="text-xl font-bold">{t('status.yourTurn')}</div>
              </div>
            )}

            {/* Ticket Number Section */}
            <div className="p-6 text-center">
              {/* Ticket Number - Large Display */}
              <div
                className="text-6xl sm:text-7xl mb-2"
                style={{
                  color: isDone ? '#999' : serviceColors.accent,
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                {ticketPosition.ticketNumber}
              </div>

              {/* Service indicator - thin line with name */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span
                  className="block h-0.5 rounded"
                  style={{ width: '32px', background: serviceColors.accent, opacity: isDone ? 0.3 : 1 }}
                />
                <span className="text-sm text-gray-500">
                  {ticketPosition.serviceName}
                </span>
                <span
                  className="block h-0.5 rounded"
                  style={{ width: '32px', background: serviceColors.accent, opacity: isDone ? 0.3 : 1 }}
                />
              </div>

              {/* Waiting Status */}
              {isWaiting && (
                <>
                  {/* Position */}
                  <div className="mb-6">
                    <div
                      className="text-5xl font-bold mb-1"
                      style={{ color: serviceColors.accent }}
                    >
                      #{ticketPosition.position}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('status.position')}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-4"
                      style={{ background: '#F8F8F8' }}
                    >
                      <div className="text-2xl font-semibold text-gray-900">
                        {ticketPosition.position - 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('status.waitingAhead', { count: ticketPosition.position - 1 })}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-4"
                      style={{ background: '#F8F8F8' }}
                    >
                      <div className="text-2xl font-semibold text-gray-900">
                        ~{ticketPosition.estimatedWaitMins}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('common.minutes')}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Called - Go to Counter */}
              {isYourTurn && ticketPosition.counterNumber && (
                <div className="py-4">
                  <div className="text-sm text-gray-500 mb-2">
                    {t('status.goToCounter')}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '32px', color: '#22C55E' }}
                    >
                      arrow_forward
                    </span>
                    <div
                      className="text-6xl font-bold"
                      style={{ color: '#22C55E' }}
                    >
                      {ticketPosition.counterNumber}
                    </div>
                  </div>
                </div>
              )}

              {/* Serving Status */}
              {isServing && (
                <div className="py-4">
                  <span
                    className="material-symbols-outlined mb-2"
                    style={{ fontSize: '48px', color: serviceColors.accent }}
                  >
                    support_agent
                  </span>
                  <div className="text-lg font-medium text-gray-700">
                    {t('status.serving')}
                  </div>
                </div>
              )}

              {/* Done Status */}
              {isDone && (
                <div className="py-6">
                  <span
                    className="material-symbols-outlined mb-3"
                    style={{
                      fontSize: '64px',
                      color: ticketPosition.status === 'completed' ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {ticketPosition.status === 'completed' ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="text-lg text-gray-600">
                    {ticketPosition.status === 'completed'
                      ? t('status.thankYou')
                      : t(`status.${ticketPosition.status}`)}
                  </div>
                </div>
              )}
            </div>

            {/* Branch Info Footer */}
            <div
              className="px-6 py-4"
              style={{ background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}
            >
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  location_on
                </span>
                {ticketPosition.branchName}
              </div>
            </div>
          </div>
        </main>

        {/* Refresh Indicator */}
        {isLoadingTicketPosition && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}
            >
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              {t('common.loading')}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
