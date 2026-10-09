import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Modal from '../common/Modal';
import { cashboxApi, salesApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import NotificationCard from '../notifications/NotificationCard';
import FloatingNotificationToast from '../notifications/FloatingNotificationToast';
import { usePersistedState } from '../../hooks/usePersistedState';

export default function Layout() {
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { activeBranch } = useBranch();
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [cashCounted, setCashCounted] = useState('');
  const [cashCountedUsd, setCashCountedUsd] = useState('0');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Responsive Sidebar States
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('inventra_sidebar_collapsed', false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  // Notifications & B2B
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
  const [floatingNotifs, setFloatingNotifs] = useState([]);

  const knownIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

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

  const loadNotifications = async (triggerToast = false) => {
    try {
      const res = await salesApi.getNotifications();
      const list = Array.isArray(res) ? res : res.results || [];
      setNotifications(list);
      const unread = list.filter((n) => !n.is_read);
      setUnreadCount(unread.length);

      if (isInitialLoadRef.current) {
        list.forEach((n) => knownIdsRef.current.add(n.id));
        isInitialLoadRef.current = false;
      } else if (triggerToast) {
        const newUnread = list.filter(
          (n) => !n.is_read && !knownIdsRef.current.has(n.id)
        );
        newUnread.forEach((n) => {
          knownIdsRef.current.add(n.id);
          triggerFloatingToast(n);
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAdmin) return;
    loadNotifications(false);

    // Poll every 10 seconds for new notifications
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 10000);

    const handleRefresh = () => {
      setTimeout(() => loadNotifications(true), 600);
    };

    window.addEventListener('refresh_notifications', handleRefresh);
    window.addEventListener('shift_closed', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_notifications', handleRefresh);
      window.removeEventListener('shift_closed', handleRefresh);
    };
  }, [isAdmin]);

  const handleMarkRead = async (id) => {
    try {
      await salesApi.markNotificationRead(id);
      loadNotifications(false);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => salesApi.markNotificationRead(n.id)));
      toast.success('Barcha bildirishnomalar o‘qildi deb belgilandi');
      loadNotifications(false);
    } catch {
      loadNotifications(false);
    }
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
      toast.success('Barcha bildirishnomalar tozalandi');
    } catch {
      toast.error('Bildirishnomalarni tozalashda xatolik yuz berdi');
    }
  };

  // Derive title from pathname
  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Savdo Analitikasi & Dashboard',
          subtitle: 'Biznesingizning jonli ko‘rsatkichlari, tushum va qoldiqlar',
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
          title: 'Savdolar Tarixi & Nasiyalar',
          subtitle: 'Cheklar, bekor qilishlar, kontragent qarzlari va B2B fakturalar',
        };
      case '/shifts':
        return {
          title: 'Kassa Smenalari & Z-Hisobotlar',
          subtitle: 'Chiqim va kirimlar, smena yopish jurnali',
        };
      case '/branches':
        return {
          title: 'Filiallar Boshqaruvi',
          subtitle: 'Do‘konning barcha filiallari, manzillari va savdo nuqtalari',
        };
      case '/tenants':
        return {
          title: 'Do‘konlar (Tenants) Boshqaruvi',
          subtitle: 'SaaS platformasidagi barcha do‘konlar va ularning faolligi',
        };
      case '/employees':
        return {
          title: 'Xodimlar & Jamoa Boshqaruvi',
          subtitle: 'Do‘kon xodimlari, lavozimlar, ishga olish va bo‘shatish',
        };
      case '/services':
        return {
          title: 'Xizmatlar & Sozlamalar',
          subtitle: 'Valyuta kursi, Telegram guruhlar, kassa cheki va hisobotlar avtomatizatsiyasi',
        };
      case '/audit':
        return {
          title: 'O‘zgarmas Audit Jurnali',
          subtitle: 'Barcha ma’muriy va moliyaviy amallar xavfsizlik nazorati',
        };
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
      default:
        return { title: 'Inventra', subtitle: '' };
    }
  };

  const { title, subtitle } = getPageInfo();

  useEffect(() => {
    if (shiftModalOpen && !isAdmin) {
      cashboxApi.getCurrentShift(activeBranch?.id)
        .then((data) => setShiftData(data))
        .catch(() => setShiftData(null));
    }
  }, [shiftModalOpen, isAdmin, activeBranch?.id]);

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
        branch_id: activeBranch?.id,
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
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Collapsible Sidebar */}
      <Sidebar
        onOpenNotifications={() => setNotifModalOpen(true)}
        unreadCount={unreadCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenShiftModal={() => setShiftModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
          <div className="animate-fade-in" key={location.pathname}>
            <Outlet />
          </div>
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
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="Masalan: 1200000"
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
              <input
                type="number"
                step="0.01"
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
                background: hasDiff ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: hasDiff ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                border: `1px solid ${hasDiff ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
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
                    color: 'var(--accent-rose, #ef4444)',
                  }}
                  title="Barcha xabarnomalarni tozalash"
                >
                  <Trash2 size={13} />
                  <span>Barchasini tozalash</span>
                </button>
              )}
            </div>
          </div>

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
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
}
