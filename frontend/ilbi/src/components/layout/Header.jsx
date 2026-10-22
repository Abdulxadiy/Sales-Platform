import { createVisiblePoller } from '../../utils/visiblePolling';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Menu, BellRing, Plus, ChevronDown, ShoppingCart, PackagePlus, Package, UserPlus } from 'lucide-react';
import { cashboxApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import TenantSwitcher from './TenantSwitcher';
import SyncCenter from '../sync/SyncCenter';
import { useWorkspace } from '../../context/WorkspaceContext';
const WorkspaceNavbar = React.lazy(() => import('./WorkspaceNavbar'));

export default function Header({
  title,
  subtitle,
  onOpenShiftModal,
  onOpenMobileMenu,
  onOpenNotifications,
  onOpenReminders,
  unreadCount,
  notifications,
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { mode, reminders } = useWorkspace();
  const { activeTenant } = useTenant();
  const canViewCashbox = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.view_cashbox");
  const canManageShift = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.manage_shift");
  const [time, setTime] = useState(() => new Date());
  const [shift, setShift] = useState(null);

  useEffect(() => {
    if (mode === 'fast') return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mode]);

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

  const statusControl = <><SyncCenter />{isAdmin ? (
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
          <div role="button" tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
            }}
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
                ? 'rgba(var(--success-rgb), 0.12)'
                : 'rgba(var(--danger-rgb), 0.12)',
              border: isShiftOpen
                ? '1px solid rgba(var(--success-rgb), 0.25)'
                : '1px solid rgba(var(--danger-rgb), 0.25)',
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
        ) : null}</>;
  if (mode === 'fast') return <React.Suspense fallback={<div className="workspace-navbar workspace-navbar-loading">Ish stoli ochilmoqda…</div>}>
    <WorkspaceNavbar statusControl={statusControl} unreadCount={unreadCount} notifications={notifications} onOpenNotifications={onOpenNotifications} />
  </React.Suspense>;

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
        {!isAdmin && activeTenant && (
          <details className="workspace-dropdown" style={{ position: 'relative' }}>
            <summary
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '6px 14px',
                color: '#fff',
                background: 'var(--primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                listStyle: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
              title="Yangi amal yoki topshiriq biriktirish"
            >
              <Plus size={15} />
              <span>Yangi</span>
              <ChevronDown size={13} />
            </summary>
            <div
              className="workspace-dropdown-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 250,
                background: 'var(--bg-modal, var(--bg-card))',
                borderRadius: 12,
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-lg)',
                padding: 6,
                zIndex: 100,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  window.dispatchEvent(new CustomEvent('workspace_open_reminders', { detail: { create: true } }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(var(--primary-rgb), 0.08)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <BellRing size={16} />
                <span>Topshiriq / Eslatma biriktirish</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  navigate('/pos');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ShoppingCart size={16} />
                <span>Yangi sotuv (Kassa)</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  navigate('/inventory?workspace_action=intake');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <PackagePlus size={16} />
                <span>Tovar kirimi</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  navigate('/catalog?new=1');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Package size={16} />
                <span>Yangi tovar</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest('details').open = false;
                  navigate('/debts?workspace_action=new_customer');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <UserPlus size={16} />
                <span>Yangi mijoz</span>
              </button>
            </div>
          </details>
        )}

        <TenantSwitcher />

        {statusControl}

        {!isAdmin && activeTenant && (
          <button
            type="button"
            onClick={onOpenReminders}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 14px',
              borderRadius: 999,
              background: reminders?.overdue_count > 0 ? 'rgba(var(--danger-rgb), 0.12)' : 'var(--bg-chip)',
              border: `1px solid ${reminders?.overdue_count > 0 ? 'rgba(var(--danger-rgb), 0.3)' : 'var(--border-subtle)'}`,
              fontSize: 12,
              fontWeight: 600,
              color: reminders?.overdue_count > 0 ? 'var(--accent-rose)' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
            title="Eslatmalar va xodimlarga topshiriqlar"
          >
            <BellRing size={14} color={reminders?.overdue_count > 0 ? 'var(--accent-rose)' : 'var(--primary)'} />
            <span>Eslatmalar</span>
            {reminders?.overdue_count > 0 && (
              <span
                style={{
                  background: 'var(--accent-rose)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {reminders.overdue_count}
              </span>
            )}
          </button>
        )}

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
