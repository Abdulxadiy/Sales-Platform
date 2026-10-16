import { localStore, sessionStore } from '../utils/brandStorage.js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const TenantContext = createContext(null);
const tenantStorageKey = (userId) => `ilbi_active_tenant:${userId}`;

export function TenantProvider({ children }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const tenants = useMemo(
    () => (Array.isArray(user?.tenants) ? user.tenants : []),
    [user?.tenants],
  );
  const [activeTenant, setActiveTenant] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) {
      setActiveTenant(null);
      return;
    }

    const storageKey = tenantStorageKey(user?.id);
    const savedId = sessionStore.getItem(storageKey) || localStore.getItem(storageKey);
    const selected = tenants.find((tenant) => String(tenant.id) === String(savedId))
      || (tenants.length === 1 ? tenants[0] : null);
    setActiveTenant(selected || null);
    if (selected) {
      sessionStore.setItem(storageKey, String(selected.id));
      localStore.setItem(storageKey, String(selected.id));
    } else {
      sessionStore.removeItem(storageKey);
      localStore.removeItem(storageKey);
    }
  }, [isAuthenticated, isAdmin, tenants, user?.id]);

  const selectTenant = (tenant) => {
    if (!tenant || !tenants.some((item) => String(item.id) === String(tenant.id))) return;
    setActiveTenant(tenant);
    const storageKey = tenantStorageKey(user?.id);
    sessionStore.setItem(storageKey, String(tenant.id));
    localStore.setItem(storageKey, String(tenant.id));
    window.dispatchEvent(new CustomEvent('tenant_changed', { detail: tenant }));
  };

  const refreshTenants = async () => {
    window.dispatchEvent(new Event('profile:refresh'));
  };

  const isMultiTenant = tenants.length > 1;
  return (
    <TenantContext.Provider value={{
      tenants,
      activeTenant,
      selectTenant,
      refreshTenants,
      isMultiTenant,
      loadingTenants: isAuthenticated && !isAdmin && !Array.isArray(user?.tenants),
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}

