import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RoleRoute } from './components/routing/RoleRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsListPage } from './pages/LeadsListPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { LeadCreatePage } from './pages/LeadCreatePage';
import { LeadEditPage } from './pages/LeadEditPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Application Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/leads" element={<LeadsListPage />} />
                <Route path="/leads/new" element={<LeadCreatePage />} />
                <Route path="/leads/:id" element={<LeadDetailPage />} />
                <Route path="/leads/:id/edit" element={<LeadEditPage />} />
                <Route path="/followups" element={<FollowUpsPage />} />

                {/* Role-Restricted Management Reports */}
                <Route
                  path="/reports"
                  element={
                    <RoleRoute allowedRoles={['MANAGER']}>
                      <ReportsPage />
                    </RoleRoute>
                  }
                />
              </Route>

              {/* Error and Fallback Routes */}
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
