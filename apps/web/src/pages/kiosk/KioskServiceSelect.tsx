import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';
import { getSocket, connectSocket, SOCKET_EVENTS } from '@/lib/socket';

interface ServiceCategory {
  id: string;
  nameAr: string;
  nameFr: string;
  prefix: string;
  icon: string | null;
  displayOrder?: number;
  showOnKiosk?: boolean;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  serviceGroup?: string | null;
  subServicesFr?: string[];
  subServicesAr?: string[];
}

// Service color palette — 4 muted accent colors for service differentiation
const SERVICE_PALETTE = [
  { accent: '#8DC7DE', bg: '#DBECF4' }, // Blue
  { accent: '#9FD775', bg: '#DEF5B7' }, // Green
  { accent: '#FBAC54', bg: '#FFE9B7' }, // Orange
  { accent: '#BABABA', bg: '#E8E8E8' }, // Gray
];

interface DisplayOption {
  key: string;
  nameFr: string;
  nameAr: string;
  icon: string;
  bgColor: string;
  accentColor: string;
  borderColor: string;
  serviceId: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  serviceGroup: string | null;
  subServicesFr: string[];
  subServicesAr: string[];
  displayOrder: number;
}

export default function KioskServiceSelect() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [branchName, setBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [queuePaused, setQueuePaused] = useState(false);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load Material Symbols font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Get branch queue status which includes services (public endpoint)
        const statusRes = await queueApi.getBranchStatus(branchId!);

        setBranchName(statusRes.data.data.branchName);
        setServices(statusRes.data.data.services || []);

        // Check queue status from public endpoint
        if (statusRes.data.data.queueStatus === 'paused') {
          setQueuePaused(true);
        }
      } catch (err) {
        setError(t('errors.networkError'));
      } finally {
        setIsLoading(false);
      }
    };

    if (branchId) {
      fetchServices();
    }
  }, [branchId, t]);

  // Socket connection for real-time queue status updates
  useEffect(() => {
    if (!branchId) return;

    connectSocket();
    const socket = getSocket();

    // Join display room (public - no auth required)
    socket.emit('join:display', { branchId });

    // Listen for queue pause/resume events
    const onQueuePaused = () => {
      setQueuePaused(true);
    };

    const onQueueResumed = () => {
      setQueuePaused(false);
    };

    socket.on(SOCKET_EVENTS.QUEUE_PAUSED, onQueuePaused);
    socket.on(SOCKET_EVENTS.QUEUE_RESUMED, onQueueResumed);

    return () => {
      socket.off(SOCKET_EVENTS.QUEUE_PAUSED, onQueuePaused);
      socket.off(SOCKET_EVENTS.QUEUE_RESUMED, onQueueResumed);
    };
  }, [branchId]);

  // Build display options from services visible on kiosk
  const kioskServices = services.filter((s) => s.showOnKiosk !== false);

  const displayOptions: DisplayOption[] = kioskServices.map((service, index) => {
    const palette = SERVICE_PALETTE[index % SERVICE_PALETTE.length];
    const icon = service.icon || 'category';

    return {
      key: service.id,
      nameFr: service.nameFr,
      nameAr: service.nameAr,
      icon,
      bgColor: '#FFFFFF',
      accentColor: palette.accent,
      borderColor: palette.accent,
      serviceId: service.id,
      descriptionFr: service.descriptionFr || null,
      descriptionAr: service.descriptionAr || null,
      serviceGroup: service.serviceGroup || null,
      subServicesFr: service.subServicesFr || [],
      subServicesAr: service.subServicesAr || [],
      displayOrder: service.displayOrder ?? 0,
    };
  });

  // Sort by displayOrder, then by prefix
  displayOptions.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    const serviceA = kioskServices.find(s => s.id === a.serviceId);
    const serviceB = kioskServices.find(s => s.id === b.serviceId);
    return (serviceA?.prefix || '').localeCompare(serviceB?.prefix || '');
  });

  // Group services by serviceGroup if present
  const serviceGroups = new Map<string, DisplayOption[]>();
  const ungroupedOptions: DisplayOption[] = [];
  displayOptions.forEach((option) => {
    if (option.serviceGroup) {
      const group = serviceGroups.get(option.serviceGroup) || [];
      group.push(option);
      serviceGroups.set(option.serviceGroup, group);
    } else {
      ungroupedOptions.push(option);
    }
  });
  const hasGroups = serviceGroups.size > 0;

  const handleSelectService = (option: DisplayOption) => {
    navigate(`/kiosk/${branchId}/choose`, {
      state: {
        serviceId: option.serviceId,
        serviceName: option.nameFr,
        serviceNameAr: option.nameAr,
        branchName,
        serviceColor: option.accentColor,
        serviceColorBg: option.bgColor,
      },
    });
  };

  const getOptionName = (option: DisplayOption) => {
    return i18n.language === 'ar' ? option.nameAr : option.nameFr;
  };

  const getOptionDescription = (option: DisplayOption) => {
    const desc = i18n.language === 'ar' ? option.descriptionAr : option.descriptionFr;
    return desc || null;
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-800 text-white rounded-full font-medium"
          >
            {t('common.retry')}
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
        {/* Header - matching other Kiosk screens */}
        <header
          className="flex justify-between items-center px-4 sm:px-6 py-2 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/uib-logo.png" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
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

        {/* Value Proposition Banner */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 py-2.5 text-center"
          style={{ backgroundColor: '#EFF6FF', borderBottom: '1px solid #DBEAFE' }}
        >
          <div className="flex items-center justify-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#2563EB' }}
            >
              smartphone
            </span>
            <p className="text-sm sm:text-base" style={{ color: '#1E40AF' }}>
              {i18n.language === 'ar'
                ? 'تابع دورك من هاتفك — لا حاجة للانتظار واقفاً!'
                : 'Suivez votre file d\'attente depuis votre téléphone — Plus besoin de rester debout\u00A0!'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-0 relative">
          {/* Queue Paused Overlay */}
          {queuePaused && (
            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center">
              <div className="text-center p-8 max-w-md">
                <span
                  className="material-symbols-outlined mb-6"
                  style={{ fontSize: '80px', color: '#F59E0B' }}
                >
                  pause_circle
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
                  {i18n.language === 'ar' ? 'الخدمة متوقفة مؤقتاً' : 'Service temporairement indisponible'}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {i18n.language === 'ar'
                    ? 'نعتذر عن الإزعاج. يرجى المحاولة لاحقاً.'
                    : 'Nous nous excusons pour la gêne occasionnée. Veuillez réessayer plus tard.'}
                </p>
                <div className="animate-pulse">
                  <span className="text-sm text-gray-500">
                    {i18n.language === 'ar' ? 'في انتظار استئناف الخدمة...' : 'En attente de reprise...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-4 sm:mb-6">
            {t('kiosk.selectService')}
          </h2>

          {/* Service cards - responsive grid */}
          <div
            className="grid gap-5 sm:gap-6 lg:gap-9 w-full justify-center"
            style={{
              // For 1-4 services: show in single row
              // For 5+ services: use 3 columns to keep cards reasonably sized
              gridTemplateColumns: displayOptions.length <= 4
                ? `repeat(${displayOptions.length}, minmax(140px, 200px))`
                : `repeat(3, minmax(140px, 200px))`,
              maxWidth: displayOptions.length <= 4 ? '900px' : '700px',
            }}
          >
            {displayOptions.map((option) => {
              const subLabels = i18n.language === 'ar' ? option.subServicesAr : option.subServicesFr;
              const hasSubLabels = subLabels.length > 0;
              const description = getOptionDescription(option);

              return (
                <button
                  key={option.key}
                  onClick={() => handleSelectService(option)}
                  disabled={queuePaused}
                  className="rounded-2xl flex flex-col items-center pt-5 sm:pt-6 pb-4 cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: option.bgColor,
                    border: '1px solid #E0E0E0',
                    borderLeft: `4px solid ${option.borderColor}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    minHeight: '180px',
                  }}
                >
                  {/* Icon — fixed height zone */}
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 'clamp(32px, 5vw, 44px)',
                      color: option.accentColor,
                      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {option.icon}
                  </span>

                  {/* Title — fixed min-height so sub-services align across cards */}
                  <span
                    className="text-sm sm:text-base lg:text-lg font-semibold text-center px-2 flex items-center justify-center mt-2"
                    style={{ color: '#1A1A1A', minHeight: '2.75em' }}
                  >
                    {getOptionName(option)}
                  </span>

                  {/* Sub-services list */}
                  {hasSubLabels && (
                    <div className="flex flex-col items-center gap-0.5 px-3 mt-1">
                      {subLabels.map((sub) => (
                        <span
                          key={sub}
                          className="text-[11px] sm:text-xs leading-tight"
                          style={{ color: '#9CA3AF' }}
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                  {!hasSubLabels && description && (
                    <span
                      className="text-[11px] sm:text-xs text-center px-3 mt-1 leading-tight"
                      style={{ color: '#9CA3AF' }}
                    >
                      {description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-gray-500 text-sm sm:text-base mt-4 sm:mt-6">
            {t('kiosk.touchToSelect')}
          </p>
        </main>
      </div>
    </>
  );
}
