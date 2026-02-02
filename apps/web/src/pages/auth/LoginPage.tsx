import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { authApi, adminApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
  border: '#E0E0E0',
};

// Quick login users configuration
const QUICK_USERS = [
  {
    id: 'admin',
    label: 'Admin',
    email: 'bank.admin@demo-bank.tn',
    password: 'demo123',
    icon: 'admin_panel_settings',
    color: SG_COLORS.red,
  },
  {
    id: 'manager',
    label: 'Bank Manager',
    email: 'bank.admin@demo-bank.tn',
    password: 'demo123',
    icon: 'supervisor_account',
    color: SG_COLORS.black,
  },
  {
    id: 'teller1',
    label: 'Teller 1',
    email: 'teller1@demo-bank.tn',
    password: 'demo123',
    icon: 'person',
    color: SG_COLORS.rose,
  },
  {
    id: 'teller2',
    label: 'Teller 2',
    email: 'teller2@demo-bank.tn',
    password: 'demo123',
    icon: 'person',
    color: SG_COLORS.gray,
  },
];

// Display navigation options
const DISPLAY_OPTIONS = [
  {
    id: 'tv',
    label: 'TV Display',
    icon: 'tv',
    color: SG_COLORS.black,
    path: '/display',
  },
  {
    id: 'kiosk',
    label: 'Kiosk',
    icon: 'touch_app',
    color: SG_COLORS.red,
    path: '/kiosk',
  },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [pendingDisplayPath, setPendingDisplayPath] = useState<string>('');

  const from = (location.state as any)?.from?.pathname || '/admin';

  // Load Material Symbols font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Fetch branches for display selection
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await adminApi.listBranches();
        setBranches(response.data.data || []);
        if (response.data.data?.length > 0) {
          setSelectedBranch(response.data.data[0].id);
        }
      } catch {
        // Silently fail - branches will be empty
      }
    };
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user } = response.data.data;

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
        // Continue even if /me fails
      }

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
      setLoadingUser(null);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const handleQuickLogin = async (user: typeof QUICK_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
    setLoadingUser(user.id);
    setError('');

    try {
      const response = await authApi.login(user.email, user.password);
      const { accessToken, refreshToken, user: userData } = response.data.data;

      setAuth({
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          tenantId: userData.tenantId,
          branchId: userData.branchId,
        },
        accessToken,
        refreshToken,
      });

      try {
        const meResponse = await authApi.me();
        const fullUser = meResponse.data.data;
        setAuth({
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            tenantId: userData.tenantId,
            branchId: userData.branchId,
          },
          tenant: fullUser.tenant,
          branch: fullUser.branch,
          accessToken,
          refreshToken,
        });
      } catch {
        // Continue
      }

      if (userData.role === 'teller') {
        navigate('/teller');
      } else if (userData.role === 'branch_manager') {
        navigate('/manager');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
      setLoadingUser(null);
    }
  };

  const handleDisplayNavigation = (option: typeof DISPLAY_OPTIONS[0]) => {
    if (branches.length === 0) {
      setError('No branches available');
      return;
    }
    setPendingDisplayPath(option.path);
    setShowBranchModal(true);
  };

  const confirmBranchSelection = () => {
    if (selectedBranch && pendingDisplayPath) {
      navigate(`${pendingDisplayPath}/${selectedBranch}`);
    }
    setShowBranchModal(false);
  };

  return (
    <>
      <style>{`
        .login-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          height: 100vh;
          display: flex;
          background: linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%);
          overflow: hidden;
        }

        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px 40px;
          background: ${SG_COLORS.white};
          overflow-y: auto;
        }

        .login-right {
          flex: 1;
          display: none;
          background: linear-gradient(135deg, ${SG_COLORS.red} 0%, #B8031A 100%);
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .login-right {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
          }
        }

        .login-right::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }

        .login-right-content {
          position: relative;
          z-index: 1;
          text-align: center;
          color: white;
        }

        .login-right-title {
          font-size: 42px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -1px;
        }

        .login-right-subtitle {
          font-size: 16px;
          opacity: 0.9;
          max-width: 360px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .login-logo {
          height: 50px;
          margin-bottom: 12px;
          display: block;
        }

        .login-title {
          font-size: 18px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 4px;
        }

        .login-subtitle {
          font-size: 11px;
          color: ${SG_COLORS.gray};
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 500;
          color: ${SG_COLORS.black};
        }

        .form-input {
          padding: 10px 14px;
          border: 1px solid ${SG_COLORS.border};
          border-radius: 8px;
          font-size: 14px;
          color: ${SG_COLORS.black};
          background: ${SG_COLORS.white};
          transition: all 0.2s ease;
          outline: none;
        }

        .form-input:focus {
          border-color: ${SG_COLORS.red};
          box-shadow: 0 0 0 3px rgba(233, 4, 30, 0.1);
        }

        .form-input::placeholder {
          color: #999;
        }

        .login-button {
          padding: 10px 20px;
          background: ${SG_COLORS.red};
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .login-button:hover:not(:disabled) {
          background: #C70318;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(233, 4, 30, 0.3);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: ${SG_COLORS.border};
        }

        .divider-text {
          font-size: 11px;
          font-weight: 500;
          color: ${SG_COLORS.gray};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quick-section-title {
          font-size: 11px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quick-buttons-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .quick-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 8px;
          background: ${SG_COLORS.white};
          border: 1px solid ${SG_COLORS.border};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .quick-button:hover:not(:disabled) {
          border-color: var(--accent-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }

        .quick-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .quick-button-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quick-button-icon .material-symbols-outlined {
          font-size: 18px;
          color: white;
        }

        .quick-button-label {
          font-size: 11px;
          font-weight: 500;
          color: ${SG_COLORS.black};
        }

        .display-buttons {
          display: flex;
          gap: 8px;
        }

        .display-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: ${SG_COLORS.lightGray};
          border: 1px solid ${SG_COLORS.border};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .display-button:hover {
          background: ${SG_COLORS.white};
          border-color: var(--accent-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .display-button-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .display-button-icon .material-symbols-outlined {
          font-size: 18px;
          color: white;
        }

        .display-button-label {
          font-size: 12px;
          font-weight: 600;
          color: ${SG_COLORS.black};
        }

        .language-toggle {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 6px 12px;
          border: 1px solid ${SG_COLORS.border};
          border-radius: 16px;
          background: ${SG_COLORS.white};
          font-size: 12px;
          color: ${SG_COLORS.gray};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .language-toggle:hover {
          border-color: ${SG_COLORS.red};
          color: ${SG_COLORS.red};
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Branch Selection Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 360px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 6px;
        }

        .modal-subtitle {
          font-size: 13px;
          color: ${SG_COLORS.gray};
          margin-bottom: 16px;
        }

        .branch-select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid ${SG_COLORS.border};
          border-radius: 8px;
          font-size: 14px;
          color: ${SG_COLORS.black};
          background: ${SG_COLORS.white};
          margin-bottom: 16px;
          cursor: pointer;
        }

        .branch-select:focus {
          outline: none;
          border-color: ${SG_COLORS.red};
        }

        .modal-buttons {
          display: flex;
          gap: 10px;
        }

        .modal-button {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-button-cancel {
          background: ${SG_COLORS.lightGray};
          border: 1px solid ${SG_COLORS.border};
          color: ${SG_COLORS.gray};
        }

        .modal-button-cancel:hover {
          background: ${SG_COLORS.white};
        }

        .modal-button-confirm {
          background: ${SG_COLORS.red};
          border: none;
          color: white;
        }

        .modal-button-confirm:hover {
          background: #C70318;
        }
      `}</style>

      <div className="login-page">
        {/* Left side - Login form */}
        <div className="login-left">
          <button onClick={toggleLanguage} className="language-toggle">
            {i18n.language === 'fr' ? 'العربية' : 'Français'}
          </button>

          <div className="login-card">
            <div className="login-header">
              <img src="/uib-logo.png" alt="UIB" className="login-logo" />
              <h1 className="login-title">BléSaf</h1>
              <p className="login-subtitle">{t('auth.subtitle')}</p>
            </div>

            <form id="login-form" onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="spinner" />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                    {t('auth.loginButton')}
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">Quick Access</span>
              <div className="divider-line" />
            </div>

            {/* Quick Login Buttons */}
            <div className="quick-section-title">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: SG_COLORS.gray }}>
                bolt
              </span>
              Staff Login
            </div>
            <div className="quick-buttons-grid">
              {QUICK_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleQuickLogin(user)}
                  className="quick-button"
                  style={{ '--accent-color': user.color } as React.CSSProperties}
                  disabled={loadingUser !== null}
                >
                  <div
                    className="quick-button-icon"
                    style={{ background: user.color }}
                  >
                    {loadingUser === user.id ? (
                      <div className="spinner" />
                    ) : (
                      <span className="material-symbols-outlined">{user.icon}</span>
                    )}
                  </div>
                  <div className="quick-button-label">{user.label}</div>
                </button>
              ))}
            </div>

            {/* Display Navigation Buttons */}
            <div className="quick-section-title">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: SG_COLORS.gray }}>
                monitor
              </span>
              Public Displays
            </div>
            <div className="display-buttons">
              {DISPLAY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleDisplayNavigation(option)}
                  className="display-button"
                  style={{ '--accent-color': option.color } as React.CSSProperties}
                >
                  <div
                    className="display-button-icon"
                    style={{ background: option.color }}
                  >
                    <span className="material-symbols-outlined">{option.icon}</span>
                  </div>
                  <span className="display-button-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="login-right" />

        {/* Branch Selection Modal */}
        {showBranchModal && (
          <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Select Branch</h3>
              <p className="modal-subtitle">Choose a branch to view the display</p>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="branch-select"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <div className="modal-buttons">
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="modal-button modal-button-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBranchSelection}
                  className="modal-button modal-button-confirm"
                >
                  Open Display
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
