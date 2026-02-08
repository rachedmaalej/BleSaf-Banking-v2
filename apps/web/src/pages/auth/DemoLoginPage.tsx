import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  address?: string;
  status: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'teller' | 'branch_manager';
}

// Demo password for all seeded users
const DEMO_PASSWORD = 'demo123';

// Bank Admin (global, not branch-specific)
const BANK_ADMIN_OPTION = {
  id: 'bank_admin',
  label: 'Admin Banque',
  description: 'Gestion globale',
  icon: 'admin_panel_settings',
  color: SG_COLORS.red,
  email: 'bank.admin@demo-bank.tn',
  password: DEMO_PASSWORD,
};

const DISPLAY_OPTIONS = [
  {
    id: 'tv',
    label: 'Affichage TV',
    description: 'File d\'attente',
    icon: 'tv',
    color: SG_COLORS.black,
    path: '/display',
    requiresAuth: false,
  },
  {
    id: 'kiosk',
    label: 'Borne',
    description: 'Prise de ticket',
    icon: 'touch_app',
    color: SG_COLORS.red,
    path: '/kiosk',
    requiresAuth: false,
  },
];

export default function DemoLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchStaff, setBranchStaff] = useState<StaffMember[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

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

  // Fetch branches (show all branches for login, not just active)
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoadingBranches(true);
        const response = await queueApi.listBranches();
        setBranches(response.data.data || []);
      } catch {
        setError('Impossible de charger les agences');
      } finally {
        setIsLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  // Fetch staff when branch is selected
  useEffect(() => {
    if (!selectedBranch) {
      setBranchStaff([]);
      return;
    }

    const fetchStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const response = await queueApi.getBranchStaff(selectedBranch.id);
        setBranchStaff(response.data.data?.staff || []);
      } catch {
        setBranchStaff([]);
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [selectedBranch]);

  // Handle bank admin login
  const handleBankAdminLogin = async () => {
    setLoadingRole('bank_admin');
    setError('');

    try {
      const response = await authApi.login(BANK_ADMIN_OPTION.email, BANK_ADMIN_OPTION.password);
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

      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setLoadingRole(null);
    }
  };

  // Handle staff member login
  const handleStaffLogin = async (staff: StaffMember) => {
    setLoadingRole(staff.id);
    setError('');

    try {
      const response = await authApi.login(staff.email, DEMO_PASSWORD);
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
    } finally {
      setLoadingRole(null);
    }
  };

  const handleDisplayNavigation = (option: typeof DISPLAY_OPTIONS[0]) => {
    if (!selectedBranch) {
      setError('Veuillez sélectionner une agence');
      return;
    }
    if (selectedBranch.status === 'inactive') {
      setError('Cette agence est inactive. Activez-la d\'abord via l\'Admin.');
      return;
    }
    navigate(`${option.path}/${selectedBranch.id}`);
  };

  return (
    <>
      <style>{`
        .login-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          display: flex;
          background: linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%);
        }

        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px 40px;
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

        .login-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
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

        .content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .step-number.active {
          background: ${SG_COLORS.red};
          color: white;
        }

        .step-number.completed {
          background: #22C55E;
          color: white;
        }

        .step-number.inactive {
          background: ${SG_COLORS.lightGray};
          color: ${SG_COLORS.gray};
        }

        .step-label {
          font-size: 12px;
          color: ${SG_COLORS.gray};
        }

        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 4px;
        }

        .section-subtitle {
          font-size: 13px;
          color: ${SG_COLORS.gray};
          margin-bottom: 20px;
        }

        .branches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 32px;
        }

        .branch-card {
          padding: 16px;
          border: 2px solid ${SG_COLORS.border};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: ${SG_COLORS.white};
        }

        .branch-card:hover {
          border-color: ${SG_COLORS.rose};
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .branch-card.selected {
          border-color: ${SG_COLORS.red};
          background: rgba(233, 4, 30, 0.04);
        }

        .branch-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .branch-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: ${SG_COLORS.lightGray};
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .branch-card.selected .branch-icon {
          background: ${SG_COLORS.red};
        }

        .branch-icon .material-symbols-outlined {
          font-size: 20px;
          color: ${SG_COLORS.gray};
        }

        .branch-card.selected .branch-icon .material-symbols-outlined {
          color: white;
        }

        .branch-name {
          font-size: 14px;
          font-weight: 600;
          color: ${SG_COLORS.black};
        }

        .branch-code {
          font-size: 11px;
          color: ${SG_COLORS.gray};
        }

        .branch-address {
          font-size: 11px;
          color: ${SG_COLORS.gray};
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .branch-card.inactive {
          opacity: 0.7;
        }

        .branch-card.inactive .branch-icon {
          background: #FEE2E2;
        }

        .branch-card.inactive .branch-icon .material-symbols-outlined {
          color: #B91C1C;
        }

        .branch-status-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 500;
          color: #B91C1C;
          background: #FEE2E2;
          border-radius: 4px;
        }

        .selected-branch-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(233, 4, 30, 0.08);
          border: 1px solid ${SG_COLORS.red};
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .selected-branch-banner.inactive {
          background: rgba(185, 28, 28, 0.08);
          border-color: #B91C1C;
        }

        .selected-branch-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .selected-branch-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: ${SG_COLORS.red};
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .selected-branch-icon.inactive {
          background: #B91C1C;
        }

        .selected-branch-icon .material-symbols-outlined {
          font-size: 18px;
          color: white;
        }

        .selected-branch-name {
          font-size: 14px;
          font-weight: 600;
          color: ${SG_COLORS.black};
        }

        .selected-branch-code {
          font-size: 11px;
          color: ${SG_COLORS.gray};
        }

        .change-branch-btn {
          padding: 6px 12px;
          font-size: 12px;
          color: ${SG_COLORS.red};
          background: transparent;
          border: 1px solid ${SG_COLORS.red};
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .change-branch-btn:hover {
          background: ${SG_COLORS.red};
          color: white;
        }

        .roles-section {
          margin-bottom: 24px;
        }

        .roles-section-title {
          font-size: 12px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .roles-section-title .material-symbols-outlined {
          font-size: 14px;
          color: ${SG_COLORS.gray};
        }

        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }

        .role-card {
          display: flex;
          flex-direction: column;
          padding: 16px;
          background: ${SG_COLORS.white};
          border: 1px solid ${SG_COLORS.border};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-card:hover:not(:disabled) {
          border-color: var(--role-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }

        .role-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .role-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .role-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .role-icon .material-symbols-outlined {
          font-size: 22px;
          color: white;
        }

        .role-name {
          font-size: 14px;
          font-weight: 600;
          color: ${SG_COLORS.black};
        }

        .role-description {
          font-size: 11px;
          color: ${SG_COLORS.gray};
          margin-bottom: 12px;
        }

        .role-credentials {
          padding: 8px 10px;
          background: ${SG_COLORS.lightGray};
          border-radius: 6px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 10px;
          color: ${SG_COLORS.gray};
        }

        .credential-line {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
        }

        .credential-label {
          color: ${SG_COLORS.gray};
        }

        .credential-value {
          color: ${SG_COLORS.black};
          font-weight: 500;
        }

        .error-message {
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
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

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: ${SG_COLORS.gray};
        }

        .empty-state .material-symbols-outlined {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .empty-state-title {
          font-size: 16px;
          font-weight: 600;
          color: ${SG_COLORS.black};
          margin-bottom: 4px;
        }

        .empty-state-text {
          font-size: 13px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: ${SG_COLORS.gray};
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid ${SG_COLORS.lightGray};
          border-top-color: ${SG_COLORS.red};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
      `}</style>

      <div className="login-page">
        {/* Left side - Main content */}
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

          <div className="content-wrapper">
            {/* Error Message */}
            {error && (
              <div className="error-message">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                {error}
              </div>
            )}

            {/* Step 1: Branch Selection */}
            {!selectedBranch && (
              <>
                <div className="step-indicator">
                  <span className="step-number active">1</span>
                  <span className="step-label">Sélectionnez une agence</span>
                </div>
                <h2 className="section-title">Choisir l'agence</h2>
                <p className="section-subtitle">
                  Sélectionnez l'agence pour accéder aux différents rôles et affichages
                </p>

                {isLoadingBranches ? (
                  <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Chargement des agences...</span>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-symbols-outlined">store</span>
                    <div className="empty-state-title">Aucune agence active</div>
                    <div className="empty-state-text">
                      Connectez-vous en tant qu'Admin pour créer et activer des agences
                    </div>
                    <button
                      onClick={handleBankAdminLogin}
                      style={{
                        marginTop: 16,
                        padding: '10px 20px',
                        background: SG_COLORS.red,
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {loadingRole === 'bank_admin' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="spinner" style={{ width: 14, height: 14 }} />
                          Connexion...
                        </span>
                      ) : (
                        'Connexion Admin'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="branches-grid">
                    {branches.map((branch) => (
                        <div
                          key={branch.id}
                          className={`branch-card ${branch.status === 'inactive' ? 'inactive' : ''}`}
                          onClick={() => setSelectedBranch(branch)}
                        >
                          <div className="branch-card-header">
                            <div className="branch-icon">
                              <span className="material-symbols-outlined">store</span>
                            </div>
                            <div>
                              <div className="branch-name">{branch.name}</div>
                              <div className="branch-code">{branch.code}</div>
                            </div>
                          </div>
                          {branch.address && (
                            <div className="branch-address">{branch.address}</div>
                          )}
                          {branch.status === 'inactive' && (
                            <div style={{ marginTop: 8 }}>
                              <span className="branch-status-badge">Inactive</span>
                            </div>
                          )}
                        </div>
                    ))}
                  </div>
                )}

                {/* Admin Access - Always available */}
                {branches.length > 0 && (
                  <div className="roles-section">
                    <div className="roles-section-title">
                      <span className="material-symbols-outlined">admin_panel_settings</span>
                      Accès Administration
                    </div>
                    <div className="roles-grid" style={{ maxWidth: 220 }}>
                      <button
                        className="role-card"
                        style={{ '--role-color': SG_COLORS.red } as React.CSSProperties}
                        onClick={handleBankAdminLogin}
                        disabled={loadingRole !== null}
                      >
                        <div className="role-card-header">
                          <div className="role-icon" style={{ background: SG_COLORS.red }}>
                            {loadingRole === 'bank_admin' ? (
                              <div className="spinner" />
                            ) : (
                              <span className="material-symbols-outlined">admin_panel_settings</span>
                            )}
                          </div>
                          <div className="role-name">Admin Banque</div>
                        </div>
                        <div className="role-description">Gestion globale de toutes les agences</div>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Role Selection */}
            {selectedBranch && (
              <>
                <div className="step-indicator">
                  <span className="step-number completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                  </span>
                  <span className="step-label">Agence sélectionnée</span>
                </div>

                {/* Selected Branch Banner */}
                <div className={`selected-branch-banner ${selectedBranch.status === 'inactive' ? 'inactive' : ''}`}>
                  <div className="selected-branch-info">
                    <div className={`selected-branch-icon ${selectedBranch.status === 'inactive' ? 'inactive' : ''}`}>
                      <span className="material-symbols-outlined">store</span>
                    </div>
                    <div>
                      <div className="selected-branch-name">
                        {selectedBranch.name}
                        {selectedBranch.status === 'inactive' && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: '2px 6px',
                            background: '#FEE2E2',
                            color: '#B91C1C',
                            borderRadius: 4
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="selected-branch-code">{selectedBranch.code}</div>
                    </div>
                  </div>
                  <button
                    className="change-branch-btn"
                    onClick={() => setSelectedBranch(null)}
                  >
                    Changer
                  </button>
                </div>

                {selectedBranch.status === 'inactive' && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#92400E',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                    Cette agence est inactive. Les affichages publics (TV/Kiosk) ne seront pas disponibles.
                  </div>
                )}

                <div className="step-indicator" style={{ marginTop: 16 }}>
                  <span className="step-number active">2</span>
                  <span className="step-label">Choisissez votre accès</span>
                </div>
                <h2 className="section-title">Sélectionner un rôle</h2>
                <p className="section-subtitle">
                  Connectez-vous ou accédez aux affichages pour {selectedBranch.name}
                </p>

                {/* Staff Login Section */}
                <div className="roles-section">
                  <div className="roles-section-title">
                    <span className="material-symbols-outlined">badge</span>
                    Connexion Staff
                  </div>

                  {/* Loading state */}
                  {isLoadingStaff && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                      color: SG_COLORS.gray,
                    }}>
                      <div className="loading-spinner" style={{ width: 24, height: 24, marginRight: 12 }} />
                      Chargement des utilisateurs...
                    </div>
                  )}

                  {/* No staff warning */}
                  {!isLoadingStaff && branchStaff.length === 0 && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#92400E',
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                      Aucun utilisateur pour cette agence. Créez des utilisateurs via Admin {'>'} Utilisateurs.
                    </div>
                  )}

                  {/* Staff grid */}
                  {!isLoadingStaff && branchStaff.length > 0 && (
                    <div className="roles-grid">
                      {branchStaff.map((staff) => {
                        const isTeller = staff.role === 'teller';
                        const roleColor = isTeller ? SG_COLORS.rose : SG_COLORS.black;
                        const roleIcon = isTeller ? 'person' : 'supervisor_account';
                        const roleLabel = isTeller ? 'Agent' : 'Chef d\'Agence';

                        return (
                          <button
                            key={staff.id}
                            className="role-card"
                            style={{ '--role-color': roleColor } as React.CSSProperties}
                            onClick={() => handleStaffLogin(staff)}
                            disabled={loadingRole !== null}
                          >
                            <div className="role-card-header">
                              <div className="role-icon" style={{ background: roleColor }}>
                                {loadingRole === staff.id ? (
                                  <div className="spinner" />
                                ) : (
                                  <span className="material-symbols-outlined">{roleIcon}</span>
                                )}
                              </div>
                              <div className="role-name">{staff.name}</div>
                            </div>
                            <div className="role-description">{roleLabel}</div>
                            <div className="role-credentials">
                              <div className="credential-line">
                                <span className="credential-label">Email:</span>
                                <span className="credential-value">{staff.email.split('@')[0]}@...</span>
                              </div>
                              <div className="credential-line">
                                <span className="credential-label">Pass:</span>
                                <span className="credential-value">{DEMO_PASSWORD}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Public Displays Section */}
                <div className="roles-section">
                  <div className="roles-section-title">
                    <span className="material-symbols-outlined">monitor</span>
                    Affichages Publics
                  </div>
                  <div className="roles-grid">
                    {DISPLAY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        className="role-card"
                        style={{ '--role-color': option.color } as React.CSSProperties}
                        onClick={() => handleDisplayNavigation(option)}
                      >
                        <div className="role-card-header">
                          <div className="role-icon" style={{ background: option.color }}>
                            <span className="material-symbols-outlined">{option.icon}</span>
                          </div>
                          <div className="role-name">{option.label}</div>
                        </div>
                        <div className="role-description">{option.description}</div>
                        <div className="role-credentials" style={{ background: 'transparent', padding: 0, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: SG_COLORS.gray }}>
                            Aucune connexion requise
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Access */}
                <div className="roles-section">
                  <div className="roles-section-title">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                    Administration Globale
                  </div>
                  <div className="roles-grid" style={{ maxWidth: 220 }}>
                    <button
                      className="role-card"
                      style={{ '--role-color': SG_COLORS.red } as React.CSSProperties}
                      onClick={handleBankAdminLogin}
                      disabled={loadingRole !== null}
                    >
                      <div className="role-card-header">
                        <div className="role-icon" style={{ background: SG_COLORS.red }}>
                          {loadingRole === 'bank_admin' ? (
                            <div className="spinner" />
                          ) : (
                            <span className="material-symbols-outlined">admin_panel_settings</span>
                          )}
                        </div>
                        <div className="role-name">Admin Banque</div>
                      </div>
                      <div className="role-description">Gestion de toutes les agences</div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="login-right" />
      </div>
    </>
  );
}
