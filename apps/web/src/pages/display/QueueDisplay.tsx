import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQueueStore } from '@/stores/queueStore';
import {
  getSocket,
  connectSocket,
  joinDisplayRoom,
  SOCKET_EVENTS,
} from '@/lib/socket';
import { AnnouncementBanner } from '@/components/display/AnnouncementBanner';

interface Announcement {
  id: string;
  message: string;
  messageAr?: string;
  priority: 'normal' | 'urgent';
  enableTts: boolean;
  displayDuration: number;
  createdBy: string;
  createdAt: string;
}

// Service class names, icons, and SHORT labels for TV display
// Labels should be short (max 8 chars) to fit in queue cards
const SERVICE_CONFIG: Record<string, { className: string; icon: string; label: string }> = {
  // Core banking services
  "Retrait d'espèces": { className: 'retrait', icon: 'local_atm', label: 'Retrait' },
  "Dépôt d'espèces": { className: 'depot', icon: 'payments', label: 'Dépôt' },
  'Relevés de compte': { className: 'releves', icon: 'receipt_long', label: 'Relevés' },
  'Virement': { className: 'virement', icon: 'swap_horiz', label: 'Virement' },
  // Card services
  'Retrait de carte bancaire': { className: 'carte', icon: 'credit_card', label: 'Carte' },
  // Foreign exchange
  'Change de devises': { className: 'change', icon: 'currency_exchange', label: 'Change' },
  'Change': { className: 'change', icon: 'currency_exchange', label: 'Change' },
  // Account services
  'Ouverture de compte': { className: 'compte', icon: 'person_add', label: 'Compte' },
  // Credit / Loans
  'Crédit': { className: 'credit', icon: 'account_balance', label: 'Crédit' },
  'Credit': { className: 'credit', icon: 'account_balance', label: 'Crédit' },
  'Prêts': { className: 'credit', icon: 'account_balance', label: 'Prêts' },
  // Other / Catch-all
  'Autres': { className: 'autres', icon: 'more_horiz', label: 'Autres' },
};

function getServiceConfig(serviceName: string) {
  return SERVICE_CONFIG[serviceName] || { className: 'autres', icon: 'help_outline', label: serviceName.split(' ')[0].slice(0, 8) };
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
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [queueStatus, setQueueStatus] = useState<'open' | 'paused' | 'closed'>('open');
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle announcement visibility change for push effect
  const handleAnnouncementVisibilityChange = useCallback((visible: boolean) => {
    setIsAnnouncementVisible(visible);
  }, []);

  // Handle announcement dismissal
  const handleAnnouncementDismiss = useCallback(() => {
    setActiveAnnouncement(null);
  }, []);

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

    // Listen for announcements
    socket.on(SOCKET_EVENTS.ANNOUNCEMENT_CREATED, (data) => {
      console.log('📢 ANNOUNCEMENT_CREATED received:', data);
      setActiveAnnouncement(data.announcement);
    });

    socket.on(SOCKET_EVENTS.ANNOUNCEMENT_DISMISSED, (data) => {
      console.log('🚫 ANNOUNCEMENT_DISMISSED received:', data);
      setActiveAnnouncement((current) =>
        current?.id === data.announcementId ? null : current
      );
    });

    // Queue status events
    socket.on(SOCKET_EVENTS.QUEUE_PAUSED, () => {
      console.log('⏸️ QUEUE_PAUSED received');
      setQueueStatus('paused');
    });

    socket.on(SOCKET_EVENTS.QUEUE_RESUMED, () => {
      console.log('▶️ QUEUE_RESUMED received');
      setQueueStatus('open');
    });

    socket.on(SOCKET_EVENTS.QUEUE_AUTO_CLOSED, () => {
      console.log('🔒 QUEUE_AUTO_CLOSED received');
      setQueueStatus('closed');
    });

    socket.on(SOCKET_EVENTS.QUEUE_AUTO_OPENED, () => {
      console.log('🔓 QUEUE_AUTO_OPENED received');
      setQueueStatus('open');
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
      socket.off(SOCKET_EVENTS.ANNOUNCEMENT_CREATED);
      socket.off(SOCKET_EVENTS.ANNOUNCEMENT_DISMISSED);
      socket.off(SOCKET_EVENTS.QUEUE_PAUSED);
      socket.off(SOCKET_EVENTS.QUEUE_RESUMED);
      socket.off(SOCKET_EVENTS.QUEUE_AUTO_CLOSED);
      socket.off(SOCKET_EVENTS.QUEUE_AUTO_OPENED);
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
  const waitingQueue = (branchStatus.waitingTickets || []).map((ticket: any, idx: number) => ({
    ticketNumber: ticket.ticketNumber,
    serviceName: ticket.serviceName,
    position: idx + 1,
    estimatedWaitMins: ticket.estimatedWaitMins,
    priority: ticket.priority || 'normal', // Include priority for VIP indication
  }));

  // Get first 8 for display
  const visibleQueue = waitingQueue.slice(0, 8);
  const remainingCount = Math.max(0, waitingQueue.length - 8);

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

        /* MD3 Design Tokens - SG Brand Colors */
        .tv-display {
          /* Retrait d'espèces: SG Red */
          --retrait-bg: #FDECEE;
          --retrait-accent: #E9041E;
          --retrait-text: #E9041E;

          /* Relevés de compte: Black */
          --releves-bg: #F5F5F5;
          --releves-accent: #1A1A1A;
          --releves-text: #1A1A1A;

          /* Dépôt d'espèces: Rose */
          --depot-bg: #FCE8EB;
          --depot-accent: #D66874;
          --depot-text: #D66874;

          /* Autres: Gray */
          --autres-bg: #F9FAFB;
          --autres-accent: #666666;
          --autres-text: #666666;

          --md3-primary: #E9041E;
          --md3-surface: #FFFFFF;
          --md3-surface-variant: #F5F5F5;
          --md3-on-surface: #1C1B1F;
          --md3-on-surface-variant: #49454F;
          --md3-outline: #79747E;
          --md3-outline-variant: #CAC4D0;
          --md3-error: #E9041E;

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
        .releves { --service-bg: var(--releves-bg); --service-accent: var(--releves-accent); --service-text: var(--releves-text); }
        .depot { --service-bg: var(--depot-bg); --service-accent: var(--depot-accent); --service-text: var(--depot-text); }
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
          flex-direction: row;
          background: var(--md3-surface-variant);
          overflow: hidden;
        }

        .tv-hero-counters {
          flex: 1;
          padding: 24px 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          background: var(--md3-surface-variant);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* When announcement is visible, counters area shrinks */
        .tv-hero-counters.with-announcement {
          padding-right: 16px;
        }

        .tv-hero-card {
          background: var(--md3-surface);
          border-radius: var(--md3-radius-xl);
          padding: 24px 36px;
          text-align: center;
          min-width: 200px;
          position: relative;
          box-shadow: var(--md3-shadow-2);
          border-bottom: 4px solid var(--service-accent);
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
          font-weight: 300;
          color: var(--md3-on-surface);
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .tv-hero-card .ticket-number {
          font-size: 48px;
          font-weight: 300;
          color: var(--service-accent);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
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

        /* Queue Section: 1/3 of vertical space - Large Hero Cards Design */
        .tv-queue-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--md3-surface); /* White background to contrast with grey hero */
          border-top: 1px solid var(--md3-outline-variant);
        }

        .tv-queue-header {
          padding: 12px 24px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .tv-queue-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--md3-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tv-queue-title .material-icon {
          font-size: 18px;
          color: var(--md3-primary);
        }

        .tv-queue-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          color: var(--md3-on-surface-variant);
        }

        .tv-queue-stats .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tv-queue-stats .material-icon {
          font-size: 16px;
        }

        .tv-queue-stats strong {
          color: var(--md3-on-surface);
          font-weight: 600;
        }

        /* Hero Cards Grid */
        .tv-queue-cards {
          flex: 1;
          padding: 0 24px 16px;
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 12px;
          overflow: hidden;
        }

        /* Individual Queue Card */
        .tv-queue-card {
          flex: 1;
          max-width: 140px;
          background: var(--md3-surface);
          border-radius: var(--md3-radius-medium);
          padding: 12px 14px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--md3-shadow-1);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--md3-outline-variant);
        }

        /* Top accent border */
        .tv-queue-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--service-accent);
        }

        /* First card highlight */
        .tv-queue-card:first-child {
          box-shadow: var(--md3-shadow-2);
          border-color: var(--service-accent);
        }

        .tv-queue-card:first-child::before {
          height: 5px;
        }

        /* Position label */
        .tv-queue-position {
          font-size: 10px;
          font-weight: 500;
          color: var(--md3-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          margin-top: 2px;
          display: flex;
          align-items: center;
        }

        /* Ticket number - hero element */
        .tv-queue-ticket {
          font-size: 22px;
          font-weight: 600;
          color: var(--service-accent);
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          line-height: 1;
        }

        /* Card footer with service + wait */
        .tv-queue-card-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .tv-queue-service-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          background: var(--service-bg);
          color: var(--service-text);
          flex-shrink: 0;
        }

        /* Service name label - more useful than icon */
        .tv-queue-service-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--md3-on-surface-variant);
          text-transform: capitalize;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70px;
        }

        /* VIP badge in position */
        .vip-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 6px;
          padding: 1px 5px;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          color: white;
          font-size: 8px;
          font-weight: 700;
          border-radius: 3px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          vertical-align: middle;
        }

        /* VIP card styling */
        .tv-queue-card.is-vip {
          border-color: #F59E0B;
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3), var(--md3-shadow-2);
        }

        .tv-queue-card.is-vip::before {
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
          height: 5px;
        }

        .tv-queue-service-tag .material-icon {
          font-size: 10px;
        }

        .tv-queue-wait {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          color: var(--md3-on-surface-variant);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tv-queue-wait .material-icon {
          font-size: 10px;
        }

        /* More indicator card */
        .tv-queue-more-card {
          flex: 0 0 60px;
          background: transparent;
          border: 2px dashed var(--md3-outline-variant);
          border-radius: var(--md3-radius-medium);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-surface-variant);
        }

        .tv-queue-more-card .material-icon {
          font-size: 20px;
          margin-bottom: 2px;
        }

        .tv-queue-more-card .more-count {
          font-size: 12px;
          font-weight: 600;
        }

        /* Empty queue state */
        .tv-queue-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-surface-variant);
          gap: 8px;
        }

        .tv-queue-empty .material-icon {
          font-size: 40px;
          opacity: 0.5;
        }

        .tv-queue-empty-text {
          font-size: 14px;
        }

        /* Status Overlay (Closed/Paused) */
        .tv-status-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 26, 26, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          color: white;
        }

        .tv-status-icon {
          font-size: 120px;
          margin-bottom: 24px;
          opacity: 0.9;
        }

        .tv-status-icon.closed {
          color: #E9041E;
        }

        .tv-status-icon.paused {
          color: #F59E0B;
        }

        .tv-status-title {
          font-size: 64px;
          font-weight: 300;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .tv-status-subtitle {
          font-size: 24px;
          opacity: 0.7;
          font-weight: 300;
        }

        .tv-status-time {
          position: absolute;
          bottom: 40px;
          font-size: 20px;
          opacity: 0.5;
        }
      `}</style>

      <div className="tv-display">
        {/* Header */}
        <header className="tv-header">
          <div className="brand">
            <img src="/uib-logo.png" alt="UIB" />
            <span className="branch">{branchStatus.branchName}</span>
          </div>
          <div className="time-value">{timeString}</div>
        </header>

        {/* Hero Section: 2/3 of vertical space */}
        <div className="tv-hero-section">
          <div className={`tv-hero-counters ${isAnnouncementVisible ? 'with-announcement' : ''}`}>
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

          {/* Slide-right Announcement Banner - inline in hero section */}
          {activeAnnouncement && (
            <AnnouncementBanner
              announcement={activeAnnouncement}
              language="fr"
              onDismiss={handleAnnouncementDismiss}
              onVisibilityChange={handleAnnouncementVisibilityChange}
              variant="right"
            />
          )}
        </div>

        {/* Queue Section: 1/3 of vertical space - Large Hero Cards */}
        <div className="tv-queue-section">
          <div className="tv-queue-header">
            <div className="tv-queue-title">
              <span className="material-icon">schedule</span>
              Prochains en file
            </div>
            <div className="tv-queue-stats">
              <div className="stat-item">
                <span className="material-icon">groups</span>
                <strong>{branchStatus.stats.totalWaiting}</strong> en attente
              </div>
              <div className="stat-item">
                <span className="material-icon">avg_pace</span>
                Prochain appel: <strong>~{nextCallEstimateMins} min</strong>
              </div>
            </div>
          </div>

          {visibleQueue.length > 0 ? (
            <div className="tv-queue-cards">
              {visibleQueue.map((item, index) => {
                const serviceConfig = getServiceConfig(item.serviceName);
                const waitMins = item.estimatedWaitMins;
                const isVip = item.priority === 'vip';
                // Get short service name (first word or abbreviation)
                const shortServiceName = serviceConfig.label || item.serviceName.split(' ')[0].slice(0, 8);

                return (
                  <div key={item.ticketNumber} className={`tv-queue-card ${serviceConfig.className} ${isVip ? 'is-vip' : ''}`}>
                    <div className="tv-queue-position">
                      Position {index + 1}
                      {isVip && <span className="vip-badge">VIP</span>}
                    </div>
                    <div className="tv-queue-ticket">{item.ticketNumber}</div>
                    <div className="tv-queue-card-footer">
                      <span className="tv-queue-service-name">{shortServiceName}</span>
                      <div className="tv-queue-wait">
                        <span className="material-icon">schedule</span>
                        {waitMins} min
                      </div>
                    </div>
                  </div>
                );
              })}

              {remainingCount > 0 && (
                <div className="tv-queue-more-card">
                  <span className="material-icon">more_horiz</span>
                  <span className="more-count">+{remainingCount}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="tv-queue-empty">
              <span className="material-icon">hourglass_empty</span>
              <div className="tv-queue-empty-text">Aucun client en attente</div>
            </div>
          )}
        </div>
      </div>

      {/* Closed/Paused Status Overlay */}
      {(queueStatus === 'closed' || queueStatus === 'paused') && (
        <div className="tv-status-overlay">
          <span className={`tv-status-icon material-icon ${queueStatus}`}>
            {queueStatus === 'closed' ? 'door_front' : 'pause_circle'}
          </span>
          <div className="tv-status-title">
            {queueStatus === 'closed' ? 'Agence Fermée' : 'File en Pause'}
          </div>
          <div className="tv-status-subtitle">
            {queueStatus === 'closed'
              ? 'Nous vous remercions de votre visite'
              : 'La file d\'attente reprendra bientôt'}
          </div>
          <div className="tv-status-time">{timeString}</div>
        </div>
      )}
    </>
  );
}
