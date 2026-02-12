import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuthStore();

  const isAdmin = user?.role === 'bank_admin' || user?.role === 'super_admin';
  const isBranchManager = user?.role === 'branch_manager';

  const navigation: NavItem[] = [
    ...(isBranchManager
      ? [{ name: t('manager.dashboard'), href: '/manager', icon: 'dashboard' }]
      : []),
    ...(isAdmin
      ? [
          { name: t('admin.dashboard'), href: '/admin', icon: 'dashboard' },
          { name: t('admin.branches'), href: '/admin/branches', icon: 'store' },
          { name: t('admin.users'), href: '/admin/users', icon: 'group' },
          { name: t('admin.services'), href: '/admin/services', icon: 'list' },
          { name: 'Templates', href: '/admin/templates', icon: 'description' },
          { name: t('branchGroups.title'), href: '/admin/branch-groups', icon: 'hub' },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      {/* ===== Desktop: Expandable Rail Sidebar (90px → 240px on hover, pushes content) ===== */}
      <aside
        className="group/rail hidden lg:flex lg:flex-col flex-shrink-0 sticky top-0 h-screen bg-white border-e border-gray-200 z-30 overflow-hidden"
        style={{
          width: 90,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.width = '240px'; }}
        onMouseLeave={(e) => { e.currentTarget.style.width = '90px'; }}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center justify-center border-b border-gray-200">
          <img src="/uib-logo.png" alt="UIB" className="h-8 w-auto flex-shrink-0" />
        </div>

        {/* Scope label — revealed on expand */}
        <div className="px-2 py-3 border-b border-gray-100 whitespace-nowrap overflow-hidden">
          <div className="flex items-center" style={{ paddingInlineStart: 27, gap: 12 }}>
            <span className="material-symbols-outlined flex-shrink-0 text-gray-400" style={{ fontSize: 20 }}>account_balance</span>
            <span className="text-[13px] font-semibold truncate opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-100" style={{ color: SG_COLORS.black }}>
              {t('admin.allBranches')}
            </span>
          </div>
        </div>

        {/* Navigation Icons → Icons + Labels on expand */}
        <nav className="flex-1 flex flex-col px-2 pt-3 gap-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.href === '/admin'
              ? location.pathname === '/admin'
              : location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center h-11 rounded-[10px] transition-colors whitespace-nowrap overflow-hidden"
                style={{
                  backgroundColor: isActive ? SG_COLORS.black : undefined,
                  color: isActive ? 'white' : '#9CA3AF',
                  paddingInlineStart: 26,
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '';
                }}
              >
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 22 }}>
                  {item.icon}
                </span>
                <span className="text-[13px] font-medium opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-100">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Section — avatar always visible, info revealed on expand */}
        <div className="border-t border-gray-200 px-3 py-3 whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'rgba(26,26,26,0.08)', color: SG_COLORS.black }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-100">
              <p className="text-[13px] font-semibold truncate" style={{ color: SG_COLORS.black }}>
                {user?.name}
              </p>
              <p className="text-[11px]" style={{ color: SG_COLORS.gray }}>
                {t(`roles.${user?.role}`)}
              </p>
            </div>
          </div>
          {/* Action links — visible on expand */}
          <div className="flex gap-1 mt-2 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-100">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md hover:bg-gray-100 transition-colors"
              style={{ color: SG_COLORS.gray }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>language</span>
              {i18n.language === 'fr' ? 'العربية' : 'Français'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md hover:bg-red-50 transition-colors"
              style={{ color: SG_COLORS.rose }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Mobile: Top Header with Hamburger ===== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: SG_COLORS.gray }}>
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
        <img src="/uib-logo.png" alt="UIB" className="h-7 w-auto" />
      </header>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-gray-600/50 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 start-0 w-64 bg-white z-50 flex flex-col shadow-xl">
            {/* Drawer header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
              <img src="/uib-logo.png" alt="UIB" className="h-7 w-auto" />
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: SG_COLORS.gray }}>close</span>
              </button>
            </div>
            {/* Scope label */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>account_balance</span>
              <p className="text-[13px] font-semibold" style={{ color: SG_COLORS.black }}>{t('admin.allBranches')}</p>
            </div>
            {/* Drawer nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = item.href === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? SG_COLORS.black : undefined,
                      color: isActive ? 'white' : SG_COLORS.gray,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            {/* Drawer footer — user info */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'rgba(26,26,26,0.08)', color: SG_COLORS.black }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: SG_COLORS.black }}>{user?.name}</p>
                  <p className="text-xs" style={{ color: SG_COLORS.gray }}>{t(`roles.${user?.role}`)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleLanguage}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-100"
                  style={{ color: SG_COLORS.gray }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>language</span>
                  {i18n.language === 'fr' ? 'العربية' : 'Français'}
                </button>
                <button onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-red-50"
                  style={{ color: SG_COLORS.rose }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Main Content (flex-1 so it shrinks when sidebar expands) ===== */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
