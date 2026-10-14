import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { TenantProvider } from './context/TenantContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import HelpLauncher from './components/support/HelpLauncher';
import AppLoadingScreen from './components/common/AppLoadingScreen';
const Support = lazy(() => import('./pages/Support'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Sales = lazy(() => import('./pages/Sales'));
const Debts = lazy(() => import('./pages/Debts'));
const B2BTransactions = lazy(() => import('./pages/B2BTransactions'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Audit = lazy(() => import('./pages/Audit'));
const Tenants = lazy(() => import('./pages/Tenants'));
const SellerProfileReviews = lazy(() => import('./pages/SellerProfileReviews'));
const MyTenants = lazy(() => import('./pages/MyTenants'));
const Employees = lazy(() => import('./pages/Employees'));
const Services = lazy(() => import('./pages/Services'));
const Profile = lazy(() => import('./pages/Profile'));
const SetupAccount = lazy(() => import('./pages/SetupAccount'));
const AcceptTerms = lazy(() => import('./pages/AcceptTerms'));
const Documentation = lazy(() => import('./pages/Documentation'));
const PublicReceiptView = lazy(() => import('./pages/PublicReceiptView'));

function ProtectedRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <AppLoadingScreen message="Xavfsiz sessiya tekshirilmoqda..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user && user.terms_accepted === false) {
    return <Navigate to="/accept-terms" replace />;
  }
  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { role, isAuthenticated, user, loading } = useAuth();
  if (loading) return <AppLoadingScreen message="Xavfsiz sessiya tekshirilmoqda..." />;
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

function SupportRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AppLoadingScreen message="Xavfsiz sessiya tekshirilmoqda..." />;
  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <Layout>
          <Support />
        </Layout>
      </ProtectedRoute>
    );
  }
  return <Support />;
}

export default function App() {
  return (
    <BrowserRouter useTransitions={false}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Suspense fallback={<AppLoadingScreen message="Sahifa yuklanmoqda..." />}>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/support" element={<SupportRoute />} />
                <Route path="/setup-account" element={<SetupAccount />} />
                <Route path="/reset-password" element={<SetupAccount />} />
                <Route path="/accept-terms" element={<AcceptTerms />} />
                <Route path="/r/:token" element={<PublicReceiptView />} />
                <Route path="/receipt/:token" element={<PublicReceiptView />} />

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
                  <Route path="debts" element={<Debts />} />
                  <Route path="b2b" element={<B2BTransactions />} />
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
                    path="seller-profiles/review"
                    element={
                      <RoleProtectedRoute allowedRoles={['platform_admin']}>
                        <SellerProfileReviews />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="my-tenants"
                    element={
                      <RoleProtectedRoute allowedRoles={['owner']}>
                        <MyTenants />
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
                    path="services"
                    element={
                      <RoleProtectedRoute allowedRoles={['owner', 'platform_admin']}>
                        <Services />
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
                </Suspense>
                <HelpLauncher />
            </ConfirmProvider>
          </ToastProvider>
        </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

