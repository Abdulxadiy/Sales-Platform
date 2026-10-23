import { createVisiblePoller } from '../../utils/visiblePolling';
import IlbiLoader from '../common/IlbiLoader';
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Modal from '../common/Modal';
import PriceInput from '../common/PriceInput';
import { cashboxApi, salesApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import NotificationCard from '../notifications/NotificationCard';
import FloatingNotificationToast from '../notifications/FloatingNotificationToast';
import { usePersistedState } from '../../hooks/usePersistedState';
import { WorkspaceProvider, useWorkspace } from '../../context/WorkspaceContext';
import '../../styles/workspace.css';
import { platformApi } from '../../api/platform';
const Reminders = React.lazy(() => import('../workspace/Reminders'));

function LayoutContent({ children }) {
  const { mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin, user } = useAuth();
  const { activeTenant } = useTenant();
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [cashCounted, setCashCounted] = useState('');
  const [cashCountedUsd, setCashCountedUsd] = useState('0');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Responsive Sidebar States
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('ilbi_sidebar_collapsed', false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  // Global Reminders & Tasks Listener
  const [initiallyCreatingReminder, setInitiallyCreatingReminder] = useState(false);
  useEffect(() => {
    const handleOpenReminders = (e) => {
      setInitiallyCreatingReminder(Boolean(e?.detail?.create));
      setRemindersModalOpen(true);
    };
    window.addEventListener('workspace_open_reminders', handleOpenReminders);
    return () => window.removeEventListener('workspace_open_reminders', handleOpenReminders);
  }, []);

  // Notifications & B2B
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
  const [floatingNotifs, setFloatingNotifs] = useState([]);
  useEffect(() => {
    if (!isAdmin) return undefined;
    const poller = createVisiblePoller(async signal => {
      const result = await platformApi.supportUnread(signal);
      if (!signal.aborted) setUnreadCount(result.unread);
    }, { intervalMs: 20000, events: ['support_updated'] });
    return () => poller.stop();
  }, [isAdmin, user?.id]);

  const knownIdsRef = useRef(new Set());

  const triggerFloatingToast = (notif) => {
    setFloatingNotifs((prev) => {
      if (prev.some((item) => item.id === notif.id)) return prev;
      return [...prev.slice(-2), notif]; // keep maximum 3 toasts
    });
  };

  const handleDismissFloatingToast = (id) => {
    setFloatingNotifs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenDetailsFromToast = (notif) => {
    handleDismissFloatingToast(notif.id);
    setNotifModalOpen(true);
  };

  const notificationTenantRef = useRef(activeTenant?.id);
  notificationTenantRef.current = activeTenant?.id;
  const notificationPollerRef = useRef(null);
  const historyCursorRef = useRef(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const loadNotifications = () => notificationPollerRef.current?.refresh();
  useEffect(() => {
    setNotifications([]); setUnreadCount(0); setFloatingNotifs([]); setHasMoreNotifications(false);
    knownIdsRef.current = new Set();
    historyCursorRef.current = null;
    if (isAdmin || !activeTenant?.id) return;
    let newestId = 0;
    const poller = createVisiblePoller(async signal => {
      const initial = newestId === 0;
      const response = await salesApi.getNotifications({ page: 1, page_size: 20, after_id: newestId || undefined }, { signal });
      if (signal.aborted) return;
      const rows = response.results;
      setNotifications(prev => initial ? rows : [...new Map([...prev, ...rows].map(row => [row.id, row])).values()].sort((a,b) => b.id-a.id));
      setUnreadCount(response.unread_count);
      if (initial) {
        historyCursorRef.current = response.next_before_id;
        setHasMoreNotifications(Boolean(response.next_before_id));
      }
      for (const row of rows) {
        if (!initial && !row.is_read && !knownIdsRef.current.has(row.id)) triggerFloatingToast(row);
        knownIdsRef.current.add(row.id);
        newestId = Math.max(newestId, row.id);
      }
      if (!initial && response.next) notificationPollerRef.current?.refresh();
    }, { events: ['refresh_notifications', 'shift_closed'] });
    notificationPollerRef.current = poller;
    return () => { poller.stop(); notificationPollerRef.current = null; };
  }, [isAdmin, activeTenant?.id]);
  const loadOlderNotifications = async () => {
    if (loadingHistory || !historyCursorRef.current) return;
    const tenantId = activeTenant?.id;
    setLoadingHistory(true);
    try {
      const response = await salesApi.getNotifications({ page: 1, page_size: 20, before_id: historyCursorRef.current });
      if (notificationTenantRef.current !== tenantId) return;
      setNotifications(prev => [...new Map([...prev, ...response.results].map(row => [row.id,row])).values()].sort((a,b)=>b.id-a.id));
      historyCursorRef.current = response.next_before_id;
      setHasMoreNotifications(Boolean(response.next_before_id));
    } catch (error) { toast.error(error.message); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => {
    setShiftModalOpen(false);
    setShiftData(null);
    setCashCounted('');
    setCashCountedUsd('0');
    setDiscrepancyReason('');
    setNotes('');
    setNotifModalOpen(false);
  }, [activeTenant?.id]);

  const handleMarkRead = async (id) => {
    try {
      await salesApi.markNotificationRead(id);
      setNotifications(prev => prev.map(row => row.id === id ? {...row, is_read:true} : row));
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    try {
      await salesApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(row => ({...row, is_read:true})));
      setUnreadCount(0);
      toast.success('Barcha bildirishnomalar o‘qildi deb belgilandi');
      loadNotifications();
    } catch (error) { toast.error(error.message); }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await salesApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => {
        const target = notifications.find((n) => n.id === id);
        return target && !target.is_read ? Math.max(0, prev - 1) : prev;
      });
      toast.success('Bildirishnoma o‘chirildi');
    } catch {
      toast.error('Bildirishnomani o‘chirishda xatolik yuz berdi');
    }
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0) return;
    const ok = await confirm({
      title: 'Barcha bildirishnomalarni tozalash',
      message: 'Haqiqatan ham barcha bildirishnomalarni o‘chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.',
      confirmText: 'Ha, tozalash',
      cancelText: 'Bekor qilish',
      type: 'warning',
    });
    if (!ok) return;

    try {
      await salesApi.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setHasMoreNotifications(false);
      historyCursorRef.current = null;
      toast.success('Barcha bildirishnomalar tozalandi');
    } catch {
      toast.error('Bildirishnomalarni tozalashda xatolik yuz berdi');
    }
  };

  // Derive title from pathname
  const getPageInfo = () => {
    switch (location.pathname) {
      case '/dashboard':
        return {
          title: isAdmin ? 'Platforma boshqaruvi' : 'Savdo Analitikasi & Dashboard',
          subtitle: isAdmin ? 'Hisoblar, do‘konlar, murojaatlar va ma’muriy nazorat' : 'Biznesingizning jonli ko‘rsatkichlari, tushum va qoldiqlar',
        };
      case '/pos':
        return {
          title: 'Tezkor Kassa (POS) Sotuv',
          subtitle: 'Shtrix-kod skaneri, savat va tezkor to‘lov qabuli',
        };
      case '/catalog':
        return {
          title: 'Mahsulotlar Katalogi',
          subtitle: 'Barcha tovarlar, narxlar va MinIO rasmlari',
        };
      case '/inventory':
        return {
          title: 'Ombor & Harakatlar Tarixi',
          subtitle: 'Tovar kirimi, qoldiqlar tahlili va spisanielar',
        };
      case '/sales':
        return {
          title: 'Savdolar Tarixi',
          subtitle: 'Cheklar, sotuvlar jurnali, bekor qilishlar va kassa tushumlari',
        };
      case '/debts':
        return {
          title: 'Mijoz Nasiyalari & Qarzdorlik',
          subtitle: 'Kontragentlar, qarz to‘lovlari, filial tanlovi va xaridlar tarixi',
        };
      case '/b2b':
        return {
          title: 'B2B Tranzaksiyalar & Hamkorlik',
          subtitle: 'Kiruvchi B2B fakturalar, qabul qilish, rad etish va tovar qaytishlari',
        };
      case '/shifts':
        return {
          title: 'Kassa Smenalari & Z-Hisobotlar',
          subtitle: 'Chiqim va kirimlar, smena yopish jurnali',
        };
      case '/my-tenants':
        return {
          title: 'Filiallar Boshqaruvi',
          subtitle: 'Do‘konning barcha filiallari, manzillari va savdo nuqtalari',
        };
      case '/tenants':
        return {
          title: 'Do‘konlar boshqaruvi',
          subtitle: 'Platformadagi barcha do‘konlar va ularning faolligi',
        };
      case '/employees':
        return {
          title: 'Xodimlar & Jamoa Boshqaruvi',
          subtitle: 'Do‘kon xodimlari, lavozimlar, ishga olish va bo‘shatish',
        };
      case '/services':
        return {
          title: 'Xizmatlar & Sozlamalar',
          subtitle: isAdmin ? 'Platforma bildirishnomalari, kirish xavfsizligi va do‘kon sozlamalari' : 'Valyuta kursi, Telegram guruhlar, kassa cheki va hisobotlar avtomatizatsiyasi',
        };
      case '/accounts':
        return { title: 'Hisoblar & Kirish', subtitle: 'Barcha hisoblar, login va Telegram ulanishlarini boshqarish' };
      case '/audit':
        return {
          title: 'O‘zgarmas Audit Jurnali',
          subtitle: 'Barcha ma’muriy va moliyaviy amallar xavfsizlik nazorati',
        };
      case '/history':
        return { title: 'Amallar tarixi', subtitle: 'Sotuv, kirim, tahrir va barcha muhim harakatlar bir joyda' };
      case '/profile':
        return {
          title: 'Foydalanuvchi Profili',
          subtitle: 'Shaxsiy ma’lumotlar, profilingiz rasmi va xavfsizlik sozlamalari',
        };
      case '/docs':
        return {
          title: 'Foydalanish Qo‘llanmasi & Hujjatlar',
          subtitle: 'Tizimni boshqarish bo‘yicha qo‘llanmalar va rasmiy huquqiy kelishuvlar',
        };
      case '/support':
        return {
          title: isAdmin ? 'Yordam: Murojaatlar Boshqaruvi' : 'Yordam Markazi',
          subtitle: isAdmin
            ? 'Foydalanuvchilar va mehmonlarning murojaatlarini ko‘rib chiqish'
            : 'Savollaringiz va takliflaringiz bo‘yicha qo‘llab-quvvatlash xizmati',
        };
      default:
        return { title: 'ILBI', subtitle: '' };
    }
  };

  const { title, subtitle } = getPageInfo();

  useEffect(() => {
    if (shiftModalOpen && !isAdmin) {
      cashboxApi.getCurrentShift(activeTenant?.id)
        .then((data) => setShiftData(data))
        .catch(() => setShiftData(null));
    }
  }, [shiftModalOpen, isAdmin, activeTenant?.id]);

  const expectedUzs = Number(shiftData?.expected_cash_uzs || 0);
  const expectedUsd = Number(shiftData?.expected_cash_usd || 0);
  const diffUzs = cashCounted ? parseFloat(cashCounted) - expectedUzs : 0;
  const diffUsd = (expectedUsd > 0 && cashCountedUsd) ? parseFloat(cashCountedUsd) - expectedUsd : 0;
  const hasDiff = (cashCounted && Math.abs(diffUzs) > 0.01) || (expectedUsd > 0 && Math.abs(diffUsd) > 0.01);

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!cashCounted) {
      toast.warning('Iltimos, sanab olingan haqiqiy naqd pulni kiriting');
      return;
    }

    setClosing(true);
    try {
      await cashboxApi.closeShift({
        shift_id: shiftData?.shift_id,
        actual_cash_uzs: parseFloat(cashCounted),
        actual_cash_usd: parseFloat(cashCountedUsd || '0'),
        discrepancy_reason: discrepancyReason,
        staff_notes: notes,
      });
      toast.success('Smena muvaffaqiyatli yopildi va Z-hisobot yaratildi!');
      setShiftModalOpen(false);
      setCashCounted('');
      setCashCountedUsd('0');
      setDiscrepancyReason('');
      setNotes('');
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
      window.dispatchEvent(new CustomEvent('shift_status_changed'));
    } catch (err) {
      toast.error(err.message || 'Smenani yopishda xatolik yuz berdi');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className={`app-layout workspace-${mode} ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Collapsible Sidebar (Active only in Classic desktop) */}
      {mode !== 'fast' && (
        <Sidebar
          onOpenNotifications={() => isAdmin ? navigate('/support') : setNotifModalOpen(true)}
          onOpenReminders={() => { setInitiallyCreatingReminder(false); setRemindersModalOpen(true); }}
          unreadCount={unreadCount}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenShiftModal={() => setShiftModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNotifications={() => isAdmin ? navigate('/support') : setNotifModalOpen(true)}
          onOpenReminders={() => setRemindersModalOpen(true)}
          unreadCount={unreadCount}
          notifications={notifications}
        />
        <main style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
          {mode === 'fast' && location.pathname !== '/dashboard' && <div className="workspace-page-heading"><h1>{title}</h1><p>{subtitle}</p></div>}
          <React.Suspense fallback={null}>
            <div className="animate-fade-in" key={location.pathname}>
            {!isAdmin && !activeTenant && !['/my-tenants', '/profile', '/docs', '/support'].includes(location.pathname)
              ? <div className="glass-card" style={{ padding: 24 }}>Yuqoridagi menyudan do‘konni tanlang.</div>
              : (children || <Outlet key={`${user?.id}:${activeTenant?.id || 'platform'}`} />)}
            </div>
          </React.Suspense>
        </main>
      </div>

      {/* Smena Yopish Modali */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title="Kassa Smenasini Yopish & Z-Hisobot"
      >
        <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Expected Cash Box */}
          <div
            style={{
              padding: 12,
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
            }}
          >
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>
              Tizim bo‘yicha kutilayotgan naqd pul:
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                {expectedUzs.toLocaleString()} UZS
              </div>
              {expectedUsd > 0 && (
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  / ${expectedUsd.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Kassada sanab olingan haqiqiy naqd pul (UZS) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <PriceInput
              className="input-field"
              placeholder="Masalan: 1 200 000"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              required
            />
          </div>

          {expectedUsd > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Kassada sanab olingan haqiqiy naqd pul (USD) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <PriceInput
                className="input-field"
                placeholder="0.00"
                value={cashCountedUsd}
                onChange={(e) => setCashCountedUsd(e.target.value)}
                required
              />
            </div>
          )}

          {/* Live Discrepancy Indicator */}
          {cashCounted && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                background: hasDiff ? 'rgba(var(--danger-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)',
                color: hasDiff ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                border: `1px solid ${hasDiff ? 'rgba(var(--danger-rgb), 0.25)' : 'rgba(var(--success-rgb), 0.25)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Tafovut (Farq):</span>
              <span>
                {!hasDiff
                  ? '0 UZS (Tafovut yo‘q — Kassa to‘liq)'
                  : `${diffUzs !== 0 ? `${diffUzs > 0 ? '+' : ''}${Math.round(diffUzs).toLocaleString()} UZS` : ''}${diffUsd !== 0 ? ` ${diffUsd > 0 ? '+$' : '-$'}${Math.abs(diffUsd).toFixed(2)}` : ''} (${diffUzs < 0 || diffUsd < 0 ? 'Kamomad' : 'Ortiqcha'})`}
              </span>
            </div>
          )}

          {hasDiff && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--accent-rose)', marginBottom: 5 }}>
                Tafovut sababi (ixtiyoriy)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Masalan: Qaytim berishda adashilgan..."
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Smena bo‘yicha qo‘shimcha xodim izohi (ixtiyoriy)
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Eslatmalar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="btn btn-secondary"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={closing}
              className="btn btn-primary"
            >
              {closing ? 'Yopilmoqda...' : 'Smenani Yopish & Z-Hisobot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Top-Right Notification Toasts (5s animation) */}
      <div className="notif-toast-container" aria-live="polite">
        {floatingNotifs.map((item) => (
          <FloatingNotificationToast
            key={item.id}
            notification={item}
            onDismiss={handleDismissFloatingToast}
            onOpenDetails={handleOpenDetailsFromToast}
            duration={5000}
          />
        ))}
      </div>

      {/* Notifications & B2B Drawer Modal */}
      <Modal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        title="Xabarnomalar va B2B Bildirishnomalar"
        maxWidth={720}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top toolbar with filter tabs & actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setNotifFilter('all')}
                className={`btn ${notifFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 999 }}
              >
                Barchasi ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('unread')}
                className={`btn ${notifFilter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 999 }}
              >
                O‘qilmaganlar ({unreadCount})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="btn btn-secondary"
                  style={{ padding: '6px 11px', fontSize: 11.5 }}
                  title="Barcha xabarnomalarni o‘qildi deb belgilash"
                >
                  <CheckCheck size={14} color="var(--accent-emerald)" />
                  <span>Barchasini o‘qildi</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotifications}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 11px',
                    fontSize: 11.5,
                    color: 'var(--accent-rose)',
                  }}
                  title="Barcha xabarnomalarni tozalash"
                >
                  <Trash2 size={13} />
                  <span>Barchasini tozalash</span>
                </button>
              )}
            </div>
          </div>

          {hasMoreNotifications && <button type="button" className="btn btn-secondary" onClick={loadOlderNotifications} disabled={loadingHistory}>
            {loadingHistory && <IlbiLoader size={24} inline decorative />}
            {loadingHistory ? 'Yuklanmoqda...' : 'Oldingi bildirishnomalarni yuklash'}
          </button>}
          {/* List of Notification Cards */}
          {(() => {
            const list = notifications.filter((n) =>
              notifFilter === 'unread' ? !n.is_read : true
            );

            if (list.length === 0) {
              return (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Bell size={32} style={{ opacity: 0.35 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {notifFilter === 'unread'
                      ? 'O‘qilmagan xabarnomalar yo‘q'
                      : 'Xabarnomalar mavjud emas'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Yangi xabarnomalar kelganda ular o‘ng yuqorida va shu yerda ko‘rinadi
                  </div>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {list.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDeleteNotification}
                    onNavigate={() => setNotifModalOpen(false)}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Reminders & Employee Task Modal (Accessible in both Classic & Fast desktops) */}
      {remindersModalOpen && (
        <Modal
          isOpen
          onClose={() => { setRemindersModalOpen(false); setInitiallyCreatingReminder(false); }}
          title="Eslatmalar va Xodimlarga topshiriqlar"
          maxWidth={760}
          overflow="visible"
        >
          <React.Suspense fallback={<IlbiLoader />}>
            <Reminders initiallyCreating={initiallyCreatingReminder} />
          </React.Suspense>
        </Modal>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  return <WorkspaceProvider><LayoutContent>{children}</LayoutContent></WorkspaceProvider>;
}
