import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Menu, GitBranch, Store } from 'lucide-react';
import { cashboxApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import CustomSelect from '../common/CustomSelect';

export default function Header({
  title,
  subtitle,
  onOpenShiftModal,
  onOpenMobileMenu,
}) {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useBranch();
  const [time, setTime] = useState(new Date());
  const [shift, setShift] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchShift = useCallback(() => {
    if (isAdmin) return;
    cashboxApi
      .getCurrentShift(activeBranch?.id)
      .then((data) => setShift(data))
      .catch(() => setShift(null));
  }, [isAdmin, activeBranch?.id]);

  useEffect(() => {
    fetchShift();

    const handleShiftEvent = () => fetchShift();
    window.addEventListener('shift_status_changed', handleShiftEvent);
    window.addEventListener('refresh_notifications', handleShiftEvent);
    window.addEventListener('branch_changed', handleShiftEvent);

    const interval = setInterval(fetchShift, 10000);

    return () => {
      window.removeEventListener('shift_status_changed', handleShiftEvent);
      window.removeEventListener('refresh_notifications', handleShiftEvent);
      window.removeEventListener('branch_changed', handleShiftEvent);
      clearInterval(interval);
    };
  }, [fetchShift]);

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
        {!isAdmin && activeBranch && (
          isOwner && branches.length > 1 ? (
            <CustomSelect
              value={activeBranch.id}
              onChange={(newBranchId) => {
                const sel = branches.find((b) => String(b.id) === String(newBranchId));
                if (sel) setActiveBranch(sel);
              }}
              options={branches.map((b) => ({
                value: b.id,
                label: b.name,
                badge: b.is_main ? 'Asosiy' : null,
              }))}
              icon={GitBranch}
              size="sm"
              title="Faol filialni almashtirish"
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
          ) : (
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
              title={`Faol filial: ${activeBranch.name}`}
            >
              <Store size={14} color="var(--primary)" />
              <span>{activeBranch.name}</span>
            </div>
          )
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
        ) : (
          <div
            onClick={() => {
              if (isShiftOpen && onOpenShiftModal) {
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
