import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Search, ChevronDown, Sun, Moon, Bell, BellRing, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../../context/ConfirmContext';
import { resolveAvatarUrl } from '../../api/client';
import IlbiLogo from '../common/IlbiLogo';
import { getNavigation } from './navigation';
import WorkspaceSwitch from './WorkspaceSwitch';

export default function Sidebar({
  onOpenNotifications,
  onOpenReminders,
  unreadCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { user, isOwner, isAdmin, logout } = useAuth();
  const { activeTenant } = useTenant();
  const { reminders } = useWorkspace();
  const { isDark, toggleTheme } = useTheme();
  const confirm = useConfirm();
  const [filterQuery, setFilterQuery] = useState('');

  const handleNavClick = () => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogoutClick = async () => {
    const isConfirmed = await confirm({
      title: 'Tizimdan chiqish',
      message: 'Haqiqatan ham ILBI tizimidan chiqmoqchimisiz?',
      confirmText: 'Chiqish',
      cancelText: 'Bekor qilish',
      type: 'warning',
    });
    if (isConfirmed) {
      if (mobileOpen && onCloseMobile) onCloseMobile();
      logout();
    }
  };

  const allNavItems = getNavigation({ user, isOwner, isAdmin });
  // "Yuklab olish" bo‘lim emas — u asosiy menyudan chiqarilib, pastki burchakdagi amallar blokiga joylanadi
  const navItems = allNavItems.filter((item) => item.to !== '/download');

  const filteredItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const roleLabel =
    user?.role === 'owner'
      ? 'Do‘kon Egasi'
      : user?.role === 'platform_admin'
      ? 'Administrator'
      : 'Kassir / Xodim';

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Foydalanuvchi';
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'IN';

  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar, user?.avatar_url]);

  const rawAvatar = user?.avatar_url || user?.avatar;
  const avatarUrl = !avatarError ? resolveAvatarUrl(rawAvatar) : null;

  const isEffectiveCollapsed = isCollapsed && !mobileOpen;

  return (
    <aside
      className={`sidebar ${isEffectiveCollapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`}
      role="navigation"
      aria-label="Asosiy menyu"
    >
      {/* Brand Header with Collapse and Mobile Close buttons */}
      {isEffectiveCollapsed ? (
        <div className="sidebar-header-collapsed">
          <NavLink
            to="/dashboard"
            className="sidebar-brand-icon"
            title="ILBI — Boshqaruv & POS Tizimi"
            onClick={handleNavClick}
          >
            <IlbiLogo
              size={32}
              iconOnly={true}
              showText={false}
            />
          </NavLink>

          {onToggleCollapse && (
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title="Menyuni kengaytirish"
              aria-label="Menyuni kengaytirish"
            >
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      ) : (
        <div className="sidebar-header-row">
          <NavLink
            to="/dashboard"
            className="sidebar-brand"
            title="ILBI — Boshqaruv & POS Tizimi"
            onClick={handleNavClick}
          >
            <IlbiLogo size={32} />
          </NavLink>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Menyuni yopish"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse / Expand Button */}
          {onToggleCollapse && (
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title="Menyuni ixchamlashtirish"
              aria-label="Menyuni ixchamlashtirish"
            >
              <ChevronLeft size={17} />
            </button>
          )}
        </div>
      )}

      {/* Profile Header */}
      <NavLink
        to="/profile"
        className="profile"
        style={{ textDecoration: 'none', cursor: 'pointer' }}
        title={`${displayName} (${roleLabel}) — Profilni ko‘rish`}
        onClick={handleNavClick}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            onError={() => setAvatarError(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div className="avatar">{userInitials}</div>
        )}
        <div className="details">
          <p className="name">{displayName}</p>
          <p className="role">{roleLabel}</p>
        </div>
        <ChevronDown size={16} className="chevron" />
      </NavLink>

      {/* Search Input in Sidebar (hidden in compact collapsed mode) */}
      {!isEffectiveCollapsed && (
        <div className="search">
          <input
            type="text"
            placeholder="Bo‘lim qidirish..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      )}

      {/* Nav List with Capsule Pill Highlighting */}
      <nav>
        {filteredItems.map((item) => {
          const Icon = item.icon;

          if (item.isSupportWidget && !isEffectiveCollapsed) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) => `sidebar-support-widget ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  margin: '10px 4px 6px',
                  padding: '11px 14px',
                  borderRadius: 14,
                  background: isActive
                    ? 'rgba(var(--primary-rgb), 0.08)'
                    : 'rgba(var(--primary-rgb), 0.04)',
                  border: isActive
                    ? '1.5px solid var(--primary)'
                    : '1px solid rgba(var(--primary-rgb), 0.25)',
                  cursor: 'pointer',
                  display: 'block',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                })}
                title="Yordam markazi — To‘liq sahifani ochish"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(var(--primary-rgb), 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: 999,
                          background: 'var(--accent-emerald)',
                          color: 'var(--on-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
                        Live
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Savolingiz bormi? Yozing
                    </div>
                  </div>
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={handleNavClick}
              className={({ isActive }) => `item ${isActive ? 'active' : ''}`}
              title={isEffectiveCollapsed ? item.label : undefined}
            >
              <div className="icon-wrapper">
                <Icon size={20} />
              </div>
              <p>{item.label}</p>
              {item.badge && <span className="badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Action Row (Theme Switcher, Notifications, Logout) */}
      <div className="actions">
        <WorkspaceSwitch className="action-btn" />
        <button
          type="button"
          className="action-btn"
          onClick={toggleTheme}
          title={isDark ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
          aria-label="Mavzuni almashtirish"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {onOpenNotifications && (
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              if (mobileOpen && onCloseMobile) onCloseMobile();
              onOpenNotifications();
            }}
            title="Xabarnomalar va B2B"
            aria-label="Xabarnomalar"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent-rose)',
                  boxShadow: '0 0 8px var(--accent-rose)',
                }}
              />
            )}
          </button>
        )}

        {onOpenReminders && !isAdmin && activeTenant && (
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              if (mobileOpen && onCloseMobile) onCloseMobile();
              onOpenReminders();
            }}
            title="Eslatmalar va topshiriqlar"
            aria-label="Eslatmalar"
            style={{ position: 'relative' }}
          >
            <BellRing size={18} />
            {reminders?.overdue_count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent-rose)',
                  boxShadow: '0 0 8px var(--accent-rose)',
                }}
              />
            )}
          </button>
        )}

        <NavLink
          to="/download"
          className="action-btn"
          onClick={handleNavClick}
          title="ILBI Desktop ilovasini yuklab olish"
          aria-label="Yuklab olish"
        >
          <Download size={18} />
        </NavLink>

        <button
          type="button"
          className="action-btn"
          onClick={handleLogoutClick}
          title="Tizimdan chiqish"
          aria-label="Chiqish"
          style={{ marginLeft: isEffectiveCollapsed ? '0' : 'auto' }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
