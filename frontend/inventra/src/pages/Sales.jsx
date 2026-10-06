import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ban,
  AlertTriangle,
  Receipt,
  UserPlus,
  CreditCard,
  History,
  CheckCircle,
  XCircle,
  Search,
  Printer,
  ChevronRight,
  DollarSign,
  Building,
  RotateCcw,
  Calendar,
  Filter,
  CalendarDays,
  X,
} from 'lucide-react';
import { salesApi } from '../api/client';
import Modal from '../components/common/Modal';
import InventraLogo from '../components/common/InventraLogo';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { usePersistedState } from '../hooks/usePersistedState';

const DEFAULT_SALES_FILTERS = {
  search: '',
  datePreset: 'all', // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  startDate: '',
  endDate: '',
  paymentMethod: 'all', // 'all' | 'cash' | 'card' | 'debt'
  status: 'all', // 'all' | 'completed' | 'partially_voided' | 'voided'
};

export default function Sales() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'counterparties' | 'b2b'
  const [salesList, setSalesList] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [b2bList, setB2BList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesFilters, setSalesFilters, resetSalesFilters] = usePersistedState(
    'inventra_sales_filters_v2',
    DEFAULT_SALES_FILTERS
  );

  // Sale Detail & Receipt Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Void Sale Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);

  // Void Item Modal
  const [voidItemModalOpen, setVoidItemModalOpen] = useState(false);
  const [selectedItemToVoid, setSelectedItemToVoid] = useState(null);
  const [voidItemQuantity, setVoidItemQuantity] = useState('1');
  const [voidItemReason, setVoidItemReason] = useState('');
  const [submittingItemVoid, setSubmittingItemVoid] = useState(false);

  // Counterparty Modals
  const [newCpModalOpen, setNewCpModalOpen] = useState(false);
  const [cpName, setCpName] = useState('');
  const [cpPhone, setCpPhone] = useState('');
  const [cpNote, setCpNote] = useState('');
  const [submittingCp, setSubmittingCp] = useState(false);

  // Debt Payment Modal
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [selectedCp, setSelectedCp] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('UZS');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Debt Payments History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [cpPaymentsHistory, setCpPaymentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // B2B Reject Modal
  const [b2bRejectModalOpen, setB2BRejectModalOpen] = useState(false);
  const [selectedB2BSaleId, setSelectedB2BSaleId] = useState(null);
  const [b2bRejectReason, setB2BRejectReason] = useState('');
  const [submittingB2BReject, setSubmittingB2BReject] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await salesApi.getSales();
        const list = res.results || res;
        setSalesList(Array.isArray(list) ? list : []);
      } else if (activeTab === 'counterparties') {
        const res = await salesApi.getCounterparties();
        const list = res.results || res;
        setCounterparties(Array.isArray(list) ? list : []);
      } else if (activeTab === 'b2b') {
        const res = await salesApi.getB2BInbox();
        const list = res.results || res;
        setB2BList(Array.isArray(list) ? list : []);
      }
    } catch {
      toast.error('Ma’lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Sale Detail
  const handleOpenDetail = async (sale) => {
    setSelectedSaleDetail(null);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await salesApi.getSaleDetail(sale.id);
      setSelectedSaleDetail(detail);
    } catch (err) {
      toast.error('Chek tafsilotlarini yuklab bo‘lmadi');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Void entire sale
  const handleOpenVoid = (saleId) => {
    setSelectedSaleId(saleId);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      toast.warning('Chekni bekor qilish sababini kiriting');
      return;
    }
    setSubmittingVoid(true);
    try {
      await salesApi.voidSale(selectedSaleId, voidReason);
      toast.success('Chek butunlay bekor qilindi!');
      setVoidModalOpen(false);
      if (detailModalOpen && selectedSaleDetail) {
        try {
          const updated = await salesApi.getSaleDetail(selectedSaleDetail.id);
          setSelectedSaleDetail(updated);
        } catch {
          setDetailModalOpen(false);
        }
      }
      loadData();
    } catch (err) {
      toast.error(err.message || 'Chekni bekor qilishda xatolik yuz berdi');
    } finally {
      setSubmittingVoid(false);
    }
  };

  // Void item in sale
  const handleOpenVoidItem = (item) => {
    setSelectedItemToVoid(item);
    setVoidItemQuantity(String(item.quantity - (item.voided_quantity || 0)));
    setVoidItemReason('');
    setVoidItemModalOpen(true);
  };

  const handleConfirmVoidItem = async (e) => {
    e.preventDefault();
    if (!voidItemReason.trim()) {
      toast.warning('Sababni ko‘rsating');
      return;
    }
    setSubmittingItemVoid(true);
    try {
      await salesApi.voidSaleItem(selectedItemToVoid.id, {
        quantity: parseFloat(voidItemQuantity),
        reason: voidItemReason,
      });
      toast.success('Pozitsiya bekor qilindi!');
      setVoidItemModalOpen(false);
      // Reload current detail
      if (selectedSaleDetail) {
        const updated = await salesApi.getSaleDetail(selectedSaleDetail.id);
        setSelectedSaleDetail(updated);
      }
      loadData();
    } catch (err) {
      toast.error(err.message || 'Pozitsiyani bekor qilishda xatolik');
    } finally {
      setSubmittingItemVoid(false);
    }
  };

  // Create Counterparty
  const handleCreateCounterparty = async (e) => {
    e.preventDefault();
    if (!cpName.trim() || !cpPhone.trim()) {
      toast.warning('Nomi va telefon raqamini kiriting');
      return;
    }
    setSubmittingCp(true);
    try {
      await salesApi.createCounterparty({
        name: cpName,
        phone_number: cpPhone,
        note: cpNote,
      });
      toast.success('Yangi mijoz/kontragent qo‘shildi!');
      setNewCpModalOpen(false);
      setCpName('');
      setCpPhone('');
      setCpNote('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Kontragent yaratishda xatolik');
    } finally {
      setSubmittingCp(false);
    }
  };

  // Record Debt Payment
  const handleOpenDebtPayment = (cp) => {
    setSelectedCp(cp);
    setPaymentAmount('');
    setPaymentCurrency('UZS');
    setPaymentNote('');
    setDebtModalOpen(true);
  };

  const handleConfirmDebtPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.warning('To‘lov summasini kiriting');
      return;
    }
    setSubmittingPayment(true);
    try {
      await salesApi.recordDebtPayment(selectedCp.id, {
        amount: parseFloat(paymentAmount),
        currency: paymentCurrency,
        note: paymentNote,
      });
      toast.success('Qarz to‘lovi muvaffaqiyatli qabul qilindi!');
      setDebtModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'To‘lovni qabul qilishda xatolik');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Debt History
  const handleOpenDebtHistory = async (cp) => {
    setSelectedCp(cp);
    setCpPaymentsHistory([]);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await salesApi.getCounterpartyPayments(cp.id);
      const list = res.results || res;
      setCpPaymentsHistory(Array.isArray(list) ? list : []);
    } catch {
      toast.error('To‘lovlar tarixini yuklab bo‘lmadi');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Accept B2B
  const handleAcceptB2B = async (sale) => {
    const isConfirmed = await confirm({
      title: 'B2B partiyani qabul qilish',
      message: `Haqiqatan ham #${sale.receipt_number || sale.id} raqamli B2B partiyasini omborga qabul qilasizmi? Barcha tovarlar ombor qoldig‘iga kiritiladi.`,
      confirmText: 'Omborga qabul qilish',
      cancelText: 'Bekor qilish',
      type: 'info',
    });
    if (!isConfirmed) {
      return;
    }
    try {
      // Build items payload for accept
      const itemsPayload = {
        items: (sale.items || []).map((it) => ({
          sale_item_id: it.id,
          accepted_quantity: parseFloat(it.quantity),
        })),
      };
      await salesApi.acceptB2B(sale.id, itemsPayload);
      toast.success('B2B tovarlar qabul qilindi va omborga joylandi!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'B2B qabul qilishda xatolik');
    }
  };

  // Reject B2B
  const handleOpenRejectB2B = (saleId) => {
    setSelectedB2BSaleId(saleId);
    setB2BRejectReason('');
    setB2BRejectModalOpen(true);
  };

  const handleConfirmRejectB2B = async (e) => {
    e.preventDefault();
    if (!b2bRejectReason.trim()) {
      toast.warning('Rad etish sababini kiriting');
      return;
    }
    setSubmittingB2BReject(true);
    try {
      await salesApi.rejectB2B(selectedB2BSaleId, b2bRejectReason);
      toast.success('B2B transfer rad etildi');
      setB2BRejectModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Rad etishda xatolik');
    } finally {
      setSubmittingB2BReject(false);
    }
  };

  const filteredSales = useMemo(() => {
    return salesList.filter((s) => {
      // 1. Search query (Chek ID, mijoz, sotuvchi)
      const q = (salesFilters.search || '').trim().toLowerCase();
      if (q) {
        const rNum = String(s.receipt_number || s.id || '').toLowerCase();
        const cp = (s.counterparty_name || '').toLowerCase();
        const seller = (s.sold_by_name || '').toLowerCase();
        if (!rNum.includes(q) && !cp.includes(q) && !seller.includes(q)) {
          return false;
        }
      }

      // 2. Payment method
      if (salesFilters.paymentMethod && salesFilters.paymentMethod !== 'all') {
        const pType = (s.payment_type || s.payment_method || '').toLowerCase();
        if (pType !== salesFilters.paymentMethod.toLowerCase()) {
          return false;
        }
      }

      // 3. Status filter
      if (salesFilters.status && salesFilters.status !== 'all') {
        const st = (s.status || '').toLowerCase();
        if (st !== salesFilters.status.toLowerCase()) {
          return false;
        }
      }

      // 4. Date filter
      if (s.created_at) {
        const sDate = new Date(s.created_at);
        const y = sDate.getFullYear();
        const m = String(sDate.getMonth() + 1).padStart(2, '0');
        const d = String(sDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        if (salesFilters.datePreset === 'today') {
          if (dateKey !== todayKey) return false;
        } else if (salesFilters.datePreset === 'yesterday') {
          if (dateKey !== yesterdayKey) return false;
        } else if (salesFilters.datePreset === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (sDate < weekAgo) return false;
        } else if (salesFilters.datePreset === 'month') {
          if (sDate.getMonth() !== now.getMonth() || sDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (salesFilters.datePreset === 'custom') {
          if (salesFilters.startDate && dateKey < salesFilters.startDate) return false;
          if (salesFilters.endDate && dateKey > salesFilters.endDate) return false;
        }
      }

      return true;
    });
  }, [salesList, salesFilters]);

  // Uzbek date formatter for day headers
  const formatUzbekDateHeader = (dateStr) => {
    if (!dateStr || dateStr === 'Noma’lum sana') {
      return { title: 'Noma’lum sana', isToday: false, isYesterday: false };
    }
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const monthsUz = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    const daysUz = [
      'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'
    ];

    const monthName = monthsUz[dateObj.getMonth()];
    const dayName = daysUz[dateObj.getDay()];
    const dayNum = parseInt(d, 10);

    if (dateStr === todayKey) {
      return { title: `Bugun — ${dayNum}-${monthName}, ${y}`, isToday: true, isYesterday: false, dayName };
    }
    if (dateStr === yesterdayKey) {
      return { title: `Kecha — ${dayNum}-${monthName}, ${y}`, isToday: false, isYesterday: true, dayName };
    }
    return { title: `${dayNum}-${monthName}, ${y} (${dayName})`, isToday: false, isYesterday: false, dayName };
  };

  // Group filtered sales by local date
  const sortedDayGroups = useMemo(() => {
    const groups = filteredSales.reduce((acc, sale) => {
      let dateKey = 'Noma’lum sana';
      if (sale.created_at) {
        const d = new Date(sale.created_at);
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          sales: [],
          totalUzs: 0,
          totalUsd: 0,
          voidedCount: 0,
          activeCount: 0,
        };
      }

      acc[dateKey].sales.push(sale);
      const isVoided = (sale.status || '').toLowerCase() === 'voided';
      const amount = Number(sale.total_amount || sale.total_price_uzs || 0);
      const currency = (sale.currency || 'UZS').toUpperCase();

      if (isVoided) {
        acc[dateKey].voidedCount += 1;
      } else {
        acc[dateKey].activeCount += 1;
        if (currency === 'USD') {
          acc[dateKey].totalUsd += amount;
        } else {
          acc[dateKey].totalUzs += amount;
        }
      }

      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredSales]);

  const hasActiveSalesFilters =
    Boolean(salesFilters.search) ||
    salesFilters.datePreset !== 'all' ||
    salesFilters.paymentMethod !== 'all' ||
    salesFilters.status !== 'all' ||
    Boolean(salesFilters.startDate) ||
    Boolean(salesFilters.endDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Controls: Tabs & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('sales')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'sales' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'sales' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Sotuv Cheklari
          </button>
          <button
            onClick={() => setActiveTab('counterparties')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'counterparties' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'counterparties' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Mijozlar & Nasiyalar
          </button>
          <button
            onClick={() => setActiveTab('b2b')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'b2b' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'b2b' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>B2B Kiruvchi</span>
            {b2bList.length > 0 && (
              <span style={{ padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--accent-rose)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                {b2bList.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab specific top actions */}
        {activeTab === 'counterparties' && (
          <button
            onClick={() => setNewCpModalOpen(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--primary-glow)',
            }}
          >
            <UserPlus size={16} />
            <span>+ Yangi Mijoz / Kontragent</span>
          </button>
        )}
      </div>

      {/* Filter toolbar for sales */}
      {activeTab === 'sales' && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'var(--bg-card)',
          }}
        >
          {/* Row 1: Search, Payment Method, Status */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Chek ID, mijoz yoki kassir bo‘yicha izlash..."
                value={salesFilters.search}
                onChange={(e) => setSalesFilters({ ...salesFilters, search: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To‘lov turi:</span>
              <select
                value={salesFilters.paymentMethod}
                onChange={(e) => setSalesFilters({ ...salesFilters, paymentMethod: e.target.value })}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Barcha to‘lovlar</option>
                <option value="cash">Naqd pul (CASH)</option>
                <option value="card">Plastik karta (CARD)</option>
                <option value="debt">Nasiya / Qarz (DEBT)</option>
              </select>
            </div>

            {/* Status Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Holati:</span>
              <select
                value={salesFilters.status}
                onChange={(e) => setSalesFilters({ ...salesFilters, status: e.target.value })}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Barcha holatlar</option>
                <option value="completed">Bajarildi</option>
                <option value="partially_voided">Qisman bekor qilingan</option>
                <option value="voided">Bekor qilingan</option>
              </select>
            </div>

            {/* Reset button */}
            {hasActiveSalesFilters && (
              <button
                type="button"
                onClick={resetSalesFilters}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--accent-rose)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw size={12} />
                <span>Filtrni tozalash</span>
              </button>
            )}
          </div>

          {/* Row 2: Date Presets & Custom Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
              <CalendarDays size={15} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sana:</span>
            </div>

            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'today', label: 'Bugun' },
              { id: 'yesterday', label: 'Kecha' },
              { id: 'week', label: 'Oxirgi 7 kun' },
              { id: 'month', label: 'Shu oy' },
              { id: 'custom', label: 'Oraliq sana...' },
            ].map((preset) => {
              const isSelected = salesFilters.datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSalesFilters({ ...salesFilters, datePreset: preset.id })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-card)',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-app)',
                    color: isSelected ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}

            {/* If Custom Date Selected */}
            {salesFilters.datePreset === 'custom' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                <input
                  type="date"
                  value={salesFilters.startDate}
                  onChange={(e) => setSalesFilters({ ...salesFilters, startDate: e.target.value })}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                <input
                  type="date"
                  value={salesFilters.endDate}
                  onChange={(e) => setSalesFilters({ ...salesFilters, endDate: e.target.value })}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Topildi: <strong style={{ color: 'var(--text-primary)' }}>{filteredSales.length}</strong> ta sotuv ({sortedDayGroups.length} kun)
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Sales List Grouped by Day */}
      {activeTab === 'sales' && (
        <div>
          {loading ? (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Sotuvlar yuklanmoqda...
            </div>
          ) : sortedDayGroups.length > 0 ? (
            sortedDayGroups.map((group) => {
              const headerInfo = formatUzbekDateHeader(group.dateKey);
              return (
                <div
                  key={group.dateKey}
                  className="glass-card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    marginBottom: 20,
                    border: headerInfo.isToday ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-card)',
                  }}
                >
                  {/* Day Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '14px 20px',
                      background: headerInfo.isToday
                        ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.03) 100%)'
                        : 'var(--bg-card)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={18} style={{ color: headerInfo.isToday ? 'var(--primary)' : 'var(--text-secondary)' }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {headerInfo.title}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {group.sales.length} ta chek
                      </span>
                    </div>

                    {/* Day Totals */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {group.totalUzs > 0 && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(34, 197, 94, 0.12)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            color: 'var(--accent-emerald)',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Jami: {group.totalUzs.toLocaleString()} UZS
                        </span>
                      )}
                      {group.totalUsd > 0 && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#60a5fa',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          ${group.totalUsd.toLocaleString()} USD
                        </span>
                      )}
                      {group.voidedCount > 0 && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: 'var(--accent-rose)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {group.voidedCount} ta bekor qilingan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Sales Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 20px' }}>Chek ID</th>
                        <th style={{ padding: '12px 16px' }}>To‘lov Usuli</th>
                        <th style={{ padding: '12px 16px' }}>Jami Summa</th>
                        <th style={{ padding: '12px 16px' }}>Mijoz</th>
                        <th style={{ padding: '12px 16px' }}>Sotuvchi</th>
                        <th style={{ padding: '12px 16px' }}>Holat</th>
                        <th style={{ padding: '12px 16px' }}>Vaqt</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.sales.map((s) => {
                        const statusLower = (s.status || '').toLowerCase();
                        const isCompleted = statusLower === 'completed';
                        const isPartiallyVoided = statusLower === 'partially_voided';
                        const isVoided = statusLower === 'voided';
                        const canVoid = isCompleted || isPartiallyVoided;
                        const timeStr = s.created_at ? new Date(s.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              #{s.receipt_number || s.id}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                              <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{s.payment_type || s.payment_method || 'Naqd'}</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: isVoided ? 'var(--text-muted)' : 'var(--primary)' }}>
                              {Number(s.total_amount || s.total_price_uzs || 0).toLocaleString()} {s.currency || 'UZS'}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{s.counterparty_name || 'Oddiy xaridor'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{s.sold_by_name || 'Kassir'}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isCompleted ? 'rgba(34, 197, 94, 0.12)' : isPartiallyVoided ? 'rgba(245, 158, 11, 0.12)' : isVoided ? 'rgba(239, 68, 68, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                  color: isCompleted ? 'var(--accent-emerald)' : isPartiallyVoided ? 'var(--accent-amber)' : isVoided ? 'var(--accent-rose)' : 'var(--text-secondary)',
                                }}
                              >
                                {isCompleted ? 'Bajarildi' : isPartiallyVoided ? 'Qisman bekor' : isVoided ? 'Bekor qilingan' : s.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                              {timeStr}
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(s)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--border-card)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Receipt size={13} />
                                  <span>Chek</span>
                                </button>

                                {canVoid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVoid(s.id)}
                                    title="Chekni butunlay bekor qilish"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: 'var(--accent-rose)',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Ban size={12} />
                                    <span>Bekor qilish</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 15, marginBottom: 10 }}>Tanlangan filtrlar bo‘yicha sotuvlar topilmadi</p>
              {hasActiveSalesFilters && (
                <button
                  type="button"
                  onClick={resetSalesFilters}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Counterparties List */}
      {activeTab === 'counterparties' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px' }}>Mijoz / Hamkor Nomi</th>
                <th style={{ padding: '14px 16px' }}>Telefon Raqami</th>
                <th style={{ padding: '14px 16px' }}>B2B Do‘kon Bog‘lanmasi</th>
                <th style={{ padding: '14px 16px' }}>Nasiya Qarz (UZS)</th>
                <th style={{ padding: '14px 16px' }}>Nasiya Qarz (USD)</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : counterparties.length > 0 ? (
                counterparties.map((cp) => {
                  const debtUzs = Number(cp.debt_balance_uzs || 0);
                  const debtUsd = Number(cp.debt_balance_usd || 0);
                  const hasDebt = debtUzs > 0 || debtUsd > 0;
                  return (
                    <tr key={cp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{cp.name}</div>
                        {cp.note && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cp.note}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {cp.phone_number || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {cp.target_tenant_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                            <Building size={12} /> {cp.target_tenant_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: debtUzs > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                        {debtUzs.toLocaleString()} UZS
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: debtUsd > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                        ${debtUsd.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleOpenDebtPayment(cp)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-xs)',
                              border: 'none',
                              background: 'var(--primary)',
                              color: 'var(--primary-foreground)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <CreditCard size={13} />
                            <span>Qarz To‘lash</span>
                          </button>
                          <button
                            onClick={() => handleOpenDebtHistory(cp)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border-card)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <History size={13} />
                            <span>Tarix</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Mijozlar topilmadi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: B2B Inbox */}
      {activeTab === 'b2b' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px' }}>Faktura #</th>
                <th style={{ padding: '14px 16px' }}>Yuboruvchi Do‘kon</th>
                <th style={{ padding: '14px 16px' }}>Tovarlar Soni</th>
                <th style={{ padding: '14px 16px' }}>Jami Qiymat</th>
                <th style={{ padding: '14px 16px' }}>Kelgan Sana</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Qaror</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : b2bList.length > 0 ? (
                b2bList.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      #{b.receipt_number || b.id}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {b.tenant_name || b.counterparty_name || 'B2B Hamkor'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {(b.items || []).length} xil pozitsiya
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {Number(b.total_amount || 0).toLocaleString()} {b.currency || 'UZS'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(b.created_at).toLocaleString('uz-UZ')}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handleAcceptB2B(b)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-xs)',
                            border: 'none',
                            background: 'var(--accent-emerald)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircle size={13} />
                          <span>Qabul Qilish</span>
                        </button>
                        <button
                          onClick={() => handleOpenRejectB2B(b.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-rose)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <XCircle size={13} />
                          <span>Rad Etish</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    B2B yangi kiruvchi fakturalar mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Sale Detail / Printable Receipt */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Sotuv Cheki Tafsilotlari">
        {loadingDetail ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : selectedSaleDetail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Printable Receipt Layout */}
            <div
              id="printable-receipt"
              style={{
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-card)',
                fontSize: 13,
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <InventraLogo size={28} showBadge={false} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  SAVDO KVITANSIYASI
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  Chek #{selectedSaleDetail.receipt_number || selectedSaleDetail.id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(selectedSaleDetail.created_at).toLocaleString('uz-UZ')}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Kassir:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedSaleDetail.sold_by_name || 'Kassir'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>To‘lov turi:</span> <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{selectedSaleDetail.payment_type || 'Naqd'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Mijoz:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedSaleDetail.counterparty_name || 'Oddiy mijoz'}</strong></div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Holat:</span>{' '}
                  <strong
                    style={{
                      color:
                        (selectedSaleDetail.status || '').toLowerCase() === 'completed'
                          ? 'var(--accent-emerald)'
                          : (selectedSaleDetail.status || '').toLowerCase() === 'partially_voided'
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)',
                    }}
                  >
                    {(selectedSaleDetail.status || '').toLowerCase() === 'completed'
                      ? 'Bajarildi'
                      : (selectedSaleDetail.status || '').toLowerCase() === 'partially_voided'
                      ? 'Qisman bekor qilingan'
                      : (selectedSaleDetail.status || '').toLowerCase() === 'voided'
                      ? 'Bekor qilingan'
                      : selectedSaleDetail.status}
                  </strong>
                </div>
              </div>

              {/* Items in receipt */}
              {(() => {
                const canVoidReceipt = ['completed', 'partially_voided'].includes(
                  (selectedSaleDetail.status || '').toLowerCase()
                );
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 0' }}>Tovar</th>
                        <th style={{ padding: '6px 0', textAlign: 'center' }}>Soni</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>Narxi</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>Jami</th>
                        {canVoidReceipt && <th style={{ padding: '6px 0', textAlign: 'right' }}>Amal</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSaleDetail.items || []).map((it) => {
                        const itStatus = (it.status || '').toLowerCase();
                        const isVoided = itStatus === 'voided' || (it.voided_quantity && it.voided_quantity >= it.quantity);
                        const isPartiallyVoided = itStatus === 'partially_voided' || (it.voided_quantity > 0 && it.voided_quantity < it.quantity);
                        const canVoidItem = canVoidReceipt && !isVoided;

                        return (
                          <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: isVoided ? 0.45 : 1 }}>
                            <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>
                              <div>{it.product_name || 'Tovar'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.product_variant_name}</div>
                              {isVoided && <span style={{ fontSize: 10, color: 'var(--accent-rose)', fontWeight: 700 }}>(TO‘LIQ BEKOR QILINGAN)</span>}
                              {isPartiallyVoided && <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 600 }}>({it.voided_quantity} ta qaytarilgan)</span>}
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'center', color: 'var(--text-primary)' }}>{it.quantity}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-secondary)' }}>{Number(it.unit_price).toLocaleString()}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(it.total_price).toLocaleString()}</td>
                            {canVoidReceipt && (
                              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                {canVoidItem && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVoidItem(it)}
                                    title="Faqat ushbu tovarni yoki uning bir qismini bekor qilish"
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: 'var(--accent-rose)',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Bekor qilish
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>JAMI SUMMA:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                  {Number(selectedSaleDetail.total_amount || 0).toLocaleString()} {selectedSaleDetail.currency || 'UZS'}
                </span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Printer size={15} />
                <span>Chop etish</span>
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {['completed', 'partially_voided'].includes((selectedSaleDetail.status || '').toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleOpenVoid(selectedSaleDetail.id)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--accent-rose)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Butun Chekni Bekor Qilish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal 2: Void Entire Sale */}
      <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title={`Chekni Bekor Qilish (#${selectedSaleId})`}>
        <form onSubmit={handleConfirmVoid} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-rose)', fontSize: 13 }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>Diqqat: Chek bekor qilinganda tovarlar omborga qaytariladi va bu amal o‘zgarmas Audit jurnalida qayd etiladi.</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Bekor qilish sababi (majburiy)
            </label>
            <textarea
              rows={3}
              placeholder="Masalan: Xaridor tovardan voz kechdi yoki kassa xatosi..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setVoidModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={submittingVoid}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: '#fff', fontWeight: 600, cursor: submittingVoid ? 'not-allowed' : 'pointer' }}
            >
              {submittingVoid ? 'Bekor qilinmoqda...' : 'Chekni Bekor Qilish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Void Item */}
      <Modal isOpen={voidItemModalOpen} onClose={() => setVoidItemModalOpen(false)} title="Chekdagi Pozitsiyani Bekor Qilish">
        <form onSubmit={handleConfirmVoidItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedItemToVoid && (() => {
            const availableQty = selectedItemToVoid.quantity - (selectedItemToVoid.voided_quantity || 0);
            return (
              <div style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-xs)', fontSize: 13, border: '1px solid var(--border-subtle)' }}>
                <div><strong>Tovar:</strong> {selectedItemToVoid.product_name} ({selectedItemToVoid.product_variant_name})</div>
                <div style={{ marginTop: 4 }}>
                  <strong>Jami sotilgan:</strong> {selectedItemToVoid.quantity} dona
                  {Boolean(selectedItemToVoid.voided_quantity) && (
                    <span style={{ color: 'var(--accent-amber)', marginLeft: 8 }}>
                      (Oldin bekor qilingan: {selectedItemToVoid.voided_quantity} dona)
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4, color: 'var(--primary)', fontWeight: 600 }}>
                  Qaytarish mumkin: {availableQty} dona
                </div>
              </div>
            );
          })()}

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Bekor qilinadigan miqdor *
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              max={selectedItemToVoid ? selectedItemToVoid.quantity - (selectedItemToVoid.voided_quantity || 0) : undefined}
              value={voidItemQuantity}
              onChange={(e) => setVoidItemQuantity(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Bekor qilish sababi *
            </label>
            <input
              type="text"
              placeholder="Masalan: Xaridor shu mahsulotni olmadi"
              value={voidItemReason}
              onChange={(e) => setVoidItemReason(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setVoidItemModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={submittingItemVoid}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingItemVoid ? 'Bekor qilinmoqda...' : 'Pozitsiyani Bekor Qilish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Create Counterparty */}
      <Modal isOpen={newCpModalOpen} onClose={() => setNewCpModalOpen(false)} title="Yangi Mijoz / Kontragent Qo‘shish">
        <form onSubmit={handleCreateCounterparty} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Mijoz / Tashkilot Nomi *
            </label>
            <input
              id="cp-name"
              name="organization"
              autoComplete="organization"
              type="text"
              placeholder="Masalan: Sardor Rahimov yoki 'Mega Trade' MCHJ"
              value={cpName}
              onChange={(e) => setCpName(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Telefon Raqami *
            </label>
            <input
              id="cp-phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+998901234567"
              value={cpPhone}
              onChange={(e) => setCpPhone(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Qo‘shimcha Izoh
            </label>
            <input
              type="text"
              placeholder="Masalan: Doimiy ulgurji mijoz"
              value={cpNote}
              onChange={(e) => setCpNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setNewCpModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingCp}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
            >
              {submittingCp ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Record Debt Payment */}
      <Modal isOpen={debtModalOpen} onClose={() => setDebtModalOpen(false)} title={`Qarz To‘lovini Qabul Qilish (${selectedCp?.name})`}>
        <form onSubmit={handleConfirmDebtPayment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                To‘lov Summasi *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Masalan: 500000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Valyuta *
              </label>
              <select
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              >
                <option value="UZS">UZS (So‘m)</option>
                <option value="USD">USD (Dollar)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Izoh / Kassa kvitansiyasi
            </label>
            <input
              type="text"
              placeholder="Masalan: Kassa orqali naqd berildi"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setDebtModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingPayment}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
            >
              {submittingPayment ? 'Qabul qilinmoqda...' : 'To‘lovni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Debt Payment History */}
      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`To‘lovlar Tarixi — ${selectedCp?.name}`} maxWidth={620}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loadingHistory ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
          ) : cpPaymentsHistory.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Sana</th>
                    <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Qabul qildi</th>
                    <th style={{ padding: '10px 14px' }}>Izoh</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {cpPaymentsHistory.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(p.paid_at).toLocaleString('uz-UZ')}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {p.recorded_by_name || 'Kassir'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)', whiteSpace: 'nowrap' }}>
                        +{Number(p.amount).toLocaleString()} {p.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>To‘lovlar tarixi mavjud emas</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(false)}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Yopish
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 7: Reject B2B Transfer */}
      <Modal isOpen={b2bRejectModalOpen} onClose={() => setB2BRejectModalOpen(false)} title="B2B Fakturasini Rad Etish">
        <form onSubmit={handleConfirmRejectB2B} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Rad etish sababi (majburiy) *
            </label>
            <textarea
              rows={3}
              placeholder="Masalan: Tovar nomenklaturasi xato yuborilgan yoki narx to‘g‘ri kelmadi..."
              value={b2bRejectReason}
              onChange={(e) => setB2BRejectReason(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setB2BRejectModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={submittingB2BReject}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingB2BReject ? 'Rad etilmoqda...' : 'Rad Etishni Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
