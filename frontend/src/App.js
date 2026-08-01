import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AUTH_CHANGED_EVENT, authService } from './services/api';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/TopBar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TankListPage } from './pages/TankListPage';
import { InspectionFormPage } from './pages/InspectionFormPage';
import { InspectionListPage } from './pages/InspectionListPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { ProductReceiptCertificateListPage } from './pages/ProductReceiptCertificateListPage';
import { ProductReceiptCertificateFormPage } from './pages/ProductReceiptCertificateFormPage';
import { ProductReceiptCertificateDetailPage } from './pages/ProductReceiptCertificateDetailPage';
import { SealIsolationReportListPage } from './pages/SealIsolationReportListPage';
import { SealIsolationReportFormPage } from './pages/SealIsolationReportFormPage';
import { SealIsolationReportDetailPage } from './pages/SealIsolationReportDetailPage';
import { ShoreTankCalculationListPage } from './pages/ShoreTankCalculationListPage';
import { ShoreTankCalculationFormPage } from './pages/ShoreTankCalculationFormPage';
import { ShoreTankCalculationDetailPage } from './pages/ShoreTankCalculationDetailPage';
import { default as ProvisionalOutturnReportListPage } from './pages/ProvisionalOutturnReportListPage';
import { default as ProvisionalOutturnReportFormPage } from './pages/ProvisionalOutturnReportFormPage';
import { default as ProvisionalOutturnReportDetailPage } from './pages/ProvisionalOutturnReportDetailPage';
import { SubmissionsInboxPage } from './pages/SubmissionsInboxPage';
import { VesselReportListPage, VesselReportFormPage, VesselReportDetailPage } from './pages/VesselReportPage';
import { StockReportListPage, StockReportFormPage, StockReportDetailPage } from './pages/StockReportPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { RosterPage } from './pages/RosterPage';
import { RosterFormPage } from './pages/RosterFormPage';
import { SamplingFormListPage, SamplingFormFormPage, SamplingFormDetailPage } from './pages/SamplingFormPage';
import { SystemAnalyticsPage } from './pages/SystemAnalyticsPage';
import { ClientDashboardPage } from './pages/ClientDashboardPage';
import { ServiceRequestPage } from './pages/ServiceRequestPage';
import './index.css';

const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

const RoleRoute = ({ children, isAuthenticated, allowedRoles }) => {
  if (!isAuthenticated) return <Navigate to="/login" />;
  const role = localStorage.getItem('user_role');
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const isTerminalRep = () => localStorage.getItem('user_role') === 'terminal_representative';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(authService.isAuthenticated());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const P = ({ children }) => <ProtectedRoute isAuthenticated={isAuthenticated}>{children}</ProtectedRoute>;
  const AdminOnly = ({ children }) => (
    <RoleRoute isAuthenticated={isAuthenticated} allowedRoles={['admin']}>
      {children}
    </RoleRoute>
  );

  return (
    <DarkModeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen overflow-x-hidden bg-gradient-surface">
          <Navigation />
          <TopBar />
          <main className={isAuthenticated ? 'app-main min-h-screen pt-14' : 'min-h-screen overflow-x-hidden'}>
            <Routes>
            <Route path="/login"    element={<LoginPage />} />

            <Route path="/dashboard" element={<P>{isTerminalRep() ? <Navigate to="/client-dashboard" /> : <DashboardPage />}</P>} />
            <Route path="/tanks"     element={<P><TankListPage /></P>} />

            {/* Dip Tickets */}
            <Route path="/inspections"          element={<P><InspectionListPage /></P>} />
            <Route path="/inspections/new"      element={<P><InspectionFormPage /></P>} />
            <Route path="/inspections/:id"      element={<P><InspectionDetailPage /></P>} />
            <Route path="/inspections/:id/edit" element={<P><InspectionFormPage /></P>} />

            {/* Product Receipt Certificates */}
            <Route path="/product-receipt-certificates"          element={<P><ProductReceiptCertificateListPage /></P>} />
            <Route path="/product-receipt-certificates/new"      element={<P><ProductReceiptCertificateFormPage /></P>} />
            <Route path="/product-receipt-certificates/:id"      element={<P><ProductReceiptCertificateDetailPage /></P>} />
            <Route path="/product-receipt-certificates/:id/edit" element={<P><ProductReceiptCertificateFormPage /></P>} />

            {/* Seal & Isolation Reports */}
            <Route path="/seal-isolation-reports"          element={<P><SealIsolationReportListPage /></P>} />
            <Route path="/seal-isolation-reports/new"      element={<P><SealIsolationReportFormPage /></P>} />
            <Route path="/seal-isolation-reports/:id"      element={<P><SealIsolationReportDetailPage /></P>} />
            <Route path="/seal-isolation-reports/:id/edit" element={<P><SealIsolationReportFormPage /></P>} />

            {/* Shore Tank Calculations */}
            <Route path="/shore-tank-calculations"          element={<P><ShoreTankCalculationListPage /></P>} />
            <Route path="/shore-tank-calculations/new"      element={<P><ShoreTankCalculationFormPage /></P>} />
            <Route path="/shore-tank-calculations/:id"      element={<P><ShoreTankCalculationDetailPage /></P>} />
            <Route path="/shore-tank-calculations/:id/edit" element={<P><ShoreTankCalculationFormPage /></P>} />

            {/* Provisional Outturn Reports */}
            <Route path="/provisional-outturn-reports"          element={<P><ProvisionalOutturnReportListPage /></P>} />
            <Route path="/provisional-outturn-reports/new"      element={<P><ProvisionalOutturnReportFormPage /></P>} />
            <Route path="/provisional-outturn-reports/:id"      element={<P><ProvisionalOutturnReportDetailPage /></P>} />
            <Route path="/provisional-outturn-reports/:id/edit" element={<P><ProvisionalOutturnReportFormPage /></P>} />

            {/* Submissions & Vessel Reports */}
            <Route path="/submissions"          element={<P><SubmissionsInboxPage /></P>} />
            <Route path="/vessel-reports"        element={<P><VesselReportListPage /></P>} />
            <Route path="/vessel-reports/new"    element={<P><VesselReportFormPage /></P>} />
            <Route path="/vessel-reports/:id"    element={<P><VesselReportDetailPage /></P>} />
            <Route path="/vessel-reports/:id/edit" element={<P><VesselReportFormPage /></P>} />

            {/* Stock Reports */}
            <Route path="/stock-reports"          element={<P><StockReportListPage /></P>} />
            <Route path="/stock-reports/new"      element={<P><StockReportFormPage /></P>} />
            <Route path="/stock-reports/:id"      element={<P><StockReportDetailPage /></P>} />
            <Route path="/stock-reports/:id/edit" element={<P><StockReportFormPage /></P>} />

            {/* Roster */}
            <Route path="/roster"           element={<P><RosterPage /></P>} />
            <Route path="/roster/new"       element={<P><RosterFormPage /></P>} />
            <Route path="/roster/:id/edit"  element={<P><RosterFormPage /></P>} />

            {/* Sampling Forms */}
            <Route path="/sampling-forms"          element={<P><SamplingFormListPage /></P>} />
            <Route path="/sampling-forms/new"      element={<P><SamplingFormFormPage /></P>} />
            <Route path="/sampling-forms/:id"      element={<P><SamplingFormDetailPage /></P>} />
            <Route path="/sampling-forms/:id/edit" element={<P><SamplingFormFormPage /></P>} />

            {/* Client Dashboard (Terminal Representative) */}
            <Route path="/client-dashboard" element={<P><ClientDashboardPage /></P>} />

            {/* Service Requests */}
            <Route path="/service-requests" element={<P><ServiceRequestPage /></P>} />

            {/* User Management (Admin only) */}
            <Route path="/users" element={<P><UserManagementPage /></P>} />

            {/* Analytics (Admin only) */}
            <Route path="/system-analytics" element={<AdminOnly><SystemAnalyticsPage /></AdminOnly>} />

            <Route path="/"  element={<Navigate to={isTerminalRep() ? '/client-dashboard' : '/dashboard'} />} />
            <Route path="*"  element={<Navigate to={isTerminalRep() ? '/client-dashboard' : '/dashboard'} />} />
          </Routes>
        </main>
      </div>
      </Router>
    </DarkModeProvider>
  );
}

export default App;
