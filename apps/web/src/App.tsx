import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Auth
import LoginPage from './pages/auth/LoginPage';
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
import HQDashboard from './pages/admin/HQDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBranches from './pages/admin/AdminBranches';
import AdminServices from './pages/admin/AdminServices';

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

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
