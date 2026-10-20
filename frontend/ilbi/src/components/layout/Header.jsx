import { createVisiblePoller } from '../../utils/visiblePolling';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Menu } from 'lucide-react';
import { cashboxApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import TenantSwitcher from './TenantSwitcher';
import { useWorkspace } from '../../context/WorkspaceContext';
const WorkspaceNavbar = React.lazy(() => import('./WorkspaceNavbar'));

export default function Header({
  title,
  subtitle,
  onOpenShiftModal,
  onOpenMobileMenu,
  onOpenNotifications,
  unreadCount,
  notifications,
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { mode } = useWorkspace();
  const { activeTenant } = useTenant();
  const canViewCashbox = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.view_cashbox");
  const canManageShift = activeTenant?.is_owner || activeTenant?.permissions?.includes("cashbox.manage_shift");
  const [time, setTime] = useState(new Date());
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

  const statusControl = <>{isAdmin ? (
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
        <TenantSwitcher />

        {statusControl}

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
