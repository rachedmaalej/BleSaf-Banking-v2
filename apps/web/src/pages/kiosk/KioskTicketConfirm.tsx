import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { queueApi } from '@/lib/api';

// Service colors — SG brand palette
const SERVICE_COLORS: Record<string, { bg: string; accent: string }> = {
  "Retrait d'espèces": { bg: '#FEE2E2', accent: '#E9041E' },
  'Relevés de compte': { bg: '#F0F0F0', accent: '#1A1A1A' },
  "Dépôt d'espèces": { bg: '#FCE8EB', accent: '#D66874' },
  'Autres': { bg: '#F0F0F0', accent: '#666666' },
};

const SERVICE_ICONS: Record<string, string> = {
  "Retrait d'espèces": 'local_atm',
  'Relevés de compte': 'receipt_long',
  "Dépôt d'espèces": 'payments',
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
  const { i18n } = useTranslation();

  const serviceId = (location.state as any)?.serviceId;
  const serviceName = (location.state as any)?.serviceName || '';
  const serviceNameAr = (location.state as any)?.serviceNameAr || '';
  const branchName = (location.state as any)?.branchName || '';

  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Notification option states
  const [expandedOption, setExpandedOption] = useState<'print' | 'sms' | null>(null);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const isAr = i18n.language === 'ar';
  const displayServiceName = isAr ? serviceNameAr : serviceName;
  const serviceIcon = SERVICE_ICONS[serviceName] || 'category';
  const serviceColors = SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];

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

  // Create ticket immediately on mount
  useEffect(() => {
    if (!serviceId) return;

    const createTicket = async () => {
      try {
        const response = await queueApi.checkin({
          branchId: branchId!,
          serviceCategoryId: serviceId,
          notificationChannel: 'none',
          checkinMethod: 'kiosk',
        });
        setTicket(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Une erreur est survenue');
      } finally {
        setIsCreating(false);
      }
    };

    createTicket();
  }, [serviceId, branchId]);

  // Auto-redirect: 30s idle, or 6s after action completes
  useEffect(() => {
    if (!ticket) return;

    // After print or SMS completion, redirect in 6s
    if (printDone || smsSent) {
      const timer = setTimeout(() => navigate(`/kiosk/${branchId}`), 6000);
      return () => clearTimeout(timer);
    }

    // Don't auto-redirect while user is interacting with an option
    if (expandedOption) return;

    // 30s idle timeout
    const timer = setTimeout(() => navigate(`/kiosk/${branchId}`), 30000);
    return () => clearTimeout(timer);
  }, [ticket, branchId, navigate, expandedOption, printDone, smsSent]);

  // Format phone digits as "XX XXX XXX"
  const formatDisplayDigits = (digits: string): string => {
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
    return formatted;
  };

  const handlePrint = () => {
    setExpandedOption('print');
    setIsPrinting(true);
    // Simulate printing for 2s
    setTimeout(() => {
      setIsPrinting(false);
      setPrintDone(true);
    }, 2000);
  };

  const handleSmsSubmit = () => {
    if (phoneDigits.length !== 8) return;
    setSmsSent(true);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'fr' : 'ar');
  };

  const goHome = () => navigate(`/kiosk/${branchId}`);

  const statusUrl = ticket?.ticket.id && ticket.ticket.id !== 'offline'
    ? `${window.location.origin}/status/${ticket.ticket.id}`
    : null;

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── Loading state ──
  if (isCreating) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#E9041E' }} />
          <p className="text-gray-600">
            {isAr ? 'جاري إنشاء التذكرة...' : 'Création de votre ticket...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm">
          <span className="material-symbols-outlined mb-4 block" style={{ fontSize: '56px', color: '#E9041E' }}>
            error
          </span>
          <p className="text-gray-800 text-lg font-medium mb-2">
            {isAr ? 'حدث خطأ' : 'Une erreur est survenue'}
          </p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={goHome}
            className="px-8 py-3 rounded-full font-semibold text-white"
            style={{ backgroundColor: '#E9041E' }}
          >
            {isAr ? 'العودة' : 'Retour'}
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  // ── Main split-panel layout ──
  return (
    <>
      <style>{`
        .kiosk-confirm { font-family: 'Inter', sans-serif; }
        .kiosk-confirm * { box-sizing: border-box; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-in { animation: fadeSlideUp 0.4s ease-out both; }
        .anim-in-delay { animation: fadeSlideUp 0.4s ease-out 0.12s both; }
        @keyframes printPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .print-pulse { animation: printPulse 0.7s ease-in-out infinite; }
      `}</style>

      <div className="kiosk-confirm h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FAFAFA' }}>
        {/* ── Header ── */}
        <header
          className="flex justify-between items-center px-4 sm:px-6 py-2 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/uib-logo.png" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
            <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: '#49454F' }}>
              {branchName || ticket.branchName}
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

        {/* ── Split Panel ── */}
        <main
          className="flex-1 flex flex-col sm:flex-row min-h-0 p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 lg:gap-8"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* ═══ LEFT PANEL — Ticket Confirmation ═══ */}
          <div className="flex-1 flex flex-col items-center justify-center anim-in">
            {/* Green confirmation banner */}
            <div className="flex items-center gap-2 mb-5">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '32px', color: '#10B981' }}
              >
                check_circle
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: '#10B981' }}>
                {isAr ? 'أنت في الطابور!' : 'Vous êtes dans la file !'}
              </h2>
            </div>

            {/* Service badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{ backgroundColor: serviceColors.bg }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: serviceColors.accent }}
              >
                {serviceIcon}
              </span>
              <span className="text-sm font-medium" style={{ color: serviceColors.accent }}>
                {displayServiceName}
              </span>
            </div>

            {/* Large ticket number */}
            <div className="text-center mb-5">
              <div
                style={{
                  fontSize: 'clamp(56px, 12vh, 100px)',
                  fontWeight: 300,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: serviceColors.accent,
                }}
              >
                {ticket.ticket.ticketNumber}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {isAr ? 'رقم تذكرتك' : 'Votre numéro'}
              </p>
            </div>

            {/* Position + Wait time */}
            {ticket.position > 0 && (
              <div
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 w-full"
                style={{ maxWidth: '320px' }}
              >
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl sm:text-4xl font-light text-gray-900">
                      #{ticket.position}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isAr ? 'موقعك في الطابور' : 'Position dans la file'}
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-light text-gray-900">
                      ~{ticket.estimatedWaitMins}
                      <span className="text-base font-normal text-gray-400">min</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isAr ? 'وقت الانتظار المقدر' : "Temps d'attente estimé"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Vertical divider (desktop) ── */}
          <div className="hidden sm:block w-px bg-gray-200 flex-shrink-0 my-4" />
          {/* ── Horizontal divider (mobile) ── */}
          <div className="sm:hidden h-px bg-gray-200 flex-shrink-0 mx-4" />

          {/* ═══ RIGHT PANEL — Notification Options ═══ */}
          <div className="flex-1 flex flex-col items-center justify-center anim-in-delay">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-5 text-center">
              {isAr ? 'كيف تتابع دورك؟' : 'Comment suivre votre tour ?'}
            </h3>

            <div className="w-full flex flex-col gap-3" style={{ maxWidth: '400px' }}>

              {/* ── OPTION 1: Print ticket ── */}
              {expandedOption !== 'sms' && (
                <div
                  className="bg-white rounded-xl border overflow-hidden transition-all"
                  style={{
                    borderColor: expandedOption === 'print' ? '#E9041E' : '#E5E7EB',
                    boxShadow: expandedOption === 'print'
                      ? '0 4px 16px rgba(233,4,30,0.12)'
                      : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {expandedOption === 'print' ? (
                    /* ── Expanded: printing / done ── */
                    <div className="p-5 sm:p-6 text-center">
                      {isPrinting ? (
                        <>
                          <span
                            className="material-symbols-outlined print-pulse mb-3 block"
                            style={{ fontSize: '52px', color: '#E9041E' }}
                          >
                            print
                          </span>
                          <p className="text-lg font-semibold text-gray-900">
                            {isAr ? 'جاري الطباعة...' : 'Impression en cours...'}
                          </p>
                        </>
                      ) : (
                        <>
                          <span
                            className="material-symbols-outlined mb-3 block"
                            style={{ fontSize: '52px', color: '#10B981' }}
                          >
                            task_alt
                          </span>
                          <p className="text-lg font-semibold text-gray-900 mb-2">
                            {isAr ? 'تم طباعة التذكرة!' : 'Ticket imprimé !'}
                          </p>
                          <p className="text-sm text-gray-500 leading-relaxed mb-4">
                            {isAr
                              ? 'امسح رمز QR الموجود على تذكرتك لمتابعة دورك عبر هاتفك'
                              : 'Scannez le QR code sur votre ticket pour suivre votre tour sur votre téléphone'}
                          </p>
                          {statusUrl && (
                            <div className="flex flex-col items-center">
                              <QRCodeSVG value={statusUrl} size={90} level="M" />
                              <p className="text-xs text-gray-400 mt-2">
                                {isAr ? 'رمز QR المطبوع على تذكرتك' : 'QR code imprimé sur votre ticket'}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* ── Collapsed: print card ── */
                    <button
                      onClick={handlePrint}
                      className="w-full p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                      style={{ textAlign: isAr ? 'right' : 'left' }}
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#FEF2F2' }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '24px', color: '#E9041E' }}
                        >
                          print
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base">
                          {isAr ? 'طباعة التذكرة' : 'Imprimer mon ticket'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {isAr
                            ? 'احصل على تذكرة مطبوعة مع رمز QR. امسحه بهاتفك لمتابعة موقعك والحصول على إشعار عند دورك.'
                            : 'Recevez un ticket imprimé avec QR code. Scannez-le pour suivre votre position et être notifié sur votre téléphone.'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: '#9CA3AF' }}
                          >
                            tv
                          </span>
                          <span className="text-xs text-gray-400">
                            {isAr
                              ? 'تابع رقمك أيضاً على شاشة التلفاز'
                              : "Suivez aussi votre numéro sur l'écran TV"}
                          </span>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ── OPTION 2: SMS notification ── */}
              {expandedOption !== 'print' && (
                <div
                  className="bg-white rounded-xl border overflow-hidden transition-all"
                  style={{
                    borderColor: expandedOption === 'sms' ? '#2563EB' : '#E5E7EB',
                    boxShadow: expandedOption === 'sms'
                      ? '0 4px 16px rgba(37,99,235,0.12)'
                      : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {expandedOption === 'sms' ? (
                    /* ── Expanded: SMS numpad or confirmation ── */
                    <div className="p-4 sm:p-5">
                      {smsSent ? (
                        /* SMS confirmed */
                        <div className="text-center py-3">
                          <span
                            className="material-symbols-outlined mb-3 block"
                            style={{ fontSize: '52px', color: '#10B981' }}
                          >
                            check_circle
                          </span>
                          <p className="text-lg font-semibold text-gray-900 mb-1">
                            {isAr ? 'تم التسجيل!' : 'SMS enregistré !'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {isAr
                              ? `ستتلقى إشعاراً على +216 ${formatDisplayDigits(phoneDigits)}`
                              : `Vous serez notifié au +216 ${formatDisplayDigits(phoneDigits)}`}
                          </p>
                        </div>
                      ) : (
                        /* SMS numpad */
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-gray-900">
                              {isAr ? 'أدخل رقم هاتفك' : 'Entrez votre numéro'}
                            </p>
                            <button
                              onClick={() => { setExpandedOption(null); setPhoneDigits(''); }}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                close
                              </span>
                            </button>
                          </div>

                          {/* Phone display */}
                          <div
                            className="flex items-center gap-2 w-full mb-3"
                            style={{
                              backgroundColor: '#F3F4F6',
                              borderRadius: '10px',
                              padding: '10px 14px',
                            }}
                          >
                            <span className="text-base font-semibold text-gray-500 flex-shrink-0">
                              +216
                            </span>
                            <span
                              className="text-base font-medium"
                              style={{
                                color: phoneDigits.length > 0 ? '#1A1A1A' : '#9CA3AF',
                                direction: 'ltr',
                                letterSpacing: '1px',
                              }}
                            >
                              {phoneDigits.length > 0
                                ? formatDisplayDigits(phoneDigits)
                                : '__ ___ ___'}
                            </span>
                          </div>

                          {/* Compact numpad */}
                          <div
                            className="grid grid-cols-3 gap-1.5 mb-3"
                            style={{ maxWidth: '240px', margin: '0 auto' }}
                          >
                            {['1','2','3','4','5','6','7','8','9','empty','0','backspace'].map((key) => {
                              if (key === 'empty') return <div key={key} />;

                              if (key === 'backspace') {
                                return (
                                  <button
                                    key={key}
                                    onClick={() => setPhoneDigits(prev => prev.slice(0, -1))}
                                    disabled={phoneDigits.length === 0}
                                    className="flex items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-20"
                                    style={{
                                      height: '42px',
                                      backgroundColor: '#FFF',
                                      border: '1px solid #E5E7EB',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: '18px', color: '#6B7280' }}
                                    >
                                      backspace
                                    </span>
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={key}
                                  onClick={() => {
                                    if (phoneDigits.length < 8) {
                                      setPhoneDigits(prev => prev + key);
                                    }
                                  }}
                                  className="flex items-center justify-center rounded-lg text-lg font-medium transition-all active:scale-95"
                                  style={{
                                    height: '42px',
                                    backgroundColor: '#FFF',
                                    border: '1px solid #E5E7EB',
                                    color: '#1A1A1A',
                                  }}
                                >
                                  {key}
                                </button>
                              );
                            })}
                          </div>

                          {/* Confirm button */}
                          <button
                            onClick={handleSmsSubmit}
                            disabled={phoneDigits.length !== 8}
                            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40"
                            style={{ backgroundColor: '#E9041E' }}
                          >
                            {isAr ? 'تأكيد' : 'Confirmer'}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    /* ── Collapsed: SMS card ── */
                    <button
                      onClick={() => setExpandedOption('sms')}
                      className="w-full p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                      style={{ textAlign: isAr ? 'right' : 'left' }}
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#EFF6FF' }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '24px', color: '#2563EB' }}
                        >
                          sms
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base">
                          {isAr ? 'إشعار عبر SMS' : 'Recevoir un SMS'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {isAr
                            ? 'أدخل رقم هاتفك وسنرسل لك رسالة SMS عند اقتراب دورك.'
                            : 'Entrez votre numéro de téléphone et recevez un SMS quand votre tour approche.'}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* "Terminer" — only when no option is expanded or after action done */}
            {(!expandedOption || printDone || smsSent) && (
              <button
                onClick={goHome}
                className="mt-6 px-8 py-3 rounded-full text-sm font-medium transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280', border: '1px solid #D1D5DB' }}
              >
                {isAr ? 'إنهاء' : 'Terminer'}
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
