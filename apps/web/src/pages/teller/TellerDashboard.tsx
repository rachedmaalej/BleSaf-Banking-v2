import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import {
  getSocket,
  connectSocket,
  joinBranchRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';

// Service icon mapping (Material Symbols)
const SERVICE_ICONS: Record<string, string> = {
  "Retrait d'espèces": 'local_atm',
  'Relevés de compte': 'receipt_long',
  "Dépôt d'espèces": 'payments',
  'Autres': 'more_horiz',
};

// Service colors - Refined Simplicity (SG Aesthetic)
// Service color shown as thin horizontal line, not background fills
const SERVICE_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  "Retrait d'espèces": { bg: '#FFFFFF', accent: '#E9041E', text: '#1A1A1A' },   // SG Red
  'Relevés de compte': { bg: '#FFFFFF', accent: '#1A1A1A', text: '#1A1A1A' },   // Black
  "Dépôt d'espèces": { bg: '#FFFFFF', accent: '#D66874', text: '#1A1A1A' },     // Rose
  'Autres': { bg: '#FFFFFF', accent: '#666666', text: '#1A1A1A' },              // Gray
};

// SG Red for primary CTA (Call Next button)
const SG_RED = '#E9041E';

const getServiceColors = (serviceName: string) => {
  return SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];
};

// getServiceIcon used in queue footer
const getServiceIcon = (serviceName: string) => {
  return SERVICE_ICONS[serviceName] || SERVICE_ICONS['Autres'];
};

// Unused but kept for potential future use
void getServiceIcon;

export default function TellerDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, branch, logout } = useAuthStore();
  const {
    tellerQueue,
    isLoadingTellerQueue,
    isCallingNext,
    fetchTellerQueue,
    callNext,
    completeTicket,
    markNoShow,
  } = useQueueStore();

  const [serviceTimer, setServiceTimer] = useState(0);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Timer for current service
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (tellerQueue?.currentTicket?.servingStartedAt) {
      const startTime = new Date(tellerQueue.currentTicket.servingStartedAt).getTime();

      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setServiceTimer(elapsed);
      }, 1000);
    } else {
      setServiceTimer(0);
    }

    return () => clearInterval(interval);
  }, [tellerQueue?.currentTicket?.servingStartedAt]);

  // Fetch queue and connect to socket
  useEffect(() => {
    if (!branch?.id) return;

    fetchTellerQueue(branch.id);

    connectSocket();
    const socket = getSocket();

    // Join branch room (handles connection timing internally)
    joinBranchRoom(branch.id);

    // Listen for all queue-affecting events to keep display in sync
    const refreshQueue = () => {
      console.log('[TellerDashboard] Socket event received, refreshing queue');
      fetchTellerQueue(branch.id);
    };

    // Re-join room on reconnect to ensure we receive events
    const onConnect = () => {
      console.log('[TellerDashboard] Socket connected/reconnected, joining branch room');
      joinBranchRoom(branch.id);
    };

    socket.on('connect', onConnect);
    socket.on(SOCKET_EVENTS.TICKET_CREATED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_SERVING, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_TRANSFERRED, refreshQueue);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, refreshQueue);

    // If socket is already connected, join room immediately
    if (socket.connected) {
      console.log('[TellerDashboard] Socket already connected, joining branch room');
      joinBranchRoom(branch.id);
    }

    // Polling fallback: refresh every 5 seconds as backup for socket events
    const pollInterval = setInterval(() => {
      fetchTellerQueue(branch.id);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      socket.off('connect', onConnect);
      socket.off(SOCKET_EVENTS.TICKET_CREATED, refreshQueue);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, refreshQueue);
      socket.off(SOCKET_EVENTS.TICKET_SERVING, refreshQueue);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, refreshQueue);
      socket.off(SOCKET_EVENTS.TICKET_NO_SHOW, refreshQueue);
      socket.off(SOCKET_EVENTS.TICKET_TRANSFERRED, refreshQueue);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, refreshQueue);
    };
  }, [branch?.id, fetchTellerQueue]);

  const handleCallNext = async () => {
    if (!tellerQueue?.counter?.id) return;

    setError('');
    try {
      await callNext(tellerQueue.counter.id);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.serverError'));
    }
  };

  const handleComplete = async () => {
    if (!tellerQueue?.currentTicket?.id) return;

    try {
      await completeTicket(tellerQueue.currentTicket.id);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.serverError'));
    }
  };

  const handleNoShow = async () => {
    if (!tellerQueue?.currentTicket?.id) return;

    try {
      await markNoShow(tellerQueue.currentTicket.id);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.serverError'));
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isLoadingTellerQueue && !tellerQueue) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!tellerQueue?.counter) {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
            support_agent
          </span>
          <p className="text-gray-600 text-lg mb-4">
            {t('teller.selectCounterFirst')}
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    );
  }

  const currentTicket = tellerQueue.currentTicket;
  // Use global FIFO queue for "next" ticket - all tellers see the same next customer
  const nextTicket = tellerQueue.globalQueue?.[0] || null;
  // Use global FIFO queue for footer (same for all tellers in branch) - show all tickets
  const queueTickets = tellerQueue.globalQueue || [];
  const totalWaiting = tellerQueue.totalWaitingInBranch ?? tellerQueue.nextTickets.length;

  const currentColors = currentTicket ? getServiceColors(currentTicket.serviceName) : null;
  // nextColors not used in Refined Simplicity style (service shown as text only)
  void nextTicket;

  return (
    <>
      <style>{`
        .teller-container {
          font-family: 'Inter', sans-serif;
        }

        .teller-container * {
          box-sizing: border-box;
        }

        /* MD3 Shadow tokens */
        .shadow-md3-1 {
          box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
        }
        .shadow-md3-2 {
          box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);
        }
      `}</style>

      <div className="teller-container h-screen flex flex-col overflow-hidden bg-white">
        {/* Header - Responsive */}
        <header
          className="flex justify-between items-center px-3 sm:px-6 py-2 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <img src="/uib-logo.png" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
            <span className="text-sm sm:text-lg font-bold" style={{ color: '#1C1B1F' }}>
              Guichet {tellerQueue.counter.number}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-lg sm:text-2xl font-light hidden sm:block" style={{ color: '#1C1B1F' }}>
              {timeString}
            </span>
            <button
              onClick={toggleLanguage}
              className="px-2 sm:px-4 py-1.5 sm:py-2 border rounded-full text-xs sm:text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#CAC4D0', color: '#49454F' }}
            >
              {i18n.language === 'fr' ? 'العربية' : 'Français'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border rounded-full text-xs sm:text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#CAC4D0', color: '#49454F' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
              <span className="hidden sm:inline">{user?.name}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-700 text-center flex-shrink-0">
            {error}
          </div>
        )}

        {/* Main Content - Asymmetric Panels (Refined Simplicity) */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Current Ticket (dominant) */}
          <div
            className="flex-[2] flex flex-col p-4 sm:p-6 lg:p-10 min-h-0 bg-white"
          >
            <div
              className="text-sm font-medium mb-3 sm:mb-4"
              style={{ color: '#1A1A1A' }}
            >
              En service
            </div>

            {currentTicket ? (
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center bg-white"
                style={{
                  border: '1px solid #E5E5E5',
                }}
              >
                {/* Ticket number - Ultra-light typography (Refined Simplicity) */}
                <div
                  className="text-5xl sm:text-6xl lg:text-8xl mb-2 sm:mb-3"
                  style={{ color: '#1A1A1A', lineHeight: 1, fontWeight: 300, letterSpacing: '-0.02em' }}
                >
                  {currentTicket.ticketNumber}
                </div>

                {/* Service indicator - thin horizontal line with name */}
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <span
                    className="block h-0.5 rounded"
                    style={{ width: '40px', background: currentColors?.accent }}
                  />
                  <span className="text-base sm:text-lg text-gray-500 font-normal">
                    {currentTicket.serviceName}
                  </span>
                  <span
                    className="block h-0.5 rounded"
                    style={{ width: '40px', background: currentColors?.accent }}
                  />
                </div>

                {/* Timer - light weight */}
                <div
                  className="text-2xl sm:text-3xl mb-6 sm:mb-10"
                  style={{ color: '#999', fontWeight: 300 }}
                >
                  {formatTimer(serviceTimer)}
                </div>

                {/* Action buttons - Refined Simplicity style */}
                {/* Black complete button, outlined no-show */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={handleComplete}
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 rounded-lg text-white text-sm sm:text-base font-semibold transition-all hover:opacity-90"
                    style={{ background: '#1A1A1A' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                    {t('teller.complete')}
                  </button>
                  <button
                    onClick={handleNoShow}
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-medium border transition-all hover:bg-gray-50"
                    style={{ borderColor: '#1A1A1A', color: '#1A1A1A' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cancel</span>
                    {t('teller.noShow')}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state - Refined */
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center"
                style={{ background: '#FAFAFA', border: '1px solid #E5E5E5' }}
              >
                <span
                  className="material-symbols-outlined mb-3 sm:mb-4"
                  style={{ fontSize: '48px', color: '#DDD' }}
                >
                  hourglass_empty
                </span>
                <p className="text-sm sm:text-base lg:text-lg" style={{ color: '#999' }}>
                  {t('teller.noCurrentTicket')}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Next Ticket (narrower - Refined Simplicity) */}
          <div
            className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8"
            style={{ background: '#F8F8F8', borderLeft: '1px solid #E5E5E5' }}
          >
            <div
              className="text-sm font-medium mb-3 sm:mb-4"
              style={{ color: '#1A1A1A' }}
            >
              Prochain
            </div>

            {nextTicket ? (
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center bg-white"
                style={{ border: '1px solid #E5E5E5' }}
              >
                {/* Ticket number - lighter weight */}
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3"
                  style={{ color: '#1A1A1A', lineHeight: 1, fontWeight: 300, letterSpacing: '-0.02em' }}
                >
                  {nextTicket.ticketNumber}
                </div>

                {/* Service name - simple text */}
                <div className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8">
                  {nextTicket.serviceName}
                </div>

                {/* Call button - SG Red (Refined Simplicity) */}
                <button
                  onClick={handleCallNext}
                  disabled={isCallingNext || !!currentTicket}
                  className="w-full sm:w-auto max-w-xs inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-white text-sm sm:text-base font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: SG_RED }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
                  {isCallingNext ? t('common.loading') : 'Appeler'}
                </button>
              </div>
            ) : (
              /* Empty state - Refined */
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center bg-white"
                style={{ border: '1px solid #E5E5E5' }}
              >
                <span
                  className="material-symbols-outlined mb-3 sm:mb-4"
                  style={{ fontSize: '48px', color: '#DDD' }}
                >
                  groups
                </span>
                <p className="text-sm sm:text-base lg:text-lg" style={{ color: '#999' }}>
                  {t('teller.noTicketsWaiting')}
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Queue Bar at Bottom - Refined */}
        <footer
          className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4 flex-shrink-0"
          style={{ background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
            style={{ color: '#999' }}
          >
            File d'attente
          </span>

          <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
            {queueTickets.length > 0 ? (
              queueTickets.map((ticket, index) => {
                const colors = getServiceColors(ticket.serviceName);
                return (
                  <div key={ticket.id} className="flex items-center gap-2 flex-shrink-0">
                    {index > 0 && (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '16px', color: '#79747E' }}
                      >
                        chevron_right
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#1C1B1F' }}>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: colors.accent }}
                      />
                      {ticket.ticketNumber}
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-sm" style={{ color: '#79747E' }}>
                Aucun ticket en attente
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm flex-shrink-0" style={{ color: '#666' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
            <span>{totalWaiting} en attente</span>
          </div>
        </footer>
      </div>
    </>
  );
}
