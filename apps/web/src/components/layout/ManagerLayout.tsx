import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
};

interface NavItem {
  name: string;
  href: string;
  icon: string;
  disabled?: boolean;
}

export default function ManagerLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, branch, logout } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Navigation items for Branch Manager
  const navigation: NavItem[] = [
    {
      name: t('manager.dashboard'),
      href: '/manager',
      icon: 'dashboard',
    },
    {
      name: t('manager.reports', 'Rapports'),
      href: '/manager/reports',
      icon: 'analytics',
    },
    {
      name: t('manager.settings', 'Parametres'),
      href: '/manager/settings',
      icon: 'settings',
    },
  ];

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left: Logo + Branch Name */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: SG_COLORS.gray }}>
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* UIB Logo */}
            <img src="/uib-logo.png" alt="UIB" className="h-9 w-auto" />

            {/* Branch Name */}
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                {branch?.name || 'BléSaf'}
              </h1>
            </div>
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.disabled ? '#' : item.href}
                  onClick={(e) => item.disabled && e.preventDefault()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isActive
                      ? 'text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: isActive && !item.disabled ? SG_COLORS.black : undefined,
                    color: isActive && !item.disabled ? 'white' : SG_COLORS.gray,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {item.icon}
                  </span>
                  {item.name}
                  {item.disabled && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: SG_COLORS.gray }}
                    >
                      Bientôt
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Language + User */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: SG_COLORS.gray }}
            >
              {i18n.language === 'fr' ? 'عربية' : 'Français'}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(26, 26, 26, 0.1)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium" style={{ color: SG_COLORS.black }}>
                  {user?.name}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: SG_COLORS.gray }}>
                  {userMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium" style={{ color: SG_COLORS.black }}>
                      {user?.name}
                    </p>
                    <p className="text-xs" style={{ color: SG_COLORS.gray }}>
                      {t(`roles.${user?.role}`)}
                    </p>
                  </div>

                  {/* Language (mobile) */}
                  <button
                    onClick={() => {
                      toggleLanguage();
                      setUserMenuOpen(false);
                    }}
                    className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: SG_COLORS.gray }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      translate
                    </span>
                    {i18n.language === 'fr' ? 'العربية' : 'Français'}
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                    style={{ color: SG_COLORS.rose }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      logout
                    </span>
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
            <nav className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.disabled ? '#' : item.href}
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault();
                      } else {
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isActive
                        ? 'text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: isActive && !item.disabled ? SG_COLORS.black : undefined,
                      color: isActive && !item.disabled ? 'white' : SG_COLORS.gray,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                      {item.icon}
                    </span>
                    {item.name}
                    {item.disabled && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded ml-auto"
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                      >
                        Bientôt
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content (with top padding for fixed header) */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Load Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
    </div>
  );
}
