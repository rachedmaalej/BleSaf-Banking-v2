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
  'Retrait': 'local_atm',
  'Dépôt': 'savings',
  'Ouverture de compte': 'folder_open',
  'Autres': 'more_horiz',
};

// Service color classes
const SERVICE_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  'Retrait': { bg: '#DBECF4', accent: '#0891B2', text: '#164E63' },
  'Dépôt': { bg: '#DEF5B7', accent: '#65A30D', text: '#365314' },
  'Ouverture de compte': { bg: '#FFE9B7', accent: '#D97706', text: '#92400E' },
  'Autres': { bg: '#E8E8E8', accent: '#6B7280', text: '#374151' },
};

const getServiceColors = (serviceName: string) => {
  return SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];
};

const getServiceIcon = (serviceName: string) => {
  return SERVICE_ICONS[serviceName] || SERVICE_ICONS['Autres'];
};

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
    joinBranchRoom(branch.id);

    // Listen for all queue-affecting events to keep display in sync
    const refreshQueue = () => fetchTellerQueue(branch.id);

    socket.on(SOCKET_EVENTS.TICKET_CREATED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_SERVING, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, refreshQueue);
    socket.on(SOCKET_EVENTS.TICKET_TRANSFERRED, refreshQueue);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, refreshQueue);

    return () => {
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
  const nextTicket = tellerQueue.nextTickets[0];
  // Use global FIFO queue for footer (same for all tellers in branch)
  const queueTickets = tellerQueue.globalQueue?.slice(0, 6) || [];
  const totalWaiting = tellerQueue.totalWaitingInBranch ?? tellerQueue.nextTickets.length;

  const currentColors = currentTicket ? getServiceColors(currentTicket.serviceName) : null;
  const nextColors = nextTicket ? getServiceColors(nextTicket.serviceName) : null;

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
            <img src="/uib-logo.jpg" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
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

        {/* Main Content - Split Panels (stack on mobile) */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Current Ticket */}
          <div
            className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6 min-h-0"
            style={{ borderRight: '1px solid #CAC4D0', borderBottom: '1px solid #CAC4D0' }}
          >
            <div
              className="text-xs font-medium uppercase tracking-wider mb-2 sm:mb-4 flex items-center gap-2"
              style={{ color: '#49454F' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6750A4' }}>
                radio_button_checked
              </span>
              En service
            </div>

            {currentTicket ? (
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl shadow-md3-2 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center"
                style={{
                  background: 'white',
                  borderBottom: `5px solid ${currentColors?.accent}`,
                }}
              >
                {/* Status badge with timer */}
                <div
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-6"
                  style={{
                    background: currentTicket.status === 'serving' ? '#DCFCE7' : '#FEF3C7',
                    color: currentTicket.status === 'serving' ? '#166534' : '#92400E',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    timer
                  </span>
                  {formatTimer(serviceTimer)}
                </div>

                {/* Ticket number */}
                <div
                  className="text-4xl sm:text-5xl lg:text-7xl font-black mb-2 sm:mb-4"
                  style={{ color: '#1C1B1F', lineHeight: 1 }}
                >
                  {currentTicket.ticketNumber}
                </div>

                {/* Service tag */}
                <div
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-8"
                  style={{
                    background: currentColors?.bg,
                    color: currentColors?.text,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: currentColors?.accent }}
                  >
                    {getServiceIcon(currentTicket.serviceName)}
                  </span>
                  {currentTicket.serviceName}
                </div>

                {/* Action buttons - shown immediately when ticket is serving */}
                {/* (No "Start Service" step - calling next auto-starts service) */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleComplete}
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-white text-sm sm:text-base font-semibold shadow-md3-1 transition-all hover:shadow-md3-2"
                    style={{ background: '#22C55E' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                    {t('teller.complete')}
                  </button>
                  <button
                    onClick={handleNoShow}
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold border-2 transition-all hover:bg-gray-50"
                    style={{ borderColor: '#CAC4D0', color: '#49454F' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cancel</span>
                    {t('teller.noShow')}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl shadow-md3-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center"
                style={{ background: '#F5F5F5', borderBottom: '5px solid #CAC4D0' }}
              >
                <span
                  className="material-symbols-outlined mb-3 sm:mb-4"
                  style={{ fontSize: '48px', color: '#CAC4D0' }}
                >
                  hourglass_empty
                </span>
                <p className="text-sm sm:text-base lg:text-lg" style={{ color: '#49454F' }}>
                  {t('teller.noCurrentTicket')}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Next Ticket */}
          <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6" style={{ background: '#F5F5F5' }}>
            <div
              className="text-xs font-medium uppercase tracking-wider mb-2 sm:mb-4 flex items-center gap-2"
              style={{ color: '#49454F' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6750A4' }}>
                schedule
              </span>
              Prochain
            </div>

            {nextTicket ? (
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl shadow-md3-2 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center bg-white"
                style={{ borderBottom: `5px solid ${nextColors?.accent}` }}
              >
                {/* Position badge */}
                <div
                  className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs font-medium mb-3 sm:mb-6"
                  style={{ background: '#F5F5F5', color: '#49454F' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    looks_one
                  </span>
                  #1 dans la file
                </div>

                {/* Ticket number */}
                <div
                  className="text-3xl sm:text-4xl lg:text-6xl font-black mb-2 sm:mb-4"
                  style={{ color: '#1C1B1F', lineHeight: 1 }}
                >
                  {nextTicket.ticketNumber}
                </div>

                {/* Service tag */}
                <div
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-8"
                  style={{
                    background: nextColors?.bg,
                    color: nextColors?.text,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '16px', color: nextColors?.accent }}
                  >
                    {getServiceIcon(nextTicket.serviceName)}
                  </span>
                  {nextTicket.serviceName}
                </div>

                {/* Call button */}
                <button
                  onClick={handleCallNext}
                  disabled={isCallingNext || !!currentTicket}
                  className="w-full sm:w-auto max-w-xs inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white text-sm sm:text-base font-semibold shadow-md3-1 transition-all hover:shadow-md3-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#6750A4' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
                  {isCallingNext ? t('common.loading') : 'Appeler'}
                </button>
              </div>
            ) : (
              /* Empty state */
              <div
                className="flex-1 rounded-2xl sm:rounded-3xl shadow-md3-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center bg-white"
                style={{ borderBottom: '5px solid #CAC4D0' }}
              >
                <span
                  className="material-symbols-outlined mb-3 sm:mb-4"
                  style={{ fontSize: '48px', color: '#CAC4D0' }}
                >
                  groups
                </span>
                <p className="text-sm sm:text-base lg:text-lg" style={{ color: '#49454F' }}>
                  {t('teller.noTicketsWaiting')}
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Queue Bar at Bottom */}
        <footer
          className="px-3 sm:px-6 py-2 sm:py-4 bg-white flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <span
              className="text-xs font-medium uppercase tracking-wider flex-shrink-0"
              style={{ color: '#49454F' }}
            >
              File:
            </span>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {queueTickets.length > 0 ? (
                queueTickets.map((ticket, index) => {
                  const colors = getServiceColors(ticket.serviceName);
                  // Hide tickets beyond index 2 on small screens (show first 3)
                  const hiddenOnMobile = index > 2 ? 'hidden sm:flex' : 'flex';
                  return (
                    <div key={ticket.id} className={`${hiddenOnMobile} items-center gap-1 sm:gap-2 flex-shrink-0`}>
                      {index > 0 && (
                        <span
                          className="material-symbols-outlined hidden sm:inline"
                          style={{ fontSize: '16px', color: '#79747E' }}
                        >
                          chevron_right
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: '#1C1B1F' }}>
                        <span
                          className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full"
                          style={{ background: colors.accent }}
                        />
                        {ticket.ticketNumber}
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs sm:text-sm" style={{ color: '#79747E' }}>
                  Aucun ticket en attente
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0" style={{ color: '#49454F' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
            <span className="hidden sm:inline">{totalWaiting} {totalWaiting === 1 ? 'personne' : 'personnes'} en attente</span>
            <span className="sm:hidden">{totalWaiting}</span>
          </div>
        </footer>
      </div>
    </>
  );
}
