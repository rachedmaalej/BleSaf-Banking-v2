import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';
import KioskHeader from '@/components/kiosk/KioskHeader';
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

  const isAr = i18n.language === 'ar';

  const [phoneDigits, setPhoneDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Idle timeout
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => navigate(`/kiosk/${branchId}`), 60000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [branchId, navigate]);

  // Redirect if no service selected
  useEffect(() => {
    if (!serviceId) navigate(`/kiosk/${branchId}`);
  }, [serviceId, branchId, navigate]);

  const handleInteraction = () => resetIdleTimer();

  // Format phone digits as "XX XXX XXX"
  const formatDisplayDigits = (digits: string): string => {
    let f = '';
    if (digits.length > 0) f += digits.slice(0, 2);
    if (digits.length > 2) f += ' ' + digits.slice(2, 5);
    if (digits.length > 5) f += ' ' + digits.slice(5, 8);
    return f;
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
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Une erreur est survenue'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-off-white"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <KioskHeader branchName={branchName} showBack />

      {/* Title */}
      <div className="text-center py-4 flex-shrink-0">
        <h2 className="font-barlow-c font-bold text-2xl uppercase tracking-wide text-near-black">
          {isAr ? 'كيف تفضل الانتظار؟' : 'COMMENT SOUHAITEZ-VOUS ATTENDRE\u00A0?'}
        </h2>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-8 mb-2 px-4 py-2 rounded-lg text-sm text-center font-barlow"
          style={{ backgroundColor: '#FDE8EA', color: '#E9041E' }}>
          {error}
        </div>
      )}

      {/* 2-column layout with red accent bar */}
      <main className="flex-1 grid grid-cols-[3px_1fr_1fr] min-h-0">
        {/* Red accent bar (Scoreboard DNA) */}
        <div className="bg-brand-red" />

        {/* ═══ Left Panel: Phone Tracking (Recommended) ═══ */}
        <div className="bg-white p-6 flex flex-col min-h-0">
          {/* RECOMMANDÉ badge */}
          <span className="self-start bg-brand-red text-white font-barlow-c font-bold text-[10px] tracking-[2px] uppercase px-3 py-1 rounded mb-3">
            {isAr ? 'موصى به' : 'RECOMMANDÉ'}
          </span>

          {/* Title */}
          <h3 className="font-barlow-c font-bold text-lg uppercase text-near-black mb-2">
            {isAr ? 'تابع من هاتفك' : 'SUIVEZ DEPUIS VOTRE TÉLÉPHONE'}
          </h3>

          {/* Perk pills */}
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { fr: 'Position en direct', ar: 'موقعك مباشرة' },
              { fr: 'Temps estimé', ar: 'وقت الانتظار' },
              { fr: 'Alerte SMS', ar: 'تنبيه SMS' },
            ].map((perk) => (
              <div key={perk.fr} className="flex items-center gap-1">
                <span className="material-symbols-outlined text-k-green text-[14px]">check_circle</span>
                <span className="text-xs text-k-green font-barlow">{isAr ? perk.ar : perk.fr}</span>
              </div>
            ))}
          </div>

          {/* Phone input */}
          <div className="bg-off-white border border-pale rounded-lg px-4 py-3 mb-3">
            <span className="font-mono text-base text-light" style={{ direction: 'ltr', display: 'block' }}>
              {phoneDigits.length > 0
                ? `+216 ${formatDisplayDigits(phoneDigits)}`
                : '+216 __ ___ ___'}
            </span>
          </div>

          {/* Numpad */}
          <div className="flex-1 min-h-0">
            <NumericKeypad
              value={phoneDigits}
              onChange={(v) => { setPhoneDigits(v); handleInteraction(); }}
              onSubmit={handlePhoneSubmit}
              showConfirm
              confirmDisabled={phoneDigits.length !== 8 || isSubmitting}
            />
          </div>
        </div>

        {/* ═══ Right Panel: Classic Ticket ═══ */}
        <div className="bg-off-white border-l border-pale p-6 flex flex-col items-center justify-center text-center">
          {/* TV icon */}
          <span className="material-symbols-outlined text-light mb-4" style={{ fontSize: '36px' }}>
            tv
          </span>

          {/* Title */}
          <h3 className="font-barlow-c font-bold text-base uppercase text-dark mb-2">
            {isAr ? 'الانتظار في المكان' : 'ATTENDRE SUR PLACE'}
          </h3>

          {/* Description */}
          <p className="text-xs text-light leading-relaxed font-barlow mb-6">
            {isAr
              ? 'تابع رقمك على شاشة العرض في قاعة الانتظار.'
              : "Suivez votre numéro sur l'écran d'affichage dans la salle d'attente."}
          </p>

          {/* Classic button */}
          <button
            onClick={handleClassicSubmit}
            disabled={isSubmitting}
            className="font-barlow-c font-bold text-sm uppercase tracking-wide border-2 border-dark px-6 py-3 rounded-lg text-dark bg-transparent hover:bg-dark hover:text-white transition-colors disabled:opacity-40"
          >
            {isSubmitting
              ? (isAr ? 'جاري الإنشاء...' : 'CRÉATION...')
              : (isAr ? 'تذكرة عادية' : 'TICKET CLASSIQUE')}
          </button>
        </div>
      </main>
    </div>
  );
}
