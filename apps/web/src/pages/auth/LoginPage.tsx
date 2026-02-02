import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user } = response.data.data;

      // Set tokens first so subsequent API calls are authenticated
      setAuth({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          branchId: user.branchId,
        },
        accessToken,
        refreshToken,
      });

      // Now fetch full user info (with tenant/branch details)
      try {
        const meResponse = await authApi.me();
        const fullUser = meResponse.data.data;
        setAuth({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
          },
          tenant: fullUser.tenant,
          branch: fullUser.branch,
          accessToken,
          refreshToken,
        });
      } catch {
        // Continue even if /me fails - we have basic user info
      }

      // Navigate based on role
      if (user.role === 'teller') {
        navigate('/teller');
      } else if (user.role === 'branch_manager') {
        navigate('/manager');
      } else {
        navigate(from);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  // Quick login for development/testing
  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    // Trigger form submission after state update
    setTimeout(() => {
      document.getElementById('login-form')?.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }, 50);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-4">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLanguage}
            className="text-white/80 hover:text-white text-sm flex items-center gap-2"
          >
            {i18n.language === 'fr' ? 'العربية' : 'Français'}
          </button>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">BléSaf</h1>
            <p className="text-gray-600">{t('auth.subtitle')}</p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>
          </form>

          {/* Quick login buttons for development */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center mb-3">Quick login (dev)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => quickLogin('teller1@demo-bank.tn', 'demo123')}
                className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Teller 1
              </button>
              <button
                type="button"
                onClick={() => quickLogin('teller2@demo-bank.tn', 'demo123')}
                className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Teller 2
              </button>
              <button
                type="button"
                onClick={() => quickLogin('bank.admin@demo-bank.tn', 'demo123')}
                className="flex-1 px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
