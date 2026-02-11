import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface KioskHeaderProps {
  branchName: string;
  showBack?: boolean;
  showLangToggle?: boolean;
}

export default function KioskHeader({
  branchName,
  showBack = false,
  showLangToggle = true,
}: KioskHeaderProps) {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <header className="flex justify-between items-center px-8 py-3 bg-white border-b-2 border-pale flex-shrink-0">
      {/* Left cluster */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(`/kiosk/${branchId}`)}
            className="text-light cursor-pointer hover:text-mid transition-colors font-barlow text-sm"
          >
            ←
          </button>
        )}
        <img src="/uib-logo.png" alt="UIB" className="h-10 w-auto" />
        <span className="text-light text-sm font-barlow">
          {branchName}
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-4">
        {showLangToggle && (
          <button
            onClick={toggleLanguage}
            className="border border-pale rounded-full px-3 py-1 text-xs text-mid hover:bg-gray-50 transition-colors"
          >
            {i18n.language === 'fr' ? 'العربية' : 'Français'}
          </button>
        )}
        <span className="text-2xl font-light" style={{ color: '#1C1B1F' }}>
          {timeString}
        </span>
      </div>
    </header>
  );
}
