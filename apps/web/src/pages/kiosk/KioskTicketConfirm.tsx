import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { queueApi } from '@/lib/api';
import { queueOfflineCheckin } from '@/lib/offlineQueue';

// Service colors (background + accent for text/icons)
const SERVICE_COLORS: Record<string, { bg: string; accent: string }> = {
  'Retrait': { bg: '#DBECF4', accent: '#0891B2' },
  'Dépôt': { bg: '#DEF5B7', accent: '#65A30D' },
  'Ouverture de compte': { bg: '#FFE9B7', accent: '#D97706' },
  'Autres': { bg: '#E8E8E8', accent: '#6B7280' },
};

// Service icon mapping
const SERVICE_ICONS: Record<string, string> = {
  'Retrait': 'local_atm',
  'Dépôt': 'savings',
  'Ouverture de compte': 'person_add',
  'Autres': 'more_horiz',
};

interface TicketResult {
  ticket: {
    id: string;
    ticketNumber: string;
    serviceName: string;
    serviceNameAr: string;
  };
  position: number;
  estimatedWaitMins: number;
  branchName: string;
}

export default function KioskTicketConfirm() {
  const { branchId } = useParams<{ branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const serviceId = (location.state as any)?.serviceId;
  const serviceName = (location.state as any)?.serviceName || 'Retrait';
  const serviceNameAr = (location.state as any)?.serviceNameAr || 'سحب';
  const branchName = (location.state as any)?.branchName || '';

  const [phone, setPhone] = useState('+216 ');
  const [isCreating, setIsCreating] = useState(false);
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Format phone number as +216 XX XXX XXX
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/[^\d]/g, '');
    let formatted = '+216 ';
    const localDigits = digits.startsWith('216') ? digits.slice(3) : digits;

    if (localDigits.length > 0) {
      formatted += localDigits.slice(0, 2);
    }
    if (localDigits.length > 2) {
      formatted += ' ' + localDigits.slice(2, 5);
    }
    if (localDigits.length > 5) {
      formatted += ' ' + localDigits.slice(5, 8);
    }

    return formatted;
  };

  // Get raw phone number for API (just +216XXXXXXXX)
  const getRawPhone = (): string | undefined => {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length <= 3) return undefined;
    return '+' + digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length < 5) {
      setPhone('+216 ');
      return;
    }
    setPhone(formatPhoneNumber(value));
  };

  useEffect(() => {
    if (!serviceId) {
      navigate(`/kiosk/${branchId}`);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [serviceId, branchId, navigate]);

  const handleGetTicket = async () => {
    setIsCreating(true);
    setError('');

    const rawPhone = getRawPhone();
    const checkinData = {
      branchId: branchId!,
      serviceCategoryId: serviceId,
      customerPhone: rawPhone,
      notificationChannel: rawPhone ? 'sms' as const : 'none' as const,
      checkinMethod: 'kiosk' as const,
    };

    try {
      if (isOffline) {
        await queueOfflineCheckin(checkinData);
        setTicket({
          ticket: {
            id: 'offline',
            ticketNumber: 'PENDING',
            serviceName: 'Pending sync',
            serviceNameAr: 'في انتظار المزامنة',
          },
          position: 0,
          estimatedWaitMins: 0,
          branchName: '',
        });
      } else {
        const response = await queueApi.checkin(checkinData);
        setTicket(response.data.data);
      }
    } catch (err: any) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        await queueOfflineCheckin(checkinData);
        setTicket({
          ticket: {
            id: 'offline',
            ticketNumber: 'PENDING',
            serviceName: 'Pending sync',
            serviceNameAr: 'في انتظار المزامنة',
          },
          position: 0,
          estimatedWaitMins: 0,
          branchName: '',
        });
      } else {
        setError(err.response?.data?.error || t('errors.serverError'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    handleGetTicket();
  };

  const handleNewTicket = () => {
    navigate(`/kiosk/${branchId}`);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const statusUrl = ticket?.ticket.id !== 'offline'
    ? `${window.location.origin}/status/${ticket?.ticket.id}`
    : null;

  // Auto-redirect after showing ticket
  useEffect(() => {
    if (ticket) {
      const timer = setTimeout(() => {
        navigate(`/kiosk/${branchId}`);
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [ticket, branchId, navigate]);

  const displayServiceName = i18n.language === 'ar' ? serviceNameAr : serviceName;
  const serviceIcon = SERVICE_ICONS[serviceName] || 'category';
  const serviceColors = SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];

  if (ticket) {
    return (
      <div
        className="h-screen flex items-center justify-center overflow-hidden"
        style={{
          padding: 'clamp(16px, 3vmin, 32px)',
          backgroundColor: serviceColors.accent,
        }}
      >
        <div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full text-center flex flex-col"
          style={{
            padding: 'clamp(16px, 3vh, 32px) clamp(16px, 4vw, 40px)',
            maxWidth: '440px',
            maxHeight: 'calc(100vh - clamp(32px, 6vmin, 64px))',
            gap: 'clamp(8px, 1.5vh, 16px)',
          }}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {t('kiosk.yourTicket')}
          </h2>

          <div>
            <div
              className="font-bold animate-ticket"
              style={{
                fontSize: 'clamp(48px, 10vh, 80px)',
                lineHeight: 1.1,
                color: serviceColors.accent,
              }}
            >
              {ticket.ticket.ticketNumber}
            </div>
            <div className="text-base sm:text-lg text-gray-600 mt-1">
              {i18n.language === 'ar'
                ? ticket.ticket.serviceNameAr
                : ticket.ticket.serviceName}
            </div>
          </div>

          {ticket.position > 0 && (
            <div className="bg-gray-100 rounded-xl p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div
                    className="font-bold text-gray-900"
                    style={{ fontSize: 'clamp(24px, 5vh, 36px)' }}
                  >
                    #{ticket.position}
                  </div>
                  <div className="text-xs text-gray-600">
                    {t('kiosk.positionInQueue')}
                  </div>
                </div>
                <div>
                  <div
                    className="font-bold text-gray-900"
                    style={{ fontSize: 'clamp(24px, 5vh, 36px)' }}
                  >
                    ~{ticket.estimatedWaitMins}
                  </div>
                  <div className="text-xs text-gray-600">
                    {t('common.minutes')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {statusUrl && (
            <div className="flex flex-col items-center flex-shrink-0">
              <QRCodeSVG
                value={statusUrl}
                size={100}
                level="M"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('kiosk.scanQR')}
              </p>
            </div>
          )}

          <button
            onClick={handleNewTicket}
            className="px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium text-white transition-colors mt-auto"
            style={{ backgroundColor: serviceColors.accent }}
          >
            {t('kiosk.newTicket')}
          </button>
        </div>
      </div>
    );
  }

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <style>{`
        .kiosk-container {
          font-family: 'Inter', sans-serif;
        }
        .kiosk-container * {
          box-sizing: border-box;
        }
      `}</style>
      <div
        className="kiosk-container h-screen flex flex-col overflow-hidden"
        style={{ backgroundColor: '#FAFAFA' }}
      >
        {/* Header - matching TV Display style */}
        <header
          className="flex justify-between items-center px-4 sm:px-6 py-2 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate(`/kiosk/${branchId}`)}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px' }}
              >
                arrow_back
              </span>
              {t('common.back')}
            </button>
            <div className="w-px h-6 sm:h-8 bg-gray-200" />
            <img src="/uib-logo.jpg" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
            <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: '#49454F' }}>{branchName}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-full text-xs sm:text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#CAC4D0', color: '#49454F' }}
            >
              {i18n.language === 'fr' ? 'العربية' : 'Français'}
            </button>
            <div className="text-lg sm:text-2xl font-light" style={{ color: '#1C1B1F' }}>
              {timeString}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-0">
          <div
            className="bg-white flex flex-col items-center w-full max-h-full"
            style={{
              borderRadius: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
              padding: 'clamp(24px, 4vh, 48px) clamp(20px, 4vw, 64px)',
              maxWidth: '560px',
              gap: 'clamp(12px, 2vh, 24px)',
            }}
          >
            {/* Service Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: serviceColors.bg }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: serviceColors.accent }}
              >
                {serviceIcon}
              </span>
              <span
                className="text-base sm:text-lg font-medium"
                style={{ color: serviceColors.accent }}
              >
                {displayServiceName}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 text-center">
              {t('kiosk.phoneTitle')}
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-500 text-center" style={{ marginTop: '-8px' }}>
              {t('kiosk.phoneSubtitle')}
            </p>

            {/* Offline indicator */}
            {isOffline && (
              <div className="bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-center w-full text-sm">
                Hors ligne - votre ticket sera créé à la reconnexion
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg w-full text-sm">
                {error}
              </div>
            )}

            {/* Phone Input Group */}
            <div
              className="flex items-center gap-1 w-full"
              style={{
                backgroundColor: '#F5F5F5',
                borderRadius: '12px',
                padding: '4px',
                maxWidth: '340px',
              }}
            >
              <span
                className="px-3 sm:px-4 py-3 text-base sm:text-lg font-medium text-gray-500 bg-white rounded-lg flex-shrink-0"
                style={{
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
                }}
              >
                +216
              </span>
              <input
                type="tel"
                value={phone.replace('+216 ', '')}
                onChange={(e) => {
                  const value = '+216 ' + e.target.value;
                  setPhone(formatPhoneNumber(value));
                }}
                placeholder="XX XXX XXX"
                className="flex-1 px-3 sm:px-4 py-3 text-base sm:text-lg font-medium bg-transparent border-none outline-none text-gray-900 min-w-0"
                style={{ direction: 'ltr' }}
                maxLength={11}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 w-full" style={{ marginTop: 'clamp(8px, 1.5vh, 16px)' }}>
              <button
                onClick={handleGetTicket}
                disabled={isCreating}
                className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3 sm:py-4 rounded-full text-base sm:text-lg font-medium text-white transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#22C55E',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  confirmation_number
                </span>
                {isCreating ? t('common.loading') : t('kiosk.getTicket')}
              </button>
              <button
                onClick={handleSkip}
                disabled={isCreating}
                className="px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('kiosk.skipPhone')}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
