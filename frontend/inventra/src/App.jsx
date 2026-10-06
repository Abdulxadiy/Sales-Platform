import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Catalog from './pages/Catalog';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Shifts from './pages/Shifts';
import Audit from './pages/Audit';
import Tenants from './pages/Tenants';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import SetupAccount from './pages/SetupAccount';
import AcceptTerms from './pages/AcceptTerms';
import Documentation from './pages/Documentation';

function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user && user.terms_accepted === false) {
    return <Navigate to="/accept-terms" replace />;
  }
  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { role, isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user && user.terms_accepted === false) {
    return <Navigate to="/accept-terms" replace />;
  }
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup-account" element={<SetupAccount />} />
              <Route path="/accept-terms" element={<AcceptTerms />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales" element={<Sales />} />
                <Route path="shifts" element={<Shifts />} />
                <Route
                  path="tenants"
                  element={
                    <RoleProtectedRoute allowedRoles={['platform_admin']}>
                      <Tenants />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="employees"
                  element={
                    <RoleProtectedRoute allowedRoles={['owner', 'platform_admin']}>
                      <Employees />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RoleProtectedRoute allowedRoles={['owner', 'platform_admin']}>
                      <Audit />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="profile" element={<Profile />} />
                <Route path="docs" element={<Documentation />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

