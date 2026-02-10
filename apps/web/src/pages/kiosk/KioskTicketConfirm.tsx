import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

const SERVICE_ICONS: Record<string, string> = {
  "Retrait d'espèces": 'local_atm',
  'Relevés de compte': 'receipt_long',
  "Dépôt d'espèces": 'payments',
  'Autres': 'more_horiz',
};

interface TicketData {
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

  // Receive ticket data from KioskWaitingChoice — no longer creates ticket
  const ticketData = (location.state as any)?.ticketData as TicketData | undefined;
  const mode: 'phone' | 'classic' = (location.state as any)?.mode || 'classic';
  const phoneNumber: string = (location.state as any)?.phoneNumber || '';
  const serviceName = (location.state as any)?.serviceName || '';
  const serviceNameAr = (location.state as any)?.serviceNameAr || '';
  const branchName = (location.state as any)?.branchName || '';

  const serviceColor = (location.state as any)?.serviceColor || '#BABABA';
  const serviceColorBg = (location.state as any)?.serviceColorBg || '#E8E8E8';

  const isAr = i18n.language === 'ar';
  const displayServiceName = isAr ? serviceNameAr : serviceName;
  const serviceIcon = SERVICE_ICONS[serviceName] || 'category';
  const serviceColors = { accent: serviceColor, bg: serviceColorBg };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);

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

  // Guard: redirect if no ticket data
  useEffect(() => {
    if (!ticketData) {
      navigate(`/kiosk/${branchId}`);
    }
  }, [ticketData, branchId, navigate]);

  // Auto-redirect: 15s for phone mode, 10s for classic
  useEffect(() => {
    if (!ticketData) return;
    const delay = mode === 'phone' ? 15000 : 10000;
    const timer = setTimeout(() => navigate(`/kiosk/${branchId}`), delay);
    return () => clearTimeout(timer);
  }, [ticketData, branchId, navigate, mode]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintDone(true);
    }, 2000);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'fr' : 'ar');
  };

  const goHome = () => navigate(`/kiosk/${branchId}`);

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!ticketData) return null;

  const statusUrl = `${window.location.origin}/status/${ticketData.ticket.id}`;

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
        .anim-in-delay { animation: fadeSlideUp 0.4s ease-out 0.15s both; }
        @keyframes printPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .print-pulse { animation: printPulse 0.7s ease-in-out infinite; }
        @keyframes countdownBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <div className="kiosk-confirm flex flex-col overflow-hidden" style={{ height: '100dvh', backgroundColor: '#FAFAFA' }}>
        {/* Header */}
        <header
          className="flex justify-between items-center px-3 sm:px-6 py-1.5 sm:py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/uib-logo.png" alt="UIB" className="h-8 sm:h-10 lg:h-12 w-auto" />
            <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: '#49454F' }}>
              {branchName || ticketData.branchName}
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

        {/* Auto-redirect progress bar */}
        <div className="h-1 flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
          <div
            className="h-full rounded-r-full"
            style={{
              backgroundColor: '#E9041E',
              animation: `countdownBar ${mode === 'phone' ? '15s' : '10s'} linear forwards`,
            }}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-start sm:items-center justify-center px-3 py-2 sm:p-6 min-h-0 overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md anim-in">
            {/* Green confirmation banner + service badge — single row on mobile */}
            <div className="flex flex-col items-center gap-1 sm:gap-0 mb-1.5 sm:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: '#10B981' }}
                >
                  check_circle
                </span>
                <h2 className="text-base sm:text-2xl font-semibold" style={{ color: '#10B981' }}>
                  {isAr ? 'أنت في الطابور!' : 'Vous êtes dans la file\u00A0!'}
                </h2>
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full"
                style={{ backgroundColor: serviceColors.bg }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '16px', color: serviceColors.accent }}
                >
                  {serviceIcon}
                </span>
                <span className="text-xs sm:text-sm font-medium" style={{ color: serviceColors.accent }}>
                  {displayServiceName}
                </span>
              </div>
            </div>

            {/* Ticket number + position — compact layout on mobile */}
            <div className="flex items-center gap-3 sm:gap-0 sm:flex-col mb-2 sm:mb-4">
              {/* Ticket number */}
              <div className="text-center sm:mb-3">
                <div
                  style={{
                    fontSize: 'clamp(36px, 7vh, 88px)',
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: serviceColors.accent,
                  }}
                >
                  {ticketData.ticket.ticketNumber}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                  {isAr ? 'رقم تذكرتك' : 'Votre numéro'}
                </p>
              </div>

              {/* Position + Wait time — inline on mobile, full-width card on sm+ */}
              {ticketData.position > 0 && (
                <div className="flex-1 sm:flex-none sm:w-full bg-white rounded-xl border border-gray-200 p-2.5 sm:p-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                    <div>
                      <div className="text-xl sm:text-3xl font-light text-gray-900">
                        #{ticketData.position}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isAr ? 'موقعك في الطابور' : 'Position dans la file'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-3xl font-light text-gray-900">
                        ~{ticketData.estimatedWaitMins}
                        <span className="text-xs sm:text-sm font-normal text-gray-400">min</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {isAr ? 'وقت الانتظار المقدر' : "Temps d'attente estimé"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══ Mode-specific section ══ */}
            {mode === 'phone' ? (
              /* ── Phone mode: SMS confirmation ── */
              <div className="anim-in-delay">
                <div
                  className="rounded-xl p-2.5 sm:p-4 mb-2 sm:mb-3"
                  style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}
                >
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>
                      sms
                    </span>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: '#1E40AF' }}>
                      {isAr ? 'تم إرسال رسالة إلى' : 'Un message a été envoyé au'}
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-medium" style={{ color: '#1E3A5F', direction: 'ltr' }}>
                    {phoneNumber}
                  </p>
                </div>

                <div
                  className="rounded-xl p-2.5 sm:p-3.5 mb-2 sm:mb-4 text-center"
                  style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
                >
                  <span className="material-symbols-outlined mb-0.5" style={{ fontSize: '20px', color: '#16A34A' }}>
                    directions_walk
                  </span>
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#166534' }}>
                    {isAr
                      ? 'يمكنك مغادرة الطابور بكل راحة.'
                      : 'Vous pouvez quitter la file en toute tranquillité.'}
                  </p>
                </div>

                {/* Subtle tracking link */}
                <div className="text-center">
                  <a
                    href={statusUrl}
                    className="text-xs underline"
                    style={{ color: '#9CA3AF' }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isAr ? 'متابعة عبر الإنترنت' : 'Suivre en ligne'}
                  </a>
                </div>
              </div>
            ) : (
              /* ── Classic mode: Print + QR + nudge ── */
              <div className="anim-in-delay">
                {/* Print option */}
                <div className="bg-white rounded-xl border border-gray-200 mb-2 sm:mb-3 overflow-hidden">
                  {isPrinting ? (
                    <div className="p-3 sm:p-4 text-center">
                      <span
                        className="material-symbols-outlined print-pulse mb-1 block"
                        style={{ fontSize: '32px', color: '#E9041E' }}
                      >
                        print
                      </span>
                      <p className="text-sm font-semibold text-gray-900">
                        {isAr ? 'جاري الطباعة...' : 'Impression en cours...'}
                      </p>
                    </div>
                  ) : printDone ? (
                    <div className="p-3 sm:p-4 text-center">
                      <span
                        className="material-symbols-outlined mb-1 block"
                        style={{ fontSize: '32px', color: '#10B981' }}
                      >
                        task_alt
                      </span>
                      <p className="text-sm font-semibold text-gray-900">
                        {isAr ? 'تم طباعة التذكرة!' : 'Ticket imprimé\u00A0!'}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handlePrint}
                      className="w-full p-2.5 sm:p-3.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
                      style={{ textAlign: isAr ? 'right' : 'left' }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#FEF2F2' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#E9041E' }}>
                          print
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                          {isAr ? 'طباعة التذكرة' : 'Imprimer mon ticket'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isAr ? 'راقب رقمك على شاشة العرض' : "Surveillez l'écran d'affichage"}
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* QR code + instructions — merged into one card */}
                <div
                  className="rounded-xl p-2.5 sm:p-3.5 mb-2 sm:mb-3 flex items-center gap-3 sm:gap-4"
                  style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                >
                  <QRCodeSVG
                    value={statusUrl}
                    size={72}
                    level="M"
                    className="flex-shrink-0 sm:hidden"
                  />
                  <QRCodeSVG
                    value={statusUrl}
                    size={96}
                    level="M"
                    className="flex-shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-600">
                      {isAr
                        ? 'امسح الرمز لمتابعة تذكرتك على هاتفك'
                        : 'Scannez pour suivre sur votre téléphone'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px', color: '#9CA3AF' }}>
                        tv
                      </span>
                      <span className="text-xs text-gray-500">
                        {isAr ? 'راقب رقمك على شاشة العرض' : "Surveillez l'écran d'affichage"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px', color: '#9CA3AF' }}>
                        directions_walk
                      </span>
                      <span className="text-xs text-gray-500">
                        {isAr ? 'توجه إلى الشباك المُشار إليه' : 'Présentez-vous au guichet indiqué'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nudge for next time */}
                <div
                  className="rounded-xl p-2 sm:p-2.5 text-center"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <p className="text-xs" style={{ color: '#92400E' }}>
                    <span className="material-symbols-outlined align-middle" style={{ fontSize: '13px' }}>
                      lightbulb
                    </span>
                    {' '}
                    {isAr
                      ? 'في المرة القادمة، جرب المتابعة عبر الهاتف — أكثر راحة!'
                      : 'La prochaine fois, essayez le suivi par téléphone — c\'est plus confortable\u00A0!'}
                  </p>
                </div>
              </div>
            )}

            {/* Finish button */}
            <div className="text-center mt-2 sm:mt-4">
              <button
                onClick={goHome}
                className="px-6 sm:px-8 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280', border: '1px solid #D1D5DB' }}
              >
                {isAr ? 'إنهاء' : 'Terminer'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
