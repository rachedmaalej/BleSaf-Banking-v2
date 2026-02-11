import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

  // Redirect if no ticket data
  useEffect(() => {
    if (!ticketData) navigate(`/kiosk/${branchId}`);
  }, [ticketData, branchId, navigate]);

  // Auto-redirect after 10 seconds
  useEffect(() => {
    if (!ticketData) return;
    const timer = setTimeout(() => navigate(`/kiosk/${branchId}`), 10000);
    return () => clearTimeout(timer);
  }, [ticketData, branchId, navigate]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintDone(true);
    }, 2000);
  };

  const goHome = () => navigate(`/kiosk/${branchId}`);

  if (!ticketData) return null;

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

              {/* Que Faire Card */}
              <div className="bg-white border border-pale rounded-lg p-4">
                <p className="font-barlow-c font-bold text-[10px] tracking-[2px] uppercase text-light mb-2">
                  {isAr ? 'ماذا تفعل الآن؟' : 'QUE FAIRE MAINTENANT\u00A0?'}
                </p>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-light text-[16px]">
                    phone_iphone
                  </span>
                  <span className="text-xs text-mid leading-relaxed font-barlow">
                    {isAr
                      ? 'اضغط على الرابط الموجود في الرسالة وتابع تقدمك في الطابور على هاتفك'
                      : "Cliquez sur le lien contenu dans le SMS et suivez votre progression dans la file d'attente sur votre téléphone"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ═══ Print Mode: Print Card + Que Faire ═══ */
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

              {/* Que Faire Card */}
              <div className="bg-white border border-pale rounded-lg p-4">
                <p className="font-barlow-c font-bold text-[10px] tracking-[2px] uppercase text-light mb-2">
                  {isAr ? 'ماذا تفعل الآن؟' : 'QUE FAIRE MAINTENANT\u00A0?'}
                </p>
                {/* Instruction 1: QR */}
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-light text-[16px]">
                    qr_code_scanner
                  </span>
                  <span className="text-xs text-mid leading-relaxed font-barlow">
                    {isAr
                      ? 'امسح رمز QR على تذكرتك لمتابعة موقعك على هاتفك'
                      : 'Scannez le QR code sur votre ticket pour suivre votre position sur votre téléphone'}
                  </span>
                </div>
                {/* Instruction 2: TV */}
                <div className="flex items-start gap-2 mt-1">
                  <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-light text-[16px]">
                    tv
                  </span>
                  <span className="text-xs text-mid leading-relaxed font-barlow">
                    {isAr
                      ? 'أو تابع رقمك على شاشة العرض في قاعة الانتظار'
                      : "Ou suivez votre numéro sur l'écran d'affichage dans la salle d'attente"}
                  </span>
                </div>
              </div>
            </div>
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

          {/* TERMINER button */}
          <div className="text-center mt-2">
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
