import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Auth
import LoginPage from './pages/auth/LoginPage';
import DemoLoginPage from './pages/auth/DemoLoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public pages
import KioskServiceSelect from './pages/kiosk/KioskServiceSelect';
import KioskTicketConfirm from './pages/kiosk/KioskTicketConfirm';
import MobileServiceSelect from './pages/mobile/MobileServiceSelect';
import MobileTicketView from './pages/mobile/MobileTicketView';
import TicketStatus from './pages/status/TicketStatus';
import QueueDisplay from './pages/display/QueueDisplay';

// Protected pages
import TellerDashboard from './pages/teller/TellerDashboard';
import BranchDashboard from './pages/manager/BranchDashboard';
import BranchDashboardV2 from './pages/manager/BranchDashboardV2';
import ManagerReports from './pages/manager/ManagerReports';
import ManagerSettings from './pages/manager/ManagerSettings';
import HQDashboard from './pages/admin/HQDashboard';
import HQDashboardV2 from './pages/admin/HQDashboardV2';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBranches from './pages/admin/AdminBranches';
import AdminServices from './pages/admin/AdminServices';
import AdminTemplates from './pages/admin/AdminTemplates';

// Layout
import AppLayout from './components/layout/AppLayout';
import ManagerLayout from './components/layout/ManagerLayout';

function App() {
  const { i18n } = useTranslation();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demo" element={<DemoLoginPage />} />

        {/* Public - Kiosk */}
        <Route path="/kiosk/:branchId" element={<KioskServiceSelect />} />
        <Route path="/kiosk/:branchId/confirm" element={<KioskTicketConfirm />} />

        {/* Public - Mobile */}
        <Route path="/join/:branchId" element={<MobileServiceSelect />} />
        <Route path="/ticket/:ticketId" element={<MobileTicketView />} />

        {/* Public - Ticket Status */}
        <Route path="/status/:ticketId" element={<TicketStatus />} />

        {/* Public - Display */}
        <Route path="/display/:branchId" element={<QueueDisplay />} />

        {/* Protected - Teller */}
        <Route
          path="/teller"
          element={
            <ProtectedRoute allowedRoles={['teller', 'branch_manager']}>
              <TellerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected - Branch Manager (uses ManagerLayout with horizontal nav) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['branch_manager', 'bank_admin']}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager" element={<BranchDashboard />} />
          <Route path="/manager/v2" element={<BranchDashboardV2 />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
          <Route path="/manager/settings" element={<ManagerSettings />} />
        </Route>

        {/* Protected - HQ Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <HQDashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/v2"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <HQDashboardV2 />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <AdminUsers />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branches"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <AdminBranches />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <AdminServices />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <ProtectedRoute allowedRoles={['bank_admin', 'super_admin']}>
              <AppLayout>
                <AdminTemplates />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
