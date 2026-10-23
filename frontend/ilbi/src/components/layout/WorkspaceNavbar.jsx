import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Plus, ChevronDown, Star, SlidersHorizontal, Calculator, Maximize, Minimize,
  Sun, Moon, Bell, BellRing, Keyboard, LogOut, User, ShoppingCart, PackagePlus,
  Package, CreditCard, FileSpreadsheet, UserPlus, Download, Headphones,
  Store, Users, ShieldCheck, Sliders, History, BookOpen, Layers, Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import { canUse } from '../../utils/workspace';
import { getNavigation } from './navigation';
import WorkspaceSwitch from './WorkspaceSwitch';
import TenantSwitcher from './TenantSwitcher';
import IlbiLogo from '../common/IlbiLogo';
import { resolveAvatarUrl } from '../../api/client';

const WorkspaceSearch = lazy(() => import('../workspace/WorkspaceSearch'));
const WorkspaceTools = lazy(() => import('../workspace/WorkspaceTools'));

export default function WorkspaceNavbar({ statusControl, unreadCount, notifications, onOpenNotifications }) {
  const { user, isOwner, isAdmin, logout } = useAuth();
  const { activeTenant } = useTenant();
  const { isDark, toggleTheme } = useTheme();
  const { reminders } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const root = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tool, setTool] = useState(null);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [brokenAvatar, setBrokenAvatar] = useState(null);

  const [favorites, setFavorites] = usePersistedState(
    `ilbi_workspace_favorites:${user?.id}:${activeTenant?.id || 'platform'}`,
    ['/debts', '/inventory', '/sales']
  );
  const [recent, setRecent] = usePersistedState(
    `ilbi_workspace_recent:${user?.id}:${activeTenant?.id || 'platform'}`,
    []
  );

  const navItems = getNavigation({ user, isOwner, isAdmin });
  const favoritePaths = Array.isArray(favorites)
    ? favorites.filter(path => navItems.some(item => item.to === path)).slice(0, 6)
    : [];
  const recentPaths = Array.isArray(recent)
    ? recent.filter(path => navItems.some(item => item.to === path) && !favoritePaths.includes(path)).slice(0, 3)
    : [];

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Foydalanuvchi';
  const initials = displayName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'IL';
  const avatar = resolveAvatarUrl(user?.avatar_url || user?.avatar);
  const notificationCount = Number(unreadCount || 0) + Number(reminders?.overdue_count || 0);

  const roleLabel =
    user?.role === 'owner'
      ? 'Do‘kon Egasi'
      : user?.role === 'platform_admin'
      ? 'Administrator'
      : 'Kassir / Xodim';

  const closeMenus = () => root.current?.querySelectorAll('details[open]').forEach(menu => { menu.open = false; });

  useEffect(() => {
    const path = location.pathname;
    setRecent(previous => [path, ...(Array.isArray(previous) ? previous : []).filter(item => item !== path)].slice(0, 8));
    closeMenus();
  }, [location.pathname, setRecent]);

  useEffect(() => {
    const keydown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
        event.preventDefault(); setSearchOpen(true); closeMenus();
      }
      if (event.key === 'Escape') closeMenus();
    };
    const clickAway = event => root.current?.querySelectorAll('details[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    const openReminders = () => setTool('reminders');
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', clickAway);
    document.addEventListener('fullscreenchange', updateFullscreen);
    window.addEventListener('workspace_open_reminders', openReminders);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', clickAway);
      document.removeEventListener('fullscreenchange', updateFullscreen);
      window.removeEventListener('workspace_open_reminders', openReminders);
    };
  }, []);

  useEffect(() => { setSearchOpen(false); setTool(null); closeMenus(); }, [activeTenant?.id]);

  function openTool(next) { closeMenus(); setTool(next); }
  function go(url) { closeMenus(); navigate(url); }

  const actions = [
    { label: 'Yangi sotuv', icon: ShoppingCart, url: '/pos', allowed: canUse(activeTenant, 'sales.add_sale') },
    { label: 'Tovar kirimi', icon: PackagePlus, url: '/inventory?workspace_action=intake', allowed: canUse(activeTenant, 'inventory.add_stock_intake') },
    { label: 'Yangi tovar', icon: Package, url: '/catalog?new=1', allowed: canUse(activeTenant, 'catalog.add_product') },
    { label: 'Yangi mijoz', icon: UserPlus, url: '/debts?workspace_action=new_customer', allowed: canUse(activeTenant, 'sales.manage_counterparty') },
    { label: 'Qarz to‘lovi', icon: CreditCard, tool: 'debt_payment', allowed: canUse(activeTenant, 'sales.record_debt_payment') },
    { label: 'XLSX import', icon: FileSpreadsheet, tool: 'imports', allowed: canUse(activeTenant, 'catalog.add_product', 'sales.manage_counterparty') },
    { label: 'Eslatma & Topshiriq', icon: BellRing, tool: 'new_reminder', allowed: Boolean(activeTenant) },
  ].filter(item => !isAdmin && item.allowed);

  // Group navigation items cleanly
  const adminPrimaryPaths = ['/dashboard', '/accounts', '/tenants', '/seller-profiles/review', '/history', '/audit', '/services', '/support', '/docs'];
  const tenantPrimaryPaths = ['/dashboard', '/pos', '/catalog', '/inventory', '/sales', '/debts', '/b2b', '/shifts'];
  const managementPaths = ['/history', '/my-tenants', '/employees', '/audit', '/services'];

  const primaryTabs = isAdmin
    ? navItems.filter(item => adminPrimaryPaths.includes(item.to))
    : navItems.filter(item => tenantPrimaryPaths.includes(item.to));

  const managementItems = !isAdmin
    ? navItems.filter(item => managementPaths.includes(item.to))
    : [];

  const isManagementActive = managementItems.some(item => location.pathname === item.to);

  const link = (item) => {
    if (!item) return null;
    const Icon = item.icon || Layers;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/dashboard'}
        onClick={closeMenus}
        className={({ isActive }) => `workspace-nav-link ${isActive ? 'active' : ''}`}
        title={item.label}
      >
        <Icon size={16} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <header className="workspace-navbar" ref={root} aria-label="Tezkor ish stoli">
      {/* 1. Top Row: Brand, Search, Actions, Controls, Utilities, Profile */}
      <div className="workspace-top-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <NavLink to="/dashboard" aria-label="ILBI bosh sahifa" className="workspace-brand">
            <IlbiLogo size={30} showText />
          </NavLink>
          <WorkspaceSwitch className="workspace-icon-button" />
        </div>

        <button
          type="button"
          className="workspace-search-trigger"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={18} />
          <span>Tovar, mijoz, chek yoki bo‘lim qidirish…</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions.length > 0 && (
            <details className="workspace-dropdown" name="workspace-menu">
              <summary className="header-create-button" title="Yangi amal yoki topshiriq biriktirish">
                <Plus size={16} />
                <span>Yangi</span>
                <ChevronDown size={13} />
              </summary>
              <div className="workspace-dropdown-panel workspace-actions-menu">
                {actions.map(action => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => action.tool ? openTool(action.tool) : go(action.url)}
                  >
                    <action.icon size={17} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          <div className="workspace-store-control">
            <TenantSwitcher />
          </div>

          <div className="workspace-shift-control">
            {statusControl}
          </div>

          {!isAdmin && (
            <NavLink
              to="/support"
              className={({ isActive }) => `workspace-support-live-btn ${isActive ? 'active' : ''}`}
              title="Yordam markazi — Savolingiz bormi? Yozing"
            >
              <Headphones size={15} />
              <span>Yordam</span>
              <span className="workspace-live-badge">
                <span className="workspace-live-dot" />
                Live
              </span>
            </NavLink>
          )}

          <div className="workspace-utility-actions">
            <NavLink
              to="/download"
              className="workspace-icon-button"
              title="ILBI Desktop ilovasini yuklab olish"
              aria-label="Yuklab olish"
            >
              <Download size={18} />
            </NavLink>

            <button
              type="button"
              className="workspace-icon-button"
              title="Mavzuni almashtirish"
              aria-label="Mavzuni almashtirish"
              onClick={toggleTheme}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <details className="workspace-dropdown" name="workspace-menu">
              <summary className="workspace-icon-button" title="Xabarnomalar" aria-label="Xabarnomalar">
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="workspace-badge">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </summary>
              <div className="workspace-dropdown-panel workspace-notifications-menu">
                <strong>Bildirishnomalar</strong>
                {(notifications || []).slice(0, 3).map(row => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => { closeMenus(); onOpenNotifications(); }}
                  >
                    <Bell size={16} />
                    <span>{row.title}</span>
                  </button>
                ))}
                {!isAdmin && activeTenant && (
                  <button type="button" onClick={() => openTool('reminders')}>
                    <BellRing size={17} />
                    <span>Eslatmalar va topshiriqlar</span>
                    {reminders?.overdue_count > 0 && (
                      <b className="workspace-count">{reminders.overdue_count}</b>
                    )}
                  </button>
                )}
                <button type="button" onClick={() => { closeMenus(); onOpenNotifications(); }}>
                  Barcha xabarnomalarni ko‘rish
                </button>
              </div>
            </details>

            <details className="workspace-dropdown" name="workspace-menu">
              <summary className="workspace-icon-button" title="Tezkor yordamchilar" aria-label="Tezkor yordamchilar">
                <Calculator size={18} />
              </summary>
              <div className="workspace-dropdown-panel">
                <button type="button" onClick={() => openTool('calculator')}>
                  <Calculator size={17} />Kalkulyator
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    closeMenus();
                    try {
                      if (document.fullscreenElement) await document.exitFullscreen();
                      else await document.documentElement.requestFullscreen();
                    } catch {
                      toast.error('To‘liq ekran rejimini ochib bo‘lmadi.');
                    }
                  }}
                >
                  {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                  {fullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran'}
                </button>
                <button type="button" onClick={() => openTool('shortcuts')}>
                  <Keyboard size={17} />Klaviatura yordamchisi
                </button>
              </div>
            </details>

            <details className="workspace-dropdown" name="workspace-menu">
              <summary className="workspace-profile-trigger" title={`${displayName} (${roleLabel})`}>
                <div className="workspace-avatar" style={{ margin: 0 }}>
                  {avatar && avatar !== brokenAvatar ? (
                    <img src={avatar} alt="" onError={() => setBrokenAvatar(avatar)} />
                  ) : (
                    initials
                  )}
                </div>
                <div className="workspace-profile-info">
                  <span className="workspace-profile-name">{displayName}</span>
                  <span className="workspace-profile-role">{roleLabel}</span>
                </div>
                <ChevronDown size={13} className="workspace-profile-chevron" />
              </summary>
              <div className="workspace-dropdown-panel workspace-profile-menu">
                <div className="workspace-profile-header">
                  <div className="workspace-avatar" style={{ width: 38, height: 38, fontSize: 13, margin: 0 }}>
                    {avatar && avatar !== brokenAvatar ? (
                      <img src={avatar} alt="" onError={() => setBrokenAvatar(avatar)} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <strong className="workspace-profile-title">{displayName}</strong>
                    <span className="workspace-profile-sub">{roleLabel}</span>
                  </div>
                </div>
                <div className="workspace-menu-divider" />
                <NavLink to="/profile" onClick={closeMenus}>
                  <User size={16} />
                  <span>Mening profilim</span>
                </NavLink>
                {isOwner && (
                  <NavLink to="/my-tenants" onClick={closeMenus}>
                    <Store size={16} />
                    <span>Mening do‘konlarim</span>
                  </NavLink>
                )}
                {(isOwner || isAdmin || user?.permissions?.includes('tenants.manage_settings')) && (
                  <NavLink to="/services" onClick={closeMenus}>
                    <Sliders size={16} />
                    <span>Xizmatlar & Sozlamalar</span>
                  </NavLink>
                )}
                <NavLink to="/docs" onClick={closeMenus}>
                  <BookOpen size={16} />
                  <span>Qo‘llanma & Hujjatlar</span>
                </NavLink>
                <div className="workspace-menu-divider" />
                <button
                  type="button"
                  className="workspace-logout-btn"
                  onClick={async () => {
                    closeMenus();
                    if (
                      await confirm({
                        title: 'Tizimdan chiqish',
                        message: 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
                        confirmText: 'Chiqish',
                        cancelText: 'Bekor qilish',
                        type: 'warning',
                      })
                    ) {
                      logout();
                    }
                  }}
                >
                  <LogOut size={16} />
                  <span>Chiqish</span>
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* 2. Navigation Row: Core Operational Tabs + Management Menu + Favorites */}
      <nav className="workspace-nav-row" aria-label="Asosiy menyu">
        <div className="workspace-nav-links">
          {primaryTabs.map(item => link(item))}

          {!isAdmin && (
            <NavLink
              to="/docs"
              onClick={closeMenus}
              className={({ isActive }) => `workspace-nav-link ${isActive ? 'active' : ''}`}
              title="Qo‘llanma & Hujjatlar"
            >
              <BookOpen size={16} />
              <span>Qo‘llanma</span>
            </NavLink>
          )}
        </div>

        {/* Right side navigation actions (outside scrollable links to prevent dropdown clipping) */}
        <div className="workspace-nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {managementItems.length > 0 && (
            <details className={`workspace-dropdown workspace-nav-dropdown ${isManagementActive ? 'active' : ''}`} name="workspace-menu">
              <summary
                className="workspace-nav-settings-trigger"
                style={isManagementActive ? { color: 'var(--text-primary)', background: 'var(--bg-chip)', fontWeight: 700 } : undefined}
                title="Boshqaruv va sozlamalar"
              >
                <Settings size={15} />
                <span>Sozlamalar</span>
                <ChevronDown size={13} />
              </summary>
              <div className="workspace-dropdown-panel workspace-nav-settings-panel" style={{ right: 0, minWidth: 220 }}>
                {managementItems.map(item => link(item))}
              </div>
            </details>
          )}

          {/* Quick Favorites Pill on the right */}
          {favoritePaths.length > 0 && (
            <details className="workspace-dropdown workspace-nav-favorites" name="workspace-menu">
              <summary className="workspace-nav-favorites-trigger" title="Sevimli va tezkor bo‘limlar">
                <Star size={13} />
                <span>Sevimlilar ({favoritePaths.length})</span>
                <ChevronDown size={11} />
              </summary>
              <div className="workspace-dropdown-panel workspace-favorites-panel">
                <strong>Tezkor Sevimlilar</strong>
                {favoritePaths.map(path => link(navItems.find(item => item.to === path)))}
                {recentPaths.length > 0 && (
                  <>
                    <div className="workspace-menu-divider" />
                    <strong style={{ fontSize: 11, color: 'var(--text-muted)' }}>Oxirgi:</strong>
                    {recentPaths.map(path => link(navItems.find(item => item.to === path)))}
                  </>
                )}
                <div className="workspace-menu-divider" />
                <button
                  type="button"
                  onClick={() => openTool('favorites')}
                  style={{ color: 'var(--primary)', fontWeight: 600 }}
                >
                  <SlidersHorizontal size={14} />
                  <span>Moslashtirish</span>
                </button>
              </div>
            </details>
          )}
        </div>
      </nav>

      <Suspense fallback={null}>
        {searchOpen && (
          <WorkspaceSearch
            key={activeTenant?.id || 'platform'}
            navItems={navItems}
            onClose={() => setSearchOpen(false)}
          />
        )}
        {tool && (
          <WorkspaceTools
            key={`${activeTenant?.id}:${tool}`}
            tool={tool}
            navItems={navItems}
            favorites={favoritePaths}
            setFavorites={setFavorites}
            onClose={() => setTool(null)}
          />
        )}
      </Suspense>
    </header>
  );
}
