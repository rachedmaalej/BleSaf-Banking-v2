import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueueStore } from '@/stores/queueStore';
import {
  getSocket,
  connectSocket,
  joinDisplayRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';

// Material icon names for ranking positions
const RANK_ICONS = ['looks_one', 'looks_two', 'looks_3', 'looks_4', 'looks_5', 'looks_6'];

// Service class names and their Material icons
const SERVICE_CONFIG: Record<string, { className: string; icon: string; label: string }> = {
  Retrait: { className: 'retrait', icon: 'local_atm', label: 'Retrait' },
  'Dépôt': { className: 'depot', icon: 'savings', label: 'Dépôt' },
  'Ouverture de compte': { className: 'ouverture', icon: 'folder_open', label: 'Ouverture' },
  default: { className: 'autres', icon: 'more_horiz', label: 'Autres' },
};

function getServiceConfig(serviceName: string) {
  return SERVICE_CONFIG[serviceName] || SERVICE_CONFIG.default;
}

// Average consultation time for wait estimation (minutes per customer)
const AVG_SERVICE_TIME_MINS = 5;

export default function QueueDisplay() {
  const { branchId } = useParams<{ branchId: string }>();
  const {
    branchStatus,
    isLoadingBranchStatus,
    fetchBranchStatus,
    handleTicketCalled,
    handleTicketCompleted,
    handleQueueUpdated,
  } = useQueueStore();

  const [lastCalledTicket, setLastCalledTicket] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!branchId) return;

    // Fetch initial status
    fetchBranchStatus(branchId);

    // Connect to socket
    connectSocket();
    const socket = getSocket();
    joinDisplayRoom(branchId);

    // Listen for events
    socket.on(SOCKET_EVENTS.TICKET_CALLED, (data) => {
      console.log('📢 TICKET_CALLED received:', data);
      handleTicketCalled(data);
      setLastCalledTicket(data.ticket.ticketNumber);

      // Play chime
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      // Clear highlight after 10 seconds
      setTimeout(() => setLastCalledTicket(null), 10000);
    });

    socket.on(SOCKET_EVENTS.TICKET_COMPLETED, (data) => {
      console.log('✅ TICKET_COMPLETED received:', data);
      handleTicketCompleted(data);
    });

    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, (data) => {
      console.log('🔄 QUEUE_UPDATED received:', data);
      handleQueueUpdated(data);
    });

    socket.on(SOCKET_EVENTS.TICKET_CREATED, (data) => {
      console.log('🎫 TICKET_CREATED received:', data);
      fetchBranchStatus(branchId);
    });

    // Refresh every 30 seconds as backup
    const interval = setInterval(() => {
      fetchBranchStatus(branchId);
    }, 30000);

    return () => {
      socket.off(SOCKET_EVENTS.TICKET_CALLED);
      socket.off(SOCKET_EVENTS.TICKET_COMPLETED);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED);
      socket.off(SOCKET_EVENTS.TICKET_CREATED);
      clearInterval(interval);
    };
  }, [branchId, fetchBranchStatus, handleTicketCalled, handleTicketCompleted, handleQueueUpdated]);

  if (isLoadingBranchStatus && !branchStatus) {
    return (
      <div className="tv-loading">
        <div className="tv-loading-text">Chargement...</div>
      </div>
    );
  }

  if (!branchStatus) {
    return (
      <div className="tv-loading">
        <div className="tv-loading-text">Affichage non trouvé</div>
      </div>
    );
  }

  // Get active counters with current tickets
  const activeCounters = branchStatus.counters
    .filter((c) => c.status === 'open' && c.currentTicket)
    .slice(0, 4); // Max 4 hero cards

  // Use waitingTickets from branchStatus (already sorted by backend: priority DESC, createdAt ASC)
  // This ensures TV display shows the same FIFO order as teller screens
  const waitingQueue = (branchStatus.waitingTickets || []).map((ticket, idx) => ({
    ticketNumber: ticket.ticketNumber,
    serviceName: ticket.serviceName,
    position: idx + 1,
  }));

  // Get first 6 for display
  const visibleQueue = waitingQueue.slice(0, 6);
  const remainingCount = Math.max(0, waitingQueue.length - 6);

  // Calculate next call estimate
  const nextCallEstimateMins = waitingQueue.length > 0 ? AVG_SERVICE_TIME_MINS : 0;

  // Format time as HH:mm
  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Audio chime */}
      <audio ref={audioRef} preload="auto">
        <source src="/chime.mp3" type="audio/mpeg" />
      </audio>

      <style>{`
        /* Reset and base */
        .tv-display * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .tv-display {
          font-family: 'Inter', sans-serif;
          background: #FFFFFF;
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .tv-loading {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5F5F5;
        }

        .tv-loading-text {
          font-size: 24px;
          color: #49454F;
        }

        /* MD3 Design Tokens */
        .tv-display {
          --retrait-bg: #DBECF4;
          --retrait-accent: #0891B2;
          --retrait-text: #164E63;

          --depot-bg: #DEF5B7;
          --depot-accent: #65A30D;
          --depot-text: #365314;

          --ouverture-bg: #FFE9B7;
          --ouverture-accent: #D97706;
          --ouverture-text: #92400E;

          --autres-bg: #E8E8E8;
          --autres-accent: #6B7280;
          --autres-text: #374151;

          --md3-primary: #6750A4;
          --md3-surface: #FFFFFF;
          --md3-surface-variant: #F5F5F5;
          --md3-on-surface: #1C1B1F;
          --md3-on-surface-variant: #49454F;
          --md3-outline: #79747E;
          --md3-outline-variant: #CAC4D0;
          --md3-error: #B3261E;

          --md3-shadow-1: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
          --md3-shadow-2: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);

          --md3-radius-small: 8px;
          --md3-radius-medium: 12px;
          --md3-radius-large: 16px;
          --md3-radius-xl: 28px;

          --queue-gray: #7E7E7E;
        }

        /* Material Icon */
        .material-icon {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        /* Service Colors */
        .retrait { --service-bg: var(--retrait-bg); --service-accent: var(--retrait-accent); --service-text: var(--retrait-text); }
        .depot { --service-bg: var(--depot-bg); --service-accent: var(--depot-accent); --service-text: var(--depot-text); }
        .ouverture { --service-bg: var(--ouverture-bg); --service-accent: var(--ouverture-accent); --service-text: var(--ouverture-text); }
        .autres { --service-bg: var(--autres-bg); --service-accent: var(--autres-accent); --service-text: var(--autres-text); }

        /* Service Tag */
        .service-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: var(--md3-radius-xl);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--service-bg);
          color: var(--service-text);
        }

        .service-tag .material-icon {
          font-size: 16px;
        }

        /* NEW Badge */
        @keyframes new-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .new-badge {
          background: var(--md3-error);
          color: white;
          padding: 4px 10px;
          border-radius: var(--md3-radius-medium);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          animation: new-pulse 1s infinite;
        }

        /* Header */
        .tv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: var(--md3-surface);
          border-bottom: 1px solid var(--md3-outline-variant);
          flex-shrink: 0;
        }

        .tv-header .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tv-header .brand img {
          height: 48px;
          width: auto;
        }

        .tv-header .branch {
          font-size: 13px;
          color: var(--md3-on-surface-variant);
        }

        .tv-header .time-value {
          font-size: 24px;
          font-weight: 300;
          color: var(--md3-on-surface);
        }

        /* Hero Section: 2/3 of vertical space */
        .tv-hero-section {
          flex: 2;
          display: flex;
          flex-direction: column;
          background: var(--md3-surface-variant);
        }

        .tv-hero-counters {
          flex: 1;
          padding: 24px 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          background: var(--md3-surface-variant);
        }

        .tv-hero-card {
          background: var(--md3-surface);
          border-radius: var(--md3-radius-xl);
          padding: 24px 36px;
          text-align: center;
          min-width: 200px;
          position: relative;
          box-shadow: var(--md3-shadow-2);
          border-bottom: 5px solid var(--service-accent);
        }

        .tv-hero-card.is-new {
          box-shadow: var(--md3-shadow-2), 0 0 0 3px var(--md3-error);
        }

        .tv-hero-card .new-badge {
          position: absolute;
          top: -8px;
          right: -8px;
        }

        .tv-hero-card .counter-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--md3-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 4px;
        }

        .tv-hero-card .counter-number {
          font-size: 80px;
          font-weight: 900;
          color: var(--md3-on-surface);
          line-height: 1;
          margin-bottom: 8px;
        }

        .tv-hero-card .ticket-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--service-accent);
          margin-bottom: 12px;
        }

        /* Empty state for hero when no active counters */
        .tv-hero-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-surface-variant);
        }

        .tv-hero-empty .material-icon {
          font-size: 64px;
          opacity: 0.5;
          margin-bottom: 16px;
        }

        .tv-hero-empty-text {
          font-size: 18px;
        }

        /* Queue Section: 1/3 of vertical space */
        .tv-queue-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--md3-surface);
          border-top: 1px solid var(--md3-outline-variant);
        }

        .tv-queue-title {
          padding: 12px 32px 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--md3-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .tv-queue-title .material-icon {
          font-size: 18px;
          color: var(--md3-primary);
        }

        .tv-queue-flow {
          flex: 1;
          padding: 0 32px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          overflow: hidden;
        }

        .tv-queue-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 100px;
        }

        .tv-rank-icon {
          color: var(--queue-gray);
          margin-bottom: 4px;
        }

        .tv-rank-icon .material-icon {
          font-size: 36px;
        }

        .tv-queue-ticket {
          font-size: 16px;
          font-weight: 700;
          color: var(--queue-gray);
          margin-bottom: 4px;
        }

        .tv-queue-details {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tv-queue-service {
          display: flex;
          align-items: center;
          color: var(--service-accent);
        }

        .tv-queue-service .material-icon {
          font-size: 16px;
        }

        .tv-queue-wait {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          color: var(--md3-on-surface-variant);
        }

        .tv-queue-wait .material-icon {
          font-size: 14px;
        }

        .tv-queue-connector {
          color: #D0D0D0;
          display: flex;
          align-items: center;
        }

        .tv-queue-connector .material-icon {
          font-size: 20px;
        }

        .tv-queue-more {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--md3-on-surface-variant);
          min-width: 60px;
        }

        .tv-queue-more .material-icon {
          font-size: 28px;
          color: var(--queue-gray);
        }

        .tv-queue-more span {
          font-size: 12px;
          margin-top: 4px;
        }

        /* Empty queue state */
        .tv-queue-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-surface-variant);
          font-size: 14px;
        }

        .tv-footer {
          padding: 10px 32px;
          text-align: center;
          color: var(--md3-on-surface-variant);
          font-size: 13px;
          background: var(--md3-surface);
          border-top: 1px solid var(--md3-outline-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .tv-footer .material-icon {
          font-size: 16px;
        }

        .tv-footer strong {
          color: var(--md3-on-surface);
          font-weight: 600;
        }
      `}</style>

      <div className="tv-display">
        {/* Header */}
        <header className="tv-header">
          <div className="brand">
            <img src="/uib-logo.jpg" alt="UIB" />
            <span className="branch">{branchStatus.branchName}</span>
          </div>
          <div className="time-value">{timeString}</div>
        </header>

        {/* Hero Section: 2/3 of vertical space */}
        <div className="tv-hero-section">
          <div className="tv-hero-counters">
            {activeCounters.length > 0 ? (
              activeCounters.map((counter) => {
                const serviceConfig = getServiceConfig(counter.currentTicket!.serviceName);
                const isNew = counter.currentTicket!.ticketNumber === lastCalledTicket;

                return (
                  <div
                    key={counter.id}
                    className={`tv-hero-card ${serviceConfig.className} ${isNew ? 'is-new' : ''}`}
                  >
                    {isNew && <span className="new-badge">NEW</span>}
                    <div className="counter-label">Guichet</div>
                    <div className="counter-number">{counter.number}</div>
                    <div className="ticket-number">{counter.currentTicket!.ticketNumber}</div>
                    <span className={`service-tag ${serviceConfig.className}`}>
                      <span className="material-icon">{serviceConfig.icon}</span>
                      {serviceConfig.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="tv-hero-empty">
                <span className="material-icon">hourglass_empty</span>
                <div className="tv-hero-empty-text">En attente d'appels</div>
              </div>
            )}
          </div>
        </div>

        {/* Queue Section: 1/3 of vertical space */}
        <div className="tv-queue-section">
          <div className="tv-queue-title">
            <span className="material-icon">schedule</span>
            Prochains en file
          </div>

          {visibleQueue.length > 0 ? (
            <div className="tv-queue-flow">
              {visibleQueue.map((item, index) => {
                const serviceConfig = getServiceConfig(item.serviceName);
                const waitMins = (index + 1) * AVG_SERVICE_TIME_MINS;
                const rankIcon = RANK_ICONS[index] || 'more_horiz';

                return (
                  <div key={item.ticketNumber} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {index > 0 && (
                      <div className="tv-queue-connector">
                        <span className="material-icon">chevron_right</span>
                      </div>
                    )}
                    <div className={`tv-queue-item ${serviceConfig.className}`}>
                      <div className="tv-rank-icon">
                        <span className="material-icon">{rankIcon}</span>
                      </div>
                      <div className="tv-queue-ticket">{item.ticketNumber}</div>
                      <div className="tv-queue-details">
                        <div className="tv-queue-service">
                          <span className="material-icon">{serviceConfig.icon}</span>
                        </div>
                        <div className="tv-queue-wait">
                          <span className="material-icon">schedule</span>
                          {waitMins} min
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {remainingCount > 0 && (
                <>
                  <div className="tv-queue-connector">
                    <span className="material-icon">chevron_right</span>
                  </div>
                  <div className="tv-queue-more">
                    <span className="material-icon">more_horiz</span>
                    <span>+{remainingCount}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="tv-queue-empty">Aucun client en attente</div>
          )}

          <div className="tv-footer">
            <span className="material-icon">groups</span>
            <strong>{branchStatus.stats.totalWaiting}</strong> personnes · Prochain:{' '}
            <strong>~{nextCallEstimateMins} min</strong>
          </div>
        </div>
      </div>
    </>
  );
}
