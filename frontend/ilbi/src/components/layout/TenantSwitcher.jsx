import React from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import CustomSelect from '../common/CustomSelect';
export default function TenantSwitcher() {
 const { isAdmin, isOwner } = useAuth();
 const { tenants, activeTenant, selectTenant } = useTenant();
 return <>{!isAdmin && tenants.length > 0 && (
          isOwner && (tenants.length > 1 || !activeTenant) ? (
            <CustomSelect
              value={activeTenant?.id ?? ''}
              onChange={(newTenantId) => {
                const selected = tenants.find((tenant) => String(tenant.id) === String(newTenantId));
                if (selected) selectTenant(selected);
              }}
              options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
              placeholder="Do‘konni tanlang"
              icon={Store}
              size="sm"
              title="Do‘konni tanlash"
              style={{
                borderRadius: 10,
                background: 'var(--bg-chip)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12.5,
              }}
              menuStyle={{
                minWidth: 230,
                right: 0,
                left: 'auto',
              }}
            />
          ) : activeTenant ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'var(--bg-chip)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
              title={`Faol do‘kon: ${activeTenant.name}`}
            >
              <Store size={14} color="var(--primary)" />
              <span>{activeTenant.name}</span>
            </div>
          ) : null
        )}</>;
}
