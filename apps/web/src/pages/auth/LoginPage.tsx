import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { authApi, queueApi } from '@/lib/api';

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

interface Branch {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);

  const from = (location.state as any)?.from?.pathname;
  const returnTo = new URLSearchParams(location.search).get('returnTo');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = from || returnTo || getDefaultRoute(user.role);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user]);

  // Load branches for quick access links
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await queueApi.listBranches();
        setBranches(response.data.data || []);
      } catch {
        // Silent fail - quick access is optional
      }
    };
    fetchBranches();
  }, []);

  // Load Material Symbols font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  function getDefaultRoute(role: string): string {
    switch (role) {
      case 'super_admin': return '/admin';
      case 'bank_admin': return '/admin';
      case 'branch_manager': return '/manager';
      case 'teller': return '/teller';
      default: return '/login';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.login(email.trim(), password);
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

      // Fetch full user context (tenant, branch info)
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
        // Continue with basic auth data
      }

      const destination = from || returnTo || getDefaultRoute(userData.role);
      navigate(destination, { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Email ou mot de passe incorrect');
      } else if (status === 403) {
        setError('Compte desactive. Contactez votre administrateur.');
      } else if (!err.response) {
        setError('Serveur inaccessible. Verifiez votre connexion.');
      } else {
        setError(err.response?.data?.error || 'Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get first active branch for quick access links
  const firstActiveBranch = branches.find(b => b.status === 'active');

  return (
    <>
      <style>{`
        .login-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          display: flex;
          background: ${SG_COLORS.white};
        }

        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px;
          max-width: 560px;
          margin: 0 auto;
        }

        @media (min-width: 1024px) {
          .login-left {
            margin: 0;
            margin-left: auto;
            padding: 40px 80px 40px 40px;
          }
        }

        .login-right {
          display: none;
          flex: 1;
          background: url('/login-bg.jpg') center center / cover no-repeat;
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .login-right {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 60px;
          }
        }

        .login-right::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.45);
        }

        .login-right-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 400px;
        }

        .login-right-title {
          font-size: 36px;
          font-weight: 300;
          color: white;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .login-right-subtitle {
          font-size: 16px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }

        .login-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
        }

        .login-logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .login-logo {
          height: 40px;
        }

        .login-brand {
          font-size: 20px;
          font-weight: 700;
          color: ${SG_COLORS.black};
        }

        .language-toggle {
          padding: 6px 14px;
          border: 1px solid ${SG_COLORS.border};
          border-radius: 20px;
          background: ${SG_COLORS.white};
          font-size: 13px;
          color: ${SG_COLORS.gray};
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .language-toggle:hover {
          border-color: ${SG_COLORS.red};
          color: ${SG_COLORS.red};
        }

        .login-welcome {
          font-size: 28px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 6px;
        }

        .login-subtitle {
          font-size: 15px;
          color: ${SG_COLORS.gray};
          margin-bottom: 32px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: ${SG_COLORS.black};
        }

        .form-input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid ${SG_COLORS.border};
          border-radius: 10px;
          font-size: 15px;
          color: ${SG_COLORS.black};
          background: ${SG_COLORS.white};
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: ${SG_COLORS.red};
          box-shadow: 0 0 0 3px rgba(233, 4, 30, 0.1);
        }

        .form-input::placeholder {
          color: #B0B0B0;
        }

        .form-input.has-error {
          border-color: ${SG_COLORS.red};
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: ${SG_COLORS.gray};
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: ${SG_COLORS.black};
        }

        .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-link {
          font-size: 13px;
          color: ${SG_COLORS.red};
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: ${SG_COLORS.red};
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #C7031A;
          box-shadow: 0 4px 12px rgba(233, 4, 30, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 28px 0;
          color: ${SG_COLORS.gray};
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: ${SG_COLORS.border};
        }

        .quick-access {
          display: flex;
          gap: 12px;
        }

        .quick-access-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1.5px solid ${SG_COLORS.border};
          border-radius: 10px;
          background: ${SG_COLORS.white};
          color: ${SG_COLORS.black};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .quick-access-btn:hover {
          border-color: ${SG_COLORS.black};
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .quick-access-btn .material-symbols-outlined {
          font-size: 20px;
          color: ${SG_COLORS.gray};
        }

        .quick-access-no-auth {
          font-size: 11px;
          color: ${SG_COLORS.gray};
          text-align: center;
          margin-top: 8px;
        }

        .demo-link {
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: ${SG_COLORS.gray};
        }

        .demo-link a {
          color: ${SG_COLORS.red};
          text-decoration: none;
          font-weight: 500;
        }

        .demo-link a:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="login-page">
        {/* Left side - Login form */}
        <div className="login-left">
          {/* Header */}
          <div className="login-header">
            <div className="login-logo-container">
              <img src="/uib-logo.png" alt="UIB" className="login-logo" />
              <span className="login-brand">BléSaf</span>
            </div>
            <button onClick={toggleLanguage} className="language-toggle">
              {i18n.language === 'fr' ? 'العربية' : 'Français'}
            </button>
          </div>

          {/* Welcome */}
          <h1 className="login-welcome">Bienvenue</h1>
          <p className="login-subtitle">Connectez-vous a votre espace de travail</p>

          {/* Error */}
          {error && (
            <div className="error-message" style={{ marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="form-input-wrapper">
                <input
                  type="email"
                  className={`form-input ${error ? 'has-error' : ''}`}
                  placeholder="votre.email@banque.tn"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${error ? 'has-error' : ''}`}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-row">
              <div />
              <span className="forgot-link">Mot de passe oublie?</span>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Connexion...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Quick Access */}
          {firstActiveBranch && (
            <>
              <div className="divider">Acces rapide</div>
              <div className="quick-access">
                <Link
                  to={`/display/${firstActiveBranch.id}`}
                  className="quick-access-btn"
                >
                  <span className="material-symbols-outlined">tv</span>
                  Ecran TV
                </Link>
                <Link
                  to={`/kiosk/${firstActiveBranch.id}`}
                  className="quick-access-btn"
                >
                  <span className="material-symbols-outlined">touch_app</span>
                  Borne Kiosk
                </Link>
              </div>
              <p className="quick-access-no-auth">Aucune connexion requise</p>
            </>
          )}

          {/* Demo Link */}
          <div className="demo-link">
            Mode demo? <Link to="/demo">Acceder au selecteur de roles</Link>
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="login-right">
          <div className="login-right-content">
            <h2 className="login-right-title">Gerez vos files d'attente</h2>
            <p className="login-right-subtitle">
              Suivez en temps reel, reduisez les temps d'attente et ameliorez l'experience client dans vos agences.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
