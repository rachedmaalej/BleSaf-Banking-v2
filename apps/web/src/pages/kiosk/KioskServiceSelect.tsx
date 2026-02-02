import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueApi } from '@/lib/api';

interface ServiceCategory {
  id: string;
  nameAr: string;
  nameFr: string;
  prefix: string;
  icon: string | null;
}

// Main service categories to display on kiosk (in display order)
const MAIN_SERVICES = ['Retrait', 'Dépôt', 'Ouverture de compte'];

// Service colors - Subtle Elegance (white cards with colored left border)
const SERVICE_COLORS: Record<string, { bg: string; accent: string; border: string }> = {
  'Retrait': { bg: '#FFFFFF', accent: '#E9041E', border: '#E9041E' },      // SG Red
  'Dépôt': { bg: '#FFFFFF', accent: '#1A1A1A', border: '#1A1A1A' },        // Black
  'Ouverture de compte': { bg: '#FFFFFF', accent: '#D66874', border: '#D66874' },  // Rose
  'Autres': { bg: '#FFFFFF', accent: '#666666', border: '#666666' },       // Gray
};

// Material Symbols icon names for each service
const SERVICE_ICONS: Record<string, string> = {
  'Retrait': 'local_atm',
  'Dépôt': 'savings',
  'Ouverture de compte': 'person_add',
  'Autres': 'more_horiz',
};

interface DisplayOption {
  key: string;
  nameFr: string;
  nameAr: string;
  icon: string;
  bgColor: string;
  accentColor: string;
  borderColor: string;
  serviceId: string;
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
        const response = await queueApi.getBranchStatus(branchId!);
        setBranchName(response.data.data.branchName);
        setServices(response.data.data.services || []);
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

  // Build display options from services
  const displayOptions: DisplayOption[] = [];
  let autresServiceId: string | null = null;

  services.forEach((service) => {
    if (MAIN_SERVICES.includes(service.nameFr)) {
      const colors = SERVICE_COLORS[service.nameFr] || SERVICE_COLORS['Autres'];
      // Add main services directly
      displayOptions.push({
        key: service.id,
        nameFr: service.nameFr,
        nameAr: service.nameAr,
        icon: SERVICE_ICONS[service.nameFr] || 'category',
        bgColor: colors.bg,
        accentColor: colors.accent,
        borderColor: colors.border,
        serviceId: service.id,
      });
    } else if (service.nameFr === 'Autres') {
      // Found a service explicitly named "Autres"
      autresServiceId = service.id;
    } else if (!autresServiceId) {
      // Use the first "other" service as the catch-all for "Autres"
      autresServiceId = service.id;
    }
  });

  // Sort main services in the desired order
  displayOptions.sort((a, b) => {
    return MAIN_SERVICES.indexOf(a.nameFr) - MAIN_SERVICES.indexOf(b.nameFr);
  });

  // Add "Autres" button if there's a service for it
  if (autresServiceId) {
    const autresColors = SERVICE_COLORS['Autres'];
    displayOptions.push({
      key: 'autres',
      nameFr: 'Autres',
      nameAr: 'أخرى',
      icon: SERVICE_ICONS['Autres'],
      bgColor: autresColors.bg,
      accentColor: autresColors.accent,
      borderColor: autresColors.border,
      serviceId: autresServiceId,
    });
  }

  const handleSelectService = (option: DisplayOption) => {
    navigate(`/kiosk/${branchId}/confirm`, {
      state: {
        serviceId: option.serviceId,
        serviceName: option.nameFr,
        serviceNameAr: option.nameAr,
        branchName,
      },
    });
  };

  const getOptionName = (option: DisplayOption) => {
    return i18n.language === 'ar' ? option.nameAr : option.nameFr;
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

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-0">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-4 sm:mb-6">
            {t('kiosk.selectService')}
          </h2>

          {/* Service cards - responsive grid */}
          <div
            className="grid gap-3 sm:gap-4 lg:gap-6 w-full justify-center"
            style={{
              gridTemplateColumns: `repeat(${Math.min(displayOptions.length, 4)}, minmax(140px, 200px))`,
              maxWidth: '900px',
            }}
          >
            {displayOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => handleSelectService(option)}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 sm:gap-4 cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                style={{
                  backgroundColor: option.bgColor,
                  border: '1px solid #E0E0E0',
                  borderLeft: `4px solid ${option.borderColor}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {/* Material Symbol Icon */}
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 'clamp(40px, 8vw, 64px)',
                    color: option.accentColor,
                    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
                  }}
                >
                  {option.icon}
                </span>
                {/* Label */}
                <span
                  className="text-base sm:text-lg lg:text-xl font-medium text-center px-2"
                  style={{ color: '#1A1A1A' }}
                >
                  {getOptionName(option)}
                </span>
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm sm:text-base mt-4 sm:mt-6">
            {t('kiosk.touchToSelect')}
          </p>
        </main>
      </div>
    </>
  );
}
