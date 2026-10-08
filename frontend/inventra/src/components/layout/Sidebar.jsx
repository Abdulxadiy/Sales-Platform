import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Coins,
  ShieldCheck,
  LogOut,
  Store,
  Users,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Bell,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sliders,
  X,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../../context/ConfirmContext';
import { resolveAvatarUrl } from '../../api/client';
import InventraLogo from '../common/InventraLogo';

export default function Sidebar({
  onOpenNotifications,
  unreadCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { user, isOwner, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const confirm = useConfirm();
  const [filterQuery, setFilterQuery] = useState('');

  const handleLogoutClick = async () => {
    const isConfirmed = await confirm({
      title: 'Tizimdan chiqish',
      message: 'Haqiqatan ham Inventra tizimidan chiqmoqchimisiz?',
      confirmText: 'Chiqish',
      cancelText: 'Bekor qilish',
      type: 'warning',
    });
    if (isConfirmed) {
      if (onCloseMobile) onCloseMobile();
      logout();
    }
  };

  // Role-based Nav Items (Clean, readable, no overlapping static badges)
  const navItems = [
    ...(!user || isAdmin || isOwner
      ? [
          {
            to: '/',
            label: 'Dashboard',
            icon: LayoutDashboard,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: '/tenants',
            label: 'Do‘konlar (Tenants)',
            icon: Store,
          },
        ]
      : []),
    ...(!isAdmin
      ? [
          {
            to: '/pos',
            label: 'Kassa (POS)',
            icon: ShoppingCart,
          },
          {
            to: '/catalog',
            label: 'Katalog & Tovar',
            icon: Package,
          },
          {
            to: '/inventory',
            label: 'Ombor & Qoldiq',
            icon: Boxes,
          },
          {
            to: '/sales',
            label: 'Savdo & Nasiyalar',
            icon: Receipt,
          },
          {
            to: '/shifts',
            label: 'Kassa & Smena',
            icon: Coins,
          },
        ]
      : []),
    ...(isAdmin || isOwner
      ? [
          {
            to: '/branches',
            label: 'Filiallar',
            icon: GitBranch,
          },
          {
            to: '/employees',
            label: 'Xodimlar (Jamoa)',
            icon: Users,
          },
          {
            to: '/services',
            label: 'Xizmatlar & Sozlamalar',
            icon: Sliders,
          },
          {
            to: '/audit',
            label: 'Audit Jurnali',
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      to: '/docs',
      label: 'Qo‘llanma & Hujjatlar',
      icon: BookOpen,
    },
    {
      to: '/profile',
      label: 'Mening Profilim',
      icon: User,
    },
  ];

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
            to="/"
            className="sidebar-brand-icon"
            title="Inventra — Boshqaruv & POS Tizimi"
            onClick={onCloseMobile}
          >
            <InventraLogo
              size={32}
              iconOnly={true}
              showText={false}
              showBadge={false}
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
            to="/"
            className="sidebar-brand"
            title="Inventra — Boshqaruv & POS Tizimi"
            onClick={onCloseMobile}
          >
            <InventraLogo size={32} showBadge={true} badgeText="PRO" />
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
        onClick={onCloseMobile}
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
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onCloseMobile}
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
              if (onCloseMobile) onCloseMobile();
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
