import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';
import NumericKeypad from '@/components/kiosk/NumericKeypad';

export default function KioskWaitingChoice() {
  const { branchId } = useParams<{ branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const serviceId = (location.state as any)?.serviceId;
  const serviceName = (location.state as any)?.serviceName || '';
  const serviceNameAr = (location.state as any)?.serviceNameAr || '';
  const branchName = (location.state as any)?.branchName || '';
  const serviceColor = (location.state as any)?.serviceColor || '#BABABA';
  const serviceColorBg = (location.state as any)?.serviceColorBg || '#E8E8E8';

  const isAr = i18n.language === 'ar';

  const [phoneDigits, setPhoneDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Idle timeout ref - resets on any interaction
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      navigate(`/kiosk/${branchId}`);
    }, 60000);
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load Material Symbols
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Redirect if no service selected
  useEffect(() => {
    if (!serviceId) {
      navigate(`/kiosk/${branchId}`);
    }
  }, [serviceId, branchId, navigate]);

  // Idle timeout
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [branchId, navigate]);

  // Reset idle on any interaction
  const handleInteraction = () => resetIdleTimer();

  // Format phone digits as "XX XXX XXX"
  const formatDisplayDigits = (digits: string): string => {
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
    return formatted;
  };

  const handlePhoneSubmit = async () => {
    if (phoneDigits.length !== 8 || isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const response = await queueApi.checkin({
        branchId: branchId!,
        serviceCategoryId: serviceId,
        customerPhone: `+216${phoneDigits}`,
        checkinMethod: 'kiosk',
      });

      navigate(`/kiosk/${branchId}/confirm`, {
        state: {
          ticketData: response.data.data,
          mode: 'phone',
          phoneNumber: `+216 ${formatDisplayDigits(phoneDigits)}`,
          serviceName,
          serviceNameAr,
          branchName,
          serviceColor,
          serviceColorBg,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Une erreur est survenue'));
      setIsSubmitting(false);
    }
  };

  const handleClassicSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const response = await queueApi.checkin({
        branchId: branchId!,
        serviceCategoryId: serviceId,
        checkinMethod: 'kiosk',
      });

      navigate(`/kiosk/${branchId}/confirm`, {
        state: {
          ticketData: response.data.data,
          mode: 'classic',
          serviceName,
          serviceNameAr,
          branchName,
          serviceColor,
          serviceColorBg,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Une erreur est survenue'));
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'fr' : 'ar');
  };

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <style>{`
        .kiosk-choose { font-family: 'Inter', sans-serif; }
        .kiosk-choose * { box-sizing: border-box; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease-out both; }
        .fade-in-delay { animation: fadeIn 0.4s ease-out 0.15s both; }
      `}</style>

      <div
        className="kiosk-choose flex flex-col overflow-hidden"
        style={{ height: '100dvh', backgroundColor: '#FAFAFA' }}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {/* Header */}
        <header
          className="flex justify-between items-center px-3 sm:px-6 py-1.5 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(`/kiosk/${branchId}`)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                arrow_back
              </span>
            </button>
            <img src="/uib-logo.png" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
            <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: '#49454F' }}>
              {branchName}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-full text-xs sm:text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#CAC4D0', color: '#49454F' }}
            >
              {isAr ? 'Français' : 'العربية'}
            </button>
            <div className="text-lg sm:text-2xl font-light" style={{ color: '#1C1B1F' }}>
              {timeString}
            </div>
          </div>
        </header>

        {/* Title */}
        <div className="text-center py-2 sm:py-3 flex-shrink-0">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900">
            {isAr ? 'كيف تفضل الانتظار؟' : 'Comment souhaitez-vous attendre\u00A0?'}
          </h2>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-8 mb-2 px-4 py-2 rounded-lg text-sm text-center"
            style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Dual Panel */}
        <main
          className="flex-1 flex flex-col sm:flex-row min-h-0 px-3 sm:px-5 lg:px-8 pb-3 sm:pb-5 gap-3 sm:gap-5"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* ═══ LEFT PANEL — Phone Tracking (Option D: Bottom-Anchored) ═══ */}
          <div
            className="flex-[4] sm:flex-[3] flex flex-col rounded-2xl fade-in overflow-hidden relative min-h-0"
            style={{
              backgroundColor: 'white',
              border: `2px solid ${serviceColor}40`,
            }}
          >
            {/* Recommandé badge */}
            <div
              className="absolute top-0 text-white text-xs font-semibold uppercase tracking-wide px-3 py-1 z-10"
              style={{
                backgroundColor: '#E9041E',
                borderRadius: '0 0 8px 8px',
                ...(isAr ? { left: 20 } : { right: 20 }),
              }}
            >
              {isAr ? 'موصى به' : 'Recommandé'}
            </div>

            {/* ── Top section: compact info strip ── */}
            <div
              className="px-3 sm:px-5 py-2 sm:py-3 flex-shrink-0"
              style={{ backgroundColor: serviceColorBg }}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 mb-1 sm:mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${serviceColor}30` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: serviceColor }}>
                    smartphone
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold" style={{ color: '#1A1A1A' }}>
                  {isAr ? 'تابع من هاتفك' : 'Suivez depuis votre téléphone'}
                </h3>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {[
                  { fr: 'Position en direct', ar: 'موقعك مباشرة' },
                  { fr: 'Temps estimé', ar: 'وقت الانتظار' },
                  { fr: 'Alerte SMS', ar: 'تنبيه SMS' },
                ].map((b) => (
                  <div key={b.fr} className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10B981' }}>
                      check_circle
                    </span>
                    <span className="text-xs" style={{ color: '#374151' }}>
                      {isAr ? b.ar : b.fr}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Middle section: large phone input display ── */}
            <div className="px-3 sm:px-5 py-2 sm:py-3 flex-shrink-0">
              <div
                className="flex items-center gap-2 sm:gap-3"
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  border: `1.5px solid ${phoneDigits.length > 0 ? serviceColor + '60' : '#E5E7EB'}`,
                  transition: 'border-color 0.2s',
                }}
              >
                <span className="text-base sm:text-lg font-semibold text-gray-400 flex-shrink-0">+216</span>
                <span
                  className="text-xl sm:text-3xl font-medium"
                  style={{
                    color: phoneDigits.length > 0 ? '#1A1A1A' : '#D1D5DB',
                    direction: 'ltr',
                    letterSpacing: '3px',
                  }}
                >
                  {phoneDigits.length > 0 ? formatDisplayDigits(phoneDigits) : '__ ___ ___'}
                </span>
              </div>
            </div>

            {/* ── Bottom section: anchored keypad ── */}
            <div
              className="flex-1 flex flex-col px-3 sm:px-5 pt-1.5 pb-2 sm:pt-2 sm:pb-3"
              style={{
                backgroundColor: '#FAFAFA',
                borderTop: '1px solid #E5E7EB',
              }}
            >
              <div className="flex-1 flex flex-col">
                <NumericKeypad
                  value={phoneDigits}
                  onChange={(v) => { setPhoneDigits(v); handleInteraction(); }}
                  onSubmit={handlePhoneSubmit}
                  accentColor={serviceColor}
                  showConfirm
                  confirmDisabled={phoneDigits.length !== 8 || isSubmitting}
                />
              </div>
              {/* Privacy note */}
              <p className="text-xs text-gray-400 text-center mt-1 sm:mt-2 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10B981' }}>
                  lock
                </span>
                {isAr
                  ? 'رقمك محمي ولن يُستخدم إلا لهذه الخدمة'
                  : 'Votre numéro est sécurisé'}
              </p>
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Classic Waiting (muted) ═══ */}
          <div
            className="flex-[2] sm:flex-[2] flex flex-col items-center justify-center rounded-2xl p-4 sm:p-6 fade-in-delay"
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
            }}
          >
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#9CA3AF' }}>
                weekend
              </span>
            </div>

            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2 text-center">
              {isAr ? 'الانتظار في المكان' : 'Attendre sur place'}
            </h3>

            <p className="text-xs sm:text-sm text-gray-500 text-center mb-3 sm:mb-6 leading-relaxed">
              {isAr
                ? 'تابع رقمك على شاشة العرض في قاعة الانتظار.'
                : "Suivez votre numéro sur l'écran d'affichage dans la salle d'attente."}
            </p>

            <div className="flex items-center gap-2 mb-3 sm:mb-6">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#9CA3AF' }}>
                tv
              </span>
              <span className="text-xs text-gray-400">
                {isAr ? 'شاشة قاعة الانتظار' : "Écran de la salle d'attente"}
              </span>
            </div>

            <button
              onClick={handleClassicSubmit}
              disabled={isSubmitting}
              className="w-full py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all disabled:opacity-40"
              style={{
                backgroundColor: 'transparent',
                color: '#6B7280',
                border: '2px solid #D1D5DB',
              }}
            >
              {isSubmitting
                ? (isAr ? 'جاري الإنشاء...' : 'Création en cours...')
                : (isAr ? 'أخذ تذكرة عادية' : 'Prendre un ticket classique')}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
