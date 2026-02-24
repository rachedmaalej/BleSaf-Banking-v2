import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import KioskHeader from '@/components/kiosk/KioskHeader';

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

  const ticketData = (location.state as any)?.ticketData as TicketData | undefined;
  const mode: 'phone' | 'classic' = (location.state as any)?.mode || 'classic';
  const phoneNumber: string = (location.state as any)?.phoneNumber || '';
  const serviceName = (location.state as any)?.serviceName || '';
  const serviceNameAr = (location.state as any)?.serviceNameAr || '';
  const branchName = (location.state as any)?.branchName || '';

  const isAr = i18n.language === 'ar';
  const displayServiceName = isAr ? serviceNameAr : serviceName;

  const [isPrinting, setIsPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Redirect if no ticket data
  useEffect(() => {
    if (!ticketData) navigate(`/kiosk/${branchId}`);
  }, [ticketData, branchId, navigate]);

  // Countdown + auto-redirect after 10 seconds
  useEffect(() => {
    if (!ticketData) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(`/kiosk/${branchId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ticketData, branchId, navigate]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintDone(true);
    }, 2000);
  };

  const handleCopyLink = async () => {
    const statusUrl = `${window.location.origin}/status/${ticketData?.ticket.id}`;
    try {
      await navigator.clipboard.writeText(statusUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Fallback for older browsers / insecure contexts
      const input = document.createElement('input');
      input.value = statusUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const goHome = () => navigate(`/kiosk/${branchId}`);

  if (!ticketData) return null;

  const statusUrl = `${window.location.origin}/status/${ticketData.ticket.id}`;
  // SVG circle countdown: radius=18, circumference≈113
  const CIRC = 2 * Math.PI * 18;
  const dashOffset = CIRC * (1 - countdown / 10);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-off-white">
      {/* Header — no lang toggle on confirmation screens */}
      <KioskHeader branchName={branchName} showLangToggle={false} />

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-10">
        <div className="max-w-xl w-full flex flex-col gap-4">

          {/* ── Top Section (centered) ── */}
          <div className="text-center">
            {/* Status row */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-k-green text-[20px]">check_circle</span>
              <span className="font-barlow-c font-bold text-base uppercase tracking-wide text-k-green">
                {isAr ? 'أنت في الطابور!' : 'VOUS ÊTES DANS LA FILE\u00A0!'}
              </span>
            </div>

            {/* Service label */}
            <p className="text-xs text-light text-center mb-1 font-barlow">
              {displayServiceName}
            </p>

            {/* Ticket number */}
            <div className="font-barlow-c font-extrabold text-7xl text-near-black leading-none text-center mb-0.5">
              {ticketData.ticket.ticketNumber}
            </div>

            {/* Sub-label */}
            <p className="text-[10px] text-light text-center mb-3 font-barlow">
              {isAr ? 'رقم تذكرتك' : 'Votre numéro'}
            </p>

            {/* Stats bar */}
            {ticketData.position > 0 && (
              <div className="inline-flex gap-8 bg-white border border-pale rounded-lg px-8 py-3">
                <div className="text-center">
                  <div className="font-barlow-c font-extrabold text-3xl text-near-black">
                    #{ticketData.position}
                  </div>
                  <div className="text-[10px] text-light font-barlow">
                    {isAr ? 'موقعك في الطابور' : 'Position dans la file'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-barlow-c font-extrabold text-3xl text-near-black">
                    ~{ticketData.estimatedWaitMins}
                    <span className="text-sm font-normal text-light">min</span>
                  </div>
                  <div className="text-[10px] text-light font-barlow">
                    {isAr ? 'وقت الانتظار المقدر' : "Temps d'attente estimé"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Middle Section: 2-Column Cards ── */}
          {mode === 'phone' ? (
            /* ═══ SMS Mode: SMS Card + Que Faire ═══ */
            <div className="grid grid-cols-2 gap-3">
              {/* SMS Card */}
              <div className="bg-k-green-light border border-k-green-border rounded-lg p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-k-green text-[16px]">sms</span>
                  <span className="text-xs text-k-green font-barlow">
                    {isAr ? 'تم إرسال رسالة إلى' : 'Un SMS a été envoyé au'}
                  </span>
                </div>
                <p className="font-mono font-bold text-sm text-dark mt-1" style={{ direction: 'ltr' }}>
                  {phoneNumber}
                </p>
              </div>

              {/* QR Code Card */}
              <div className="bg-white border border-pale rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                <QRCodeSVG
                  value={statusUrl}
                  size={96}
                  level="M"
                  includeMargin={false}
                />
                <p className="text-[10px] text-light font-barlow text-center leading-tight">
                  {isAr ? 'امسح لمتابعة موقعك' : 'Scannez pour suivre votre position'}
                </p>
              </div>
            </div>
          ) : (
            /* ═══ Print Mode: Print Card + Que Faire ═══ */
            <>
            <div className="grid grid-cols-2 gap-3">
              {/* Print Button Card */}
              <button
                onClick={handlePrint}
                disabled={isPrinting || printDone}
                className="bg-white border border-pale rounded-lg p-4 flex items-center justify-center gap-3 cursor-pointer transition-colors hover:border-brand-red hover:bg-brand-red-light disabled:cursor-default"
              >
                {isPrinting ? (
                  <>
                    <span className="material-symbols-outlined text-brand-red text-[24px] animate-pulse">print</span>
                    <span className="font-barlow-c font-bold text-base uppercase tracking-wide text-dark">
                      {isAr ? 'جاري الطباعة...' : 'IMPRESSION...'}
                    </span>
                  </>
                ) : printDone ? (
                  <>
                    <span className="material-symbols-outlined text-k-green text-[24px]">task_alt</span>
                    <span className="font-barlow-c font-bold text-base uppercase tracking-wide text-dark">
                      {isAr ? 'تمت الطباعة!' : 'IMPRIMÉ\u00A0!'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-brand-red text-[24px]">print</span>
                    <span className="font-barlow-c font-bold text-base uppercase tracking-wide text-dark">
                      {isAr ? 'طباعة تذكرتي' : 'IMPRIMER MON TICKET'}
                    </span>
                  </>
                )}
              </button>

              {/* QR Code Card */}
              <div className="bg-white border border-pale rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                <QRCodeSVG
                  value={statusUrl}
                  size={96}
                  level="M"
                  includeMargin={false}
                />
                <p className="text-[10px] text-light font-barlow text-center leading-tight">
                  {isAr ? 'امسح لمتابعة موقعك' : 'Scannez pour suivre votre position'}
                </p>
              </div>
            </div>

            {/* Copy status link button */}
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
                linkCopied
                  ? 'border-k-green bg-k-green-light'
                  : 'border-pale bg-white hover:border-brand-red hover:bg-brand-red-light'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${linkCopied ? 'text-k-green' : 'text-brand-red'}`}>
                {linkCopied ? 'check_circle' : 'content_copy'}
              </span>
              <span className="font-barlow-c font-bold text-xs uppercase tracking-wide text-dark">
                {linkCopied
                  ? (isAr ? 'تم نسخ الرابط!' : 'LIEN COPIÉ\u00A0!')
                  : (isAr ? 'نسخ رابط المتابعة' : 'COPIER LE LIEN DE SUIVI')}
              </span>
            </button>
            </>
          )}

          {/* ── Bottom Section ── */}

          {/* Freedom bar — only on SMS mode */}
          {mode === 'phone' && (
            <div className="bg-k-amber-light rounded-lg px-6 py-3 flex items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-k-amber-text text-[16px]">directions_walk</span>
              <span className="text-xs text-k-amber-text font-barlow">
                {isAr
                  ? 'يمكنك مغادرة الطابور بكل راحة.'
                  : 'Vous pouvez quitter la file en toute tranquillité.'}
              </span>
            </div>
          )}

          {/* Countdown + TERMINER */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {/* Circular countdown */}
            <div className="relative w-11 h-11 flex-shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                {/* Track */}
                <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                {/* Progress */}
                <circle
                  cx="22" cy="22" r="18"
                  fill="none"
                  stroke="#E9041E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-barlow-c font-extrabold text-sm text-near-black">
                {countdown}
              </span>
            </div>
            <button
              onClick={goHome}
              className="font-barlow-c font-bold text-sm uppercase tracking-[1.5px] border-2 border-pale bg-white text-mid px-8 py-3 rounded-lg hover:border-dark hover:text-dark transition-colors"
            >
              {isAr ? 'إنهاء' : 'TERMINER'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
