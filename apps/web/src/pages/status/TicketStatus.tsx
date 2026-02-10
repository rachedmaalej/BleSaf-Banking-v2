import { useState, useEffect, useRef } from 'react';
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
import {
  vibrate,
  stopVibration,
  canVibrate,
  playChime,
  playUrgentChime,
  VIBRATE_APPROACHING,
  VIBRATE_CALLED,
} from '@/lib/notifications';

// SG Brand colors
const SG_RED = '#E9041E';

type Urgency = 'normal' | 'approaching' | 'imminent' | 'called';

function getUrgency(status: string, position: number): Urgency {
  if (status === 'called' || status === 'serving') return 'called';
  if (status !== 'waiting') return 'normal';
  if (position <= 2) return 'imminent';
  if (position <= 5) return 'approaching';
  return 'normal';
}

export default function TicketStatus() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, i18n } = useTranslation();
  const {
    ticketPosition,
    isLoadingTicketPosition,
    fetchTicketPosition,
  } = useQueueStore();

  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const previousUrgency = useRef<Urgency>('normal');
  const hasInteracted = useRef(false);

  const isAr = i18n.language === 'ar';

  // Track user interaction for autoplay policy
  useEffect(() => {
    const markInteracted = () => { hasInteracted.current = true; };
    window.addEventListener('click', markInteracted, { once: true });
    window.addEventListener('touchstart', markInteracted, { once: true });
    return () => {
      window.removeEventListener('click', markInteracted);
      window.removeEventListener('touchstart', markInteracted);
    };
  }, []);

  // Load Material Symbols font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Trigger vibration/sound on urgency transitions
  useEffect(() => {
    if (!ticketPosition) return;

    const urgency = getUrgency(ticketPosition.status, ticketPosition.position);
    const prev = previousUrgency.current;

    if (urgency !== prev) {
      // Only trigger on escalation (not when going back to normal)
      if (urgency === 'approaching' && prev === 'normal') {
        vibrate(VIBRATE_APPROACHING);
        if (hasInteracted.current) playChime();
      } else if (urgency === 'imminent' && (prev === 'normal' || prev === 'approaching')) {
        vibrate(VIBRATE_CALLED);
        if (hasInteracted.current) playUrgentChime();
      } else if (urgency === 'called') {
        vibrate(VIBRATE_CALLED);
        if (hasInteracted.current) playUrgentChime();
      }
      previousUrgency.current = urgency;
    }

    setLastUpdateTime(new Date());
  }, [ticketPosition]);

  // Socket + polling
  useEffect(() => {
    if (!ticketId) return;

    fetchTicketPosition(ticketId).catch(() => {
      setError(t('errors.notFound'));
    });

    connectSocket();
    const socket = getSocket();
    joinTicketRoom(ticketId);

    const refreshPosition = () => {
      fetchTicketPosition(ticketId);
    };

    const onConnect = () => {
      setConnectionStatus('connected');
      joinTicketRoom(ticketId);
      refreshPosition();
    };

    const onDisconnect = () => {
      setConnectionStatus('reconnecting');
    };

    const onReconnectFailed = () => {
      setConnectionStatus('disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_failed', onReconnectFailed);
    socket.on(SOCKET_EVENTS.TICKET_CALLED, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_SERVING, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_NO_SHOW, refreshPosition);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, refreshPosition);
    socket.on(SOCKET_EVENTS.TICKET_POSITION_UPDATED, refreshPosition);

    // Polling fallback
    const interval = setInterval(() => {
      fetchTicketPosition(ticketId);
    }, 5000);

    return () => {
      leaveTicketRoom(ticketId);
      clearInterval(interval);
      stopVibration();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_failed', onReconnectFailed);
      socket.off(SOCKET_EVENTS.TICKET_CALLED, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_SERVING, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_NO_SHOW, refreshPosition);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, refreshPosition);
      socket.off(SOCKET_EVENTS.TICKET_POSITION_UPDATED, refreshPosition);
    };
  }, [ticketId, fetchTicketPosition, t]);

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'fr' : 'ar');
  };

  // ── Loading ──
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

  // ── Error ──
  if (error || !ticketPosition) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <span className="material-symbols-outlined mb-4 block" style={{ fontSize: '64px', color: '#DDD' }}>
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

  const urgency = getUrgency(ticketPosition.status, ticketPosition.position);
  const isYourTurn = ticketPosition.status === 'called' || ticketPosition.status === 'serving';
  const isDone =
    ticketPosition.status === 'completed' ||
    ticketPosition.status === 'no_show' ||
    ticketPosition.status === 'cancelled';
  const isWaiting = ticketPosition.status === 'waiting';
  const isNoShow = ticketPosition.status === 'no_show';

  // Progressive backgrounds
  const getBackground = () => {
    if (isYourTurn) return SG_RED;
    if (isDone) return '#F5F5F5';
    if (urgency === 'imminent') return '#FEE2E2';
    if (urgency === 'approaching') return '#FEF3C7';
    return '#FAFAFA';
  };

  const getCardBorder = () => {
    if (urgency === 'imminent') return `2px solid ${SG_RED}`;
    if (urgency === 'approaching') return '2px solid #F59E0B';
    return '1px solid #E5E5E5';
  };

  // Minutes since last update
  const minutesSinceUpdate = Math.floor((Date.now() - lastUpdateTime.getTime()) / 60000);

  return (
    <>
      <style>{`
        .status-page { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .status-page * { box-sizing: border-box; }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }
        .pulse-animation { animation: pulse-ring 2s ease-in-out infinite; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease-out both; }
      `}</style>

      <div
        className="status-page min-h-screen flex flex-col transition-colors duration-700"
        style={{ background: getBackground() }}
        onClick={() => {
          // Stop vibration on tap when called
          if (isYourTurn && canVibrate()) stopVibration();
        }}
      >
        {/* Header */}
        <header
          className="flex justify-between items-center px-4 py-3"
          style={{
            background: isYourTurn ? 'transparent' : 'white',
            borderBottom: isYourTurn ? 'none' : '1px solid #E5E5E5',
          }}
        >
          <img
            src="/uib-logo.png"
            alt="UIB"
            className="h-8 w-auto"
            style={{ filter: isYourTurn ? 'brightness(0) invert(1)' : 'none' }}
          />
          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className="block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: connectionStatus === 'connected'
                    ? '#10B981'
                    : connectionStatus === 'reconnecting'
                      ? '#F59E0B'
                      : '#9CA3AF',
                  animation: connectionStatus === 'connected' ? 'pulse-ring 3s ease-in-out infinite' : 'none',
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: isYourTurn ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                }}
              >
                {connectionStatus === 'connected'
                  ? (isAr ? 'مباشر' : 'En direct')
                  : connectionStatus === 'reconnecting'
                    ? (isAr ? 'إعادة الاتصال...' : 'Reconnexion...')
                    : (isAr ? `آخر تحديث ${minutesSinceUpdate} د` : `Mis à jour il y a ${minutesSinceUpdate} min`)}
              </span>
            </div>

            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: isYourTurn ? 'rgba(255,255,255,0.2)' : '#F5F5F5',
                color: isYourTurn ? 'white' : '#666',
              }}
            >
              {isAr ? 'Français' : 'العربية'}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          {/* ═══ CALLED — Full-screen takeover ═══ */}
          {isYourTurn && (
            <div className="text-center text-white fade-in">
              <span
                className="material-symbols-outlined mb-4 pulse-animation"
                style={{ fontSize: '72px' }}
              >
                notifications_active
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                {isAr ? '!حان دورك' : "C'EST VOTRE TOUR\u00A0!"}
              </h1>
              <div className="text-7xl sm:text-8xl font-light mb-2" style={{ letterSpacing: '-0.03em' }}>
                {ticketPosition.ticketNumber}
              </div>
              {ticketPosition.counterNumber && (
                <div className="mt-6">
                  <p className="text-lg opacity-80 mb-2">
                    {isAr ? 'توجه إلى' : 'Présentez-vous au'}
                  </p>
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                      arrow_forward
                    </span>
                    <span className="text-5xl font-bold">
                      {isAr ? `الشباك ${ticketPosition.counterNumber}` : `GUICHET ${ticketPosition.counterNumber}`}
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-6 text-sm opacity-60">
                {isAr ? 'اضغط على الشاشة لإيقاف الاهتزاز' : "Appuyez sur l'écran pour arrêter la vibration"}
              </p>
            </div>
          )}

          {/* ═══ WAITING — Progressive engagement ═══ */}
          {isWaiting && (
            <div
              className="w-full max-w-sm rounded-2xl overflow-hidden fade-in"
              style={{
                background: 'white',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                border: getCardBorder(),
              }}
            >
              {/* Urgency banner */}
              {urgency !== 'normal' && (
                <div
                  className="py-3 px-4 text-center"
                  style={{
                    background: urgency === 'imminent' ? '#FEE2E2' : '#FEF3C7',
                    color: urgency === 'imminent' ? '#991B1B' : '#92400E',
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {urgency === 'imminent' ? 'priority_high' : 'schedule'}
                    </span>
                    <span className="text-sm font-semibold">
                      {urgency === 'imminent'
                        ? (isAr ? 'حان دورك تقريباً! توجه نحو الشباك.' : 'C\'est presque votre tour\u00A0! Dirigez-vous vers le guichet.')
                        : (isAr ? 'استعد — دورك يقترب.' : 'Préparez-vous — votre tour approche.')}
                    </span>
                  </div>
                </div>
              )}

              {/* Ticket Number */}
              <div className="p-6 text-center">
                <div
                  className="text-6xl sm:text-7xl mb-2"
                  style={{
                    color: urgency === 'imminent' ? SG_RED : '#1A1A1A',
                    fontWeight: urgency === 'imminent' ? 400 : 300,
                    lineHeight: 1,
                  }}
                >
                  {ticketPosition.ticketNumber}
                </div>

                {/* Service indicator */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="block h-0.5 w-8 rounded" style={{ background: '#E5E5E5' }} />
                  <span className="text-sm text-gray-500">{ticketPosition.serviceName}</span>
                  <span className="block h-0.5 w-8 rounded" style={{ background: '#E5E5E5' }} />
                </div>

                {/* Position */}
                <div className="mb-6">
                  <div
                    className="text-5xl font-bold mb-1"
                    style={{ color: urgency === 'imminent' ? SG_RED : urgency === 'approaching' ? '#D97706' : '#1A1A1A' }}
                  >
                    #{ticketPosition.position}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isAr
                      ? `${ticketPosition.position - 1} أشخاص قبلك`
                      : `${ticketPosition.position - 1} personne${ticketPosition.position - 1 > 1 ? 's' : ''} avant vous`}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl p-4" style={{ background: '#F8F8F8' }}>
                    <div className="text-2xl font-semibold text-gray-900">
                      ~{ticketPosition.estimatedWaitMins}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('common.minutes')}
                    </div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: '#F8F8F8' }}>
                    <div className="text-2xl font-semibold text-gray-900">
                      {ticketPosition.position - 1}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isAr ? 'في الانتظار' : 'en attente'}
                    </div>
                  </div>
                </div>

                {/* Reassurance message */}
                {urgency === 'normal' && (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {isAr
                      ? 'يمكنك الانشغال بأمورك — سنُعلمك.'
                      : 'Vous pouvez vaquer à vos occupations — nous vous préviendrons.'}
                  </p>
                )}
              </div>

              {/* Branch Info Footer */}
              <div className="px-6 py-4" style={{ background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                  {ticketPosition.branchName}
                </div>
              </div>
            </div>
          )}

          {/* ═══ COMPLETED ═══ */}
          {ticketPosition.status === 'completed' && (
            <div className="text-center fade-in">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#D1FAE5' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#10B981' }}>
                  check_circle
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {isAr ? 'شكراً لزيارتكم!' : 'Merci pour votre visite\u00A0!'}
              </h2>
              <p className="text-sm text-gray-500">
                {ticketPosition.ticketNumber} — {ticketPosition.branchName}
              </p>
            </div>
          )}

          {/* ═══ NO SHOW ═══ */}
          {isNoShow && (
            <div className="w-full max-w-sm text-center fade-in">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#FEF3C7' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#F59E0B' }}>
                  person_off
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {isAr ? 'تم استدعاء رقمك' : 'Votre numéro a été appelé'}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {isAr
                  ? 'تم استدعاء رقمك ولم تكن حاضراً. يرجى التوجه إلى الاستقبال لاستعادة مكانك.'
                  : 'Votre numéro a été appelé mais vous n\'étiez pas présent. Veuillez vous présenter à l\'accueil.'}
              </p>
              <p className="text-sm text-gray-500">
                {ticketPosition.ticketNumber} — {ticketPosition.branchName}
              </p>
            </div>
          )}

          {/* ═══ CANCELLED ═══ */}
          {ticketPosition.status === 'cancelled' && (
            <div className="text-center fade-in">
              <span className="material-symbols-outlined mb-4 block" style={{ fontSize: '64px', color: '#EF4444' }}>
                cancel
              </span>
              <h2 className="text-lg font-semibold text-gray-700">
                {isAr ? 'تم إلغاء التذكرة' : 'Ticket annulé'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {ticketPosition.ticketNumber} — {ticketPosition.branchName}
              </p>
            </div>
          )}
        </main>

        {/* Refresh Indicator */}
        {isLoadingTicketPosition && ticketPosition && (
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
