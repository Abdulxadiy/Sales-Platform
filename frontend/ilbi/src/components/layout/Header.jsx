import { createVisiblePoller } from '../../utils/visiblePolling';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Menu, Store } from 'lucide-react';
import { cashboxApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import CustomSelect from '../common/CustomSelect';

export default function Header({
  title,
  subtitle,
  onOpenShiftModal,
  onOpenMobileMenu,
}) {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = useAuth();
  const { tenants, activeTenant, selectTenant } = useTenant();
  const canViewCashbox = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.view_cashbox");
  const canManageShift = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.manage_shift");
  const [time, setTime] = useState(new Date());
  const [shift, setShift] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setShift(null);
    if (isAdmin || !canViewCashbox || !activeTenant?.id) return;
    const poller = createVisiblePoller(async signal => {
      const data = await cashboxApi.getCurrentShift({ compact: true }, { signal });
      if (!signal.aborted) setShift(data);
    }, { events: ['shift_status_changed', 'refresh_notifications', 'tenant_changed'] });
    return () => poller.stop();
  }, [isAdmin, activeTenant?.id, canViewCashbox]);

  const isShiftOpen = Boolean(shift?.is_open ?? (shift?.status === 'OPEN'));

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onOpenMobileMenu && (
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={onOpenMobileMenu}
            aria-label="Menyuni ochish"
            title="Asosiy menyu"
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 className="header-page-title" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="header-page-subtitle" style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="header-actions-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isAdmin && tenants.length > 0 && (
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
        )}

        {isAdmin ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--primary-light)',
              border: '1px solid var(--border-subtle)',
            }}
            title="SaaS Platforma Administratori"
          >
            <Shield size={14} color="var(--primary)" />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--primary)',
                whiteSpace: 'nowrap',
              }}
            >
              Platforma Nazorati
            </span>
          </div>
        ) : canViewCashbox ? (
          <div
            onClick={() => {
              if (isShiftOpen && canManageShift && onOpenShiftModal) {
                onOpenShiftModal();
              } else {
                navigate('/shifts');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: isShiftOpen
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              border: isShiftOpen
                ? '1px solid rgba(16, 185, 129, 0.25)'
                : '1px solid rgba(239, 68, 68, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={
              isShiftOpen
                ? "Kassa smenasi ochiq va faol (Yopish va Z-hisobot uchun bosing)"
                : "Kassa smenasi yopiq (Smenani boshlash uchun bosing)"
            }
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isShiftOpen ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                boxShadow: isShiftOpen
                  ? '0 0 10px var(--accent-emerald)'
                  : '0 0 10px var(--accent-rose)',
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isShiftOpen ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                whiteSpace: 'nowrap',
              }}
            >
              {isShiftOpen ? 'Smena Ochiq' : 'Smena Yopiq'}
            </span>
          </div>
        ) : null}

        {/* Live Clock with Synthetic Lime Accent */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 14px',
            borderRadius: 12,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border-subtle)',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={14} color="var(--primary)" />
          <span>
            {time.toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
