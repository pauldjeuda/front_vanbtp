/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { HistoryProvider } from './context/HistoryContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages — chaque page est maintenant dans son propre dossier
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/Auth/Auth';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ProjectsPage } from './pages/Projects/Projects';
import { FinancesPage } from './pages/Finances/Finances';
import { ResourcesPage } from './pages/Resources/Resources';
import { ControlPage } from './pages/Control/Control';
import { SupportPage } from './pages/Support/Support';
import { SettingsPage } from './pages/Settings/Settings';
import { ProductionPage } from './pages/Production/Production';
import { KPIsPage } from './pages/KPIs/KPIs';

// Layout
import { MainLayout } from './components/layout/index';

// i18n — maintenant dans son propre dossier avec JSON séparés
import './i18n/index';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useUser();
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <DataProvider>
          <HistoryProvider>
            <BrowserRouter>
              <NotificationProvider>
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  {/* App Routes — protégées par rôle */}
                  <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="finances" element={<FinancesPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="control" element={<ControlPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="production" element={<ProductionPage />} />
                    <Route path="kpis" element={<KPIsPage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </NotificationProvider>
            </BrowserRouter>
          </HistoryProvider>
        </DataProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

