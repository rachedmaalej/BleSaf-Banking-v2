import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  LanguageIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuthStore();

  const isAdmin = user?.role === 'bank_admin' || user?.role === 'super_admin';
  const isManager = user?.role === 'branch_manager' || isAdmin;

  const navigation = [
    ...(isManager
      ? [
          {
            name: t('manager.dashboard'),
            href: '/manager',
            icon: HomeIcon,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            name: t('admin.dashboard'),
            href: '/admin',
            icon: HomeIcon,
          },
          {
            name: t('admin.branches'),
            href: '/admin/branches',
            icon: BuildingOfficeIcon,
          },
          {
            name: t('admin.users'),
            href: '/admin/users',
            icon: UsersIcon,
          },
          {
            name: t('admin.services'),
            href: '/admin/services',
            icon: QueueListIcon,
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 start-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="text-xl font-bold text-primary-600">BléSaf</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-e border-gray-200">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b">
            <span className="text-2xl font-bold gradient-text">BléSaf</span>
          </div>

          {/* Tenant name */}
          {tenant && (
            <div className="px-6 py-3 border-b bg-gray-50">
              <p className="text-xs text-gray-500">{t('admin.allBranches')}</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {tenant.name}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {t(`roles.${user?.role}`)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleLanguage}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <LanguageIcon className="h-4 w-4" />
                {i18n.language === 'fr' ? 'العربية' : 'Français'}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ps-64">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="text-xl font-bold text-primary-600">BléSaf</span>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
