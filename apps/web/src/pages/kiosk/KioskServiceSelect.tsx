import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';
import { getSocket, connectSocket, SOCKET_EVENTS } from '@/lib/socket';
import KioskHeader from '@/components/kiosk/KioskHeader';

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

// TV Display service palette — accent (icon color) + bg (icon background)
const CARD_CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  'RETRAIT / DÉPÔT': { icon: 'payments', accent: '#5A9BB5', bg: '#DBECF4' },
  'VIREMENTS': { icon: 'swap_horiz', accent: '#6AAE3E', bg: '#DEF5B7' },
  'CARTES & DOCS': { icon: 'credit_card', accent: '#D08A2E', bg: '#FFE9B7' },
  'AUTRES SERVICES': { icon: 'more_horiz', accent: '#8A8A8A', bg: '#E8E8E8' },
};

// Fallback color cycle for dynamic services
const FALLBACK_PALETTE = [
  { accent: '#5A9BB5', bg: '#DBECF4' }, // Blue
  { accent: '#6AAE3E', bg: '#DEF5B7' }, // Green
  { accent: '#D08A2E', bg: '#FFE9B7' }, // Orange
  { accent: '#8A8A8A', bg: '#E8E8E8' }, // Gray
];

export default function KioskServiceSelect() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [branchName, setBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [queuePaused, setQueuePaused] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const statusRes = await queueApi.getBranchStatus(branchId!);
        setBranchName(statusRes.data.data.branchName);
        setServices(statusRes.data.data.services || []);
        if (statusRes.data.data.queueStatus === 'paused') {
          setQueuePaused(true);
        }
      } catch {
        setError(t('errors.networkError'));
      } finally {
        setIsLoading(false);
      }
    };
    if (branchId) fetchServices();
  }, [branchId, t]);

  // Socket for queue pause/resume
  useEffect(() => {
    if (!branchId) return;
    connectSocket();
    const socket = getSocket();
    socket.emit('join:display', { branchId });

    const onPaused = () => setQueuePaused(true);
    const onResumed = () => setQueuePaused(false);
    socket.on(SOCKET_EVENTS.QUEUE_PAUSED, onPaused);
    socket.on(SOCKET_EVENTS.QUEUE_RESUMED, onResumed);

    return () => {
      socket.off(SOCKET_EVENTS.QUEUE_PAUSED, onPaused);
      socket.off(SOCKET_EVENTS.QUEUE_RESUMED, onResumed);
    };
  }, [branchId]);

  const kioskServices = services.filter((s) => s.showOnKiosk !== false);
  kioskServices.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.prefix.localeCompare(b.prefix));

  const handleSelectService = (service: ServiceCategory) => {
    navigate(`/kiosk/${branchId}/choose`, {
      state: {
        serviceId: service.id,
        serviceName: service.nameFr,
        serviceNameAr: service.nameAr,
        branchName,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-off-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mid mx-auto mb-4" />
          <p className="text-mid font-barlow">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-off-white">
        <div className="text-center">
          <p className="text-brand-red mb-4 font-barlow">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-near-black text-white rounded-lg font-barlow-c font-bold uppercase tracking-wide text-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-off-white">
      <KioskHeader branchName={branchName} />

      <main className="flex-1 flex flex-col items-center justify-center px-12 relative">
        {/* Queue Paused Overlay */}
        {queuePaused && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <span className="material-symbols-outlined mb-6" style={{ fontSize: '80px', color: '#F59E0B' }}>
                pause_circle
              </span>
              <h2 className="text-2xl font-barlow-c font-bold text-near-black mb-4">
                {i18n.language === 'ar' ? 'الخدمة متوقفة مؤقتاً' : 'Service temporairement indisponible'}
              </h2>
              <p className="text-base text-mid font-barlow mb-6">
                {i18n.language === 'ar'
                  ? 'نعتذر عن الإزعاج. يرجى المحاولة لاحقاً.'
                  : 'Nous nous excusons pour la gêne occasionnée. Veuillez réessayer plus tard.'}
              </p>
              <div className="animate-pulse">
                <span className="text-sm text-light font-barlow">
                  {i18n.language === 'ar' ? 'في انتظار استئناف الخدمة...' : 'En attente de reprise...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <h2 className="font-barlow-c font-bold text-2xl uppercase tracking-wide text-near-black mb-8">
          {t('kiosk.selectService')}
        </h2>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-4 gap-5 max-w-4xl w-full">
          {kioskServices.map((service, index) => {
            const nameFr = service.nameFr.toUpperCase();
            const config = CARD_CONFIG[nameFr];
            const fallback = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
            const iconName = config?.icon || service.icon || 'category';
            const iconAccent = config?.accent || fallback.accent;
            const iconBg = config?.bg || fallback.bg;
            const subLabels = i18n.language === 'ar' ? (service.subServicesAr || []) : (service.subServicesFr || []);
            const description = i18n.language === 'ar' ? service.descriptionAr : service.descriptionFr;

            return (
              <button
                key={service.id}
                onClick={() => handleSelectService(service)}
                disabled={queuePaused}
                className="bg-white border-2 border-pale rounded-lg p-6 text-center cursor-pointer transition-colors duration-150 hover:border-brand-red disabled:opacity-50 disabled:cursor-not-allowed grid disabled:pointer-events-none h-56"
                style={{ gridTemplateRows: '1fr auto 1fr' }}
              >
                {/* Icon — bottom-aligned in top third */}
                <div className="flex items-end justify-center">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: iconBg }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '26px', color: iconAccent }}
                    >
                      {iconName}
                    </span>
                  </div>
                </div>

                {/* Service Name — fixed middle row */}
                <div className="font-barlow-c font-bold text-xl uppercase tracking-wide text-near-black py-2">
                  {i18n.language === 'ar' ? service.nameAr : service.nameFr}
                </div>

                {/* Sub-text — top-aligned in bottom third */}
                <div className="text-xs text-light leading-snug font-barlow self-start">
                  {subLabels.length > 0
                    ? subLabels.map((sub) => <div key={sub}>{sub}</div>)
                    : description && <span>{description}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <p className="text-sm text-light mt-6 font-barlow">
          {t('kiosk.touchToSelect')}
        </p>
      </main>
    </div>
  );
}
