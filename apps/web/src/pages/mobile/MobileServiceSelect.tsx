import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';

export default function MobileServiceSelect() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [services, setServices] = useState<any[]>([]);
  const [branchName, setBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [phone, setPhone] = useState('+216 ');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Format phone number as +216 XX XXX XXX
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/[^\d]/g, '');
    let formatted = '+216 ';
    const localDigits = digits.startsWith('216') ? digits.slice(3) : digits;

    if (localDigits.length > 0) formatted += localDigits.slice(0, 2);
    if (localDigits.length > 2) formatted += ' ' + localDigits.slice(2, 5);
    if (localDigits.length > 5) formatted += ' ' + localDigits.slice(5, 8);

    return formatted;
  };

  // Get raw phone number for API
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
    const fetchData = async () => {
      try {
        // Get branch queue status which includes services (public endpoint)
        const statusResponse = await queueApi.getBranchStatus(branchId!);
        setBranchName(statusResponse.data.data.branchName);
        setServices(statusResponse.data.data.services || []);
      } catch {
        setError(t('errors.networkError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [branchId, t]);

  const handleSubmit = async () => {
    if (!selectedService) return;

    setIsCreating(true);
    setError('');

    try {
      const rawPhone = getRawPhone();
      const response = await queueApi.checkin({
        branchId: branchId!,
        serviceCategoryId: selectedService,
        customerPhone: rawPhone,
        notificationChannel: rawPhone ? 'sms' : 'none',
        checkinMethod: 'mobile',
      });

      navigate(`/ticket/${response.data.data.ticket.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.serverError'));
    } finally {
      setIsCreating(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold">BléSaf</span>
          <button onClick={toggleLanguage} className="text-sm opacity-80">
            {i18n.language === 'fr' ? 'العربية' : 'Français'}
          </button>
        </div>
        <h1 className="text-lg font-semibold">{branchName}</h1>
        <p className="opacity-90">{t('mobile.selectService')}</p>
      </div>

      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Service list */}
        <div className="space-y-3 mb-6">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedService === service.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-3xl">{service.icon || '📋'}</span>
              <div className="flex-1 text-start">
                <div className="font-medium text-gray-900">
                  {i18n.language === 'ar' ? service.nameAr : service.nameFr}
                </div>
                <div className="text-sm text-gray-500">{service.prefix}</div>
              </div>
              {selectedService === service.id && (
                <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Phone input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('kiosk.enterPhone')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="+216 XX XXX XXX"
            className="input"
            dir="ltr"
          />
          <p className="text-xs text-gray-500 mt-1">{t('kiosk.phoneOptional')}</p>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedService || isCreating}
          className="btn-primary w-full py-4 text-lg disabled:opacity-50"
        >
          {isCreating ? t('common.loading') : t('kiosk.getTicket')}
        </button>
      </div>
    </div>
  );
}
