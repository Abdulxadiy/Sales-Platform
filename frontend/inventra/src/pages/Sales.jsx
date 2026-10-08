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
  ShoppingBag,
  User,
  Package,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react';
import { salesApi } from '../api/client';
import Modal from '../components/common/Modal';
import ReceiptSlip, { printReceiptSlip } from '../components/common/ReceiptSlip';
import InvoiceA4Modal, { printInvoiceA4 } from '../components/common/InvoiceA4Modal';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
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
  const [counterpartyFilter, setCounterpartyFilter] = useState('all'); // 'all' | 'debtors'
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
  const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState('inventra_receipt_paper_width', '58mm');

  // A4 Invoice Modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceSale, setSelectedInvoiceSale] = useState(null);

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

  // Refund / Settle Customer Credit Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundCurrency, setRefundCurrency] = useState('UZS');
  const [refundNote, setRefundNote] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Debt Payments History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [cpPaymentsHistory, setCpPaymentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Counterparty Purchases & Debts Detail Modal
  const [cpDetailModalOpen, setCpDetailModalOpen] = useState(false);
  const [selectedCpDetail, setSelectedCpDetail] = useState(null);
  const [cpSalesData, setCpSalesData] = useState([]);
  const [cpSalesSummary, setCpSalesSummary] = useState({ total_sales_count: 0, debt_sales_count: 0 });
  const [loadingCpSales, setLoadingCpSales] = useState(false);
  const [cpDetailTab, setCpDetailTab] = useState('debt_sales'); // 'debt_sales' | 'all_sales' | 'payments'
  const [cpPurchasesSearch, setCpPurchasesSearch] = useState('');
  const [counterpartySearch, setCounterpartySearch] = useState('');
  const [cpDetailPayments, setCpDetailPayments] = useState([]);
  const [loadingCpDetailPayments, setLoadingCpDetailPayments] = useState(false);

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

  // Open A4 Invoice Modal
  const handleOpenInvoice = async (sale) => {
    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
      setSelectedInvoiceSale(sale);
      setInvoiceModalOpen(true);
      return;
    }
    try {
      const detail = await salesApi.getSaleDetail(sale.id);
      setSelectedInvoiceSale(detail);
      setInvoiceModalOpen(true);
    } catch (err) {
      toast.error('Faktura ma’lumotlarini yuklab bo‘lmadi');
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
      if (cpDetailModalOpen && selectedCpDetail && selectedCpDetail.id === selectedCp.id) {
        handleOpenCounterpartyPurchases(selectedCp, cpDetailTab);
      }
    } catch (err) {
      toast.error(err.message || 'To‘lovni qabul qilishda xatolik');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Refund / Settle Customer Credit (Bizda haqqi bor mijozga pulini qaytarish)
  const handleOpenRefundCredit = (cp) => {
    setSelectedCp(cp);
    const creditUzs = Math.max(0, -Number(cp.debt_balance_uzs || 0));
    const creditUsd = Math.max(0, -Number(cp.debt_balance_usd || 0));
    if (creditUzs > 0) {
      setRefundAmount(creditUzs.toString());
      setRefundCurrency('UZS');
    } else if (creditUsd > 0) {
      setRefundAmount(creditUsd.toString());
      setRefundCurrency('USD');
    } else {
      setRefundAmount('');
      setRefundCurrency('UZS');
    }
    setRefundNote('Mijozga ortiqcha to‘langan haq qaytarildi');
    setRefundModalOpen(true);
  };

  const handleConfirmRefundCredit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) {
      toast.warning('Qaytariladigan summani kiriting');
      return;
    }
    setSubmittingRefund(true);
    try {
      // In DebtService: when is_correction=True, amount is subtracted from debt_balance.
      // Customer has negative balance (-35,000). Returning 35,000 to customer increases balance to 0.
      // So amount sent is -amt: -(-amt) = +amt.
      await salesApi.correctDebtPayment(selectedCp.id, {
        amount: -amt,
        currency: refundCurrency,
        note: refundNote || 'Mijozga ortiqcha to‘langan haq qaytarildi',
      });
      toast.success('Mijoz haqqi muvaffaqiyatli qaytarildi! Balans tozalndi.');
      setRefundModalOpen(false);
      loadData();
      if (cpDetailModalOpen && selectedCpDetail && selectedCpDetail.id === selectedCp.id) {
        setSelectedCpDetail((prev) => {
          if (!prev) return prev;
          if (refundCurrency === 'UZS') {
            return { ...prev, debt_balance_uzs: Number(prev.debt_balance_uzs || 0) + amt };
          } else {
            return { ...prev, debt_balance_usd: Number(prev.debt_balance_usd || 0) + amt };
          }
        });
        handleOpenCounterpartyPurchases(selectedCp, cpDetailTab);
      }
    } catch (err) {
      toast.error(err.message || 'Mijoz haqqini qaytarishda xatolik');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Open Counterparty Purchases & Debts Detail Modal
  const handleOpenCounterpartyPurchases = async (cp, initialTab = 'debt_sales') => {
    setSelectedCpDetail(cp);
    setCpDetailTab(initialTab);
    setCpPurchasesSearch('');
    setCpDetailModalOpen(true);
    setLoadingCpSales(true);
    setLoadingCpDetailPayments(true);
    try {
      const [salesRes, paymentsRes] = await Promise.all([
        salesApi.getCounterpartySales(cp.id),
        salesApi.getCounterpartyPayments(cp.id),
      ]);
      setCpSalesData(salesRes.sales || []);
      setCpSalesSummary({
        total_sales_count: salesRes.total_sales_count || 0,
        debt_sales_count: salesRes.debt_sales_count || 0,
      });
      if (salesRes.counterparty) {
        setSelectedCpDetail(salesRes.counterparty);
      }
      const payList = paymentsRes.results || paymentsRes;
      setCpDetailPayments(Array.isArray(payList) ? payList : []);
    } catch {
      toast.error('Mijoz xaridlari ma‘lumotlarini yuklab bo‘lmadi');
    } finally {
      setLoadingCpSales(false);
      setLoadingCpDetailPayments(false);
    }
  };

  // Open Debt History (redirects to the unified detail modal's payments tab)
  const handleOpenDebtHistory = async (cp) => {
    handleOpenCounterpartyPurchases(cp, 'payments');
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

  const totalDebtBalanceUZS = useMemo(() => {
    return counterparties.reduce((sum, cp) => sum + Math.max(0, Number(cp.debt_balance_uzs || 0)), 0);
  }, [counterparties]);

  const totalDebtBalanceUSD = useMemo(() => {
    return counterparties.reduce((sum, cp) => sum + Math.max(0, Number(cp.debt_balance_usd || 0)), 0);
  }, [counterparties]);

  // Jami mijozlar haqqi (Do‘kondagi ortiqcha to‘lovlar / depozit)
  const totalCustomerCreditUZS = useMemo(() => {
    return counterparties.reduce((sum, cp) => sum + Math.max(0, -Number(cp.debt_balance_uzs || 0)), 0);
  }, [counterparties]);

  const totalCustomerCreditUSD = useMemo(() => {
    return counterparties.reduce((sum, cp) => sum + Math.max(0, -Number(cp.debt_balance_usd || 0)), 0);
  }, [counterparties]);

  const debtorCount = useMemo(() => {
    return counterparties.filter((cp) => Number(cp.debt_balance_uzs || 0) > 0 || Number(cp.debt_balance_usd || 0) > 0).length;
  }, [counterparties]);

  const creditorCount = useMemo(() => {
    return counterparties.filter((cp) => Number(cp.debt_balance_uzs || 0) < 0 || Number(cp.debt_balance_usd || 0) < 0).length;
  }, [counterparties]);

  const settledCount = useMemo(() => {
    return counterparties.filter((cp) => Number(cp.debt_balance_uzs || 0) === 0 && Number(cp.debt_balance_usd || 0) === 0).length;
  }, [counterparties]);

  const filteredCounterparties = useMemo(() => {
    let list = counterparties;
    if (counterpartyFilter === 'debtors') {
      list = list.filter((cp) => Number(cp.debt_balance_uzs || 0) > 0 || Number(cp.debt_balance_usd || 0) > 0);
    } else if (counterpartyFilter === 'creditors') {
      list = list.filter((cp) => Number(cp.debt_balance_uzs || 0) < 0 || Number(cp.debt_balance_usd || 0) < 0);
    } else if (counterpartyFilter === 'settled') {
      list = list.filter((cp) => Number(cp.debt_balance_uzs || 0) === 0 && Number(cp.debt_balance_usd || 0) === 0);
    }
    if (!counterpartySearch.trim()) return list;
    const q = counterpartySearch.toLowerCase().trim();
    return list.filter((cp) =>
      cp.name?.toLowerCase().includes(q) ||
      cp.phone_number?.toLowerCase().includes(q) ||
      cp.note?.toLowerCase().includes(q)
    );
  }, [counterparties, counterpartySearch, counterpartyFilter]);

  const filteredCpPurchases = useMemo(() => {
    if (!cpSalesData) return [];
    let list = cpSalesData;
    if (cpDetailTab === 'debt_sales') {
      list = list.filter((s) => s.payment_type === 'debt');
    }
    if (!cpPurchasesSearch.trim()) return list;
    const q = cpPurchasesSearch.toLowerCase().trim();
    return list.filter((sale) => {
      const matchesReceipt = String(sale.receipt_number || sale.id || '').toLowerCase().includes(q);
      const matchesCashier = String(sale.sold_by_name || '').toLowerCase().includes(q);
      const matchesItem = (sale.items || []).some((item) =>
        item.product_name?.toLowerCase().includes(q) ||
        item.product_variant_name?.toLowerCase().includes(q) ||
        item.product_code?.toLowerCase().includes(q) ||
        item.product_sku?.toLowerCase().includes(q)
      );
      return matchesReceipt || matchesCashier || matchesItem;
    });
  }, [cpSalesData, cpDetailTab, cpPurchasesSearch]);

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
              <CustomSelect
                value={salesFilters.paymentMethod}
                onChange={(val) => setSalesFilters({ ...salesFilters, paymentMethod: val })}
                options={[
                  { value: 'all', label: 'Barcha to‘lovlar' },
                  { value: 'cash', label: 'Naqd pul (CASH)' },
                  { value: 'card', label: 'Plastik karta (CARD)' },
                  { value: 'debt', label: 'Nasiya / Qarz (DEBT)' },
                ]}
                size="md"
                style={{ minWidth: 160 }}
              />
            </div>

            {/* Status Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Holati:</span>
              <CustomSelect
                value={salesFilters.status}
                onChange={(val) => setSalesFilters({ ...salesFilters, status: val })}
                options={[
                  { value: 'all', label: 'Barcha holatlar' },
                  { value: 'completed', label: 'Bajarildi' },
                  { value: 'partially_voided', label: 'Qisman bekor qilingan' },
                  { value: 'voided', label: 'Bekor qilingan' },
                ]}
                size="md"
                style={{ minWidth: 160 }}
              />
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
                <CustomDatePicker
                  value={salesFilters.startDate}
                  onChange={(val) => setSalesFilters({ ...salesFilters, startDate: val })}
                  placeholder="Boshlanish sanasi"
                  size="sm"
                  style={{ minWidth: 140 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                <CustomDatePicker
                  value={salesFilters.endDate}
                  onChange={(val) => setSalesFilters({ ...salesFilters, endDate: val })}
                  placeholder="Tugash sanasi"
                  size="sm"
                  style={{ minWidth: 140 }}
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
                  <div className="table-responsive">
                    <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          <th style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>Chek ID</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>To‘lov Usuli</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Jami Summa</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Mijoz</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Sotuvchi</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Holat</th>
                          <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Vaqt</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amallar</th>
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
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              #{s.receipt_number || s.id}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{s.payment_type || s.payment_method || 'Naqd'}</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: isVoided ? 'var(--text-muted)' : 'var(--primary)', whiteSpace: 'nowrap' }}>
                              {Number(s.total_amount || s.total_price_uzs || 0).toLocaleString()} {s.currency || 'UZS'}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.counterparty_name || 'Oddiy xaridor'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>{s.sold_by_name || 'Kassir'}</td>
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
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
                            <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {timeStr}
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
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

                                {((s.payment_type || '').toLowerCase() === 'debt' ||
                                  Boolean(s.is_partner_sale) ||
                                  Boolean(s.counterparty) ||
                                  Boolean(s.counterparty_name) ||
                                  Boolean(s.b2b_target_tenant)) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInvoice(s)}
                                    title="A4 formatida rasmiy Hisob-faktura / Yuk xati"
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
                                    <FileText size={13} style={{ color: 'var(--primary)' }} />
                                    <span>Faktura</span>
                                  </button>
                                )}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nasiya & Qarzdorlik Balansi Xulosasi (Debt Summary Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {/* Card 1: Jami Nasiya (UZS) */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Umumiy Nasiya Qarz (UZS)
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Barcha mijozlar so‘mdagi qarzi
                  </div>
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(245, 158, 11, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={17} color="#f59e0b" />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#f59e0b' }}>
                {Math.round(totalDebtBalanceUZS).toLocaleString('uz-UZ')} UZS
              </div>
            </div>

            {/* Card 2: Jami Nasiya (USD) */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Umumiy Nasiya Qarz (USD)
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Barcha mijozlar dollardagi qarzi
                  </div>
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(234, 88, 12, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={17} color="#ea580c" />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#ea580c' }}>
                ${totalDebtBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Card 3: Nasiyasi Bor Mijozlar */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Qarzdor Mijozlar Soni
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Faol qarzi bor shaxslar
                  </div>
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={17} color="var(--accent-rose)" />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {debtorCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ {counterparties.length} ta mijoz</span>
              </div>
            </div>

            {/* Card 4: Bizda Qolgan Haq (Ortiqcha to‘lovlar / depozit) */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '3px solid #15803d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Bizda Haqqi Borlar
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Do‘konda ortiqcha haq / depozit
                  </div>
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(21, 128, 61, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={17} color="#15803d" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#15803d' }}>
                  +{Math.round(totalCustomerCreditUZS).toLocaleString('uz-UZ')} UZS
                </div>
                {totalCustomerCreditUSD > 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginTop: 2 }}>
                    +${totalCustomerCreditUSD.toFixed(2)} USD
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <strong style={{ color: '#15803d' }}>{creditorCount}</strong> ta mijoz haqqi bor
              </div>
            </div>
          </div>

          {/* Search bar & filter pills for counterparties */}
          <div
            className="glass-card"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 380 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Mijoz nomi yoki telefon raqami bo‘yicha qidirish..."
                value={counterpartySearch}
                onChange={(e) => setCounterpartySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter Pills: All vs Only Debtors vs Only Creditors vs Settled */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCounterpartyFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid',
                  borderColor: counterpartyFilter === 'all' ? 'var(--primary)' : 'var(--border-subtle)',
                  background: counterpartyFilter === 'all' ? 'var(--primary-light)' : 'transparent',
                  color: counterpartyFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Barchasi ({counterparties.length})
              </button>
              <button
                type="button"
                onClick={() => setCounterpartyFilter('debtors')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid',
                  borderColor: counterpartyFilter === 'debtors' ? 'var(--accent-amber)' : 'var(--border-subtle)',
                  background: counterpartyFilter === 'debtors' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: counterpartyFilter === 'debtors' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={13} />
                <span>Faqat Qarzdorlar ({debtorCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCounterpartyFilter('creditors')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid',
                  borderColor: counterpartyFilter === 'creditors' ? '#15803d' : 'var(--border-subtle)',
                  background: counterpartyFilter === 'creditors' ? 'rgba(21, 128, 61, 0.15)' : 'transparent',
                  color: counterpartyFilter === 'creditors' ? '#15803d' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={13} color={counterpartyFilter === 'creditors' ? '#15803d' : 'var(--text-muted)'} />
                <span>Bizda Haqqi Borlar ({creditorCount})</span>
              </button>
              {settledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCounterpartyFilter('settled')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid',
                    borderColor: counterpartyFilter === 'settled' ? 'var(--text-muted)' : 'var(--border-subtle)',
                    background: counterpartyFilter === 'settled' ? 'var(--bg-chip)' : 'transparent',
                    color: counterpartyFilter === 'settled' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Hisobi Tozalar ({settledCount})
                </button>
              )}
            </div>

            {counterpartySearch && (
              <button
                type="button"
                onClick={() => setCounterpartySearch('')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Tozalash
              </button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Ko‘rsatilmoqda: <strong style={{ color: 'var(--text-primary)' }}>{filteredCounterparties.length}</strong> ta mijoz
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Mijoz / Hamkor Nomi</th>
                    <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Telefon Raqami</th>
                    <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>B2B Do‘kon Bog‘lanmasi</th>
                    <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Nasiya Qarz (UZS)</th>
                    <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Nasiya Qarz (USD)</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amallar</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                  </tr>
                ) : filteredCounterparties.length > 0 ? (
                  filteredCounterparties.map((cp) => {
                    const debtUzs = Number(cp.debt_balance_uzs || 0);
                    const debtUsd = Number(cp.debt_balance_usd || 0);
                    const hasDebt = debtUzs > 0 || debtUsd > 0;
                    const hasCredit = debtUzs < 0 || debtUsd < 0;
                    const isSettled = debtUzs === 0 && debtUsd === 0;
                    return (
                      <tr
                        key={cp.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background var(--transition-fast)',
                          background: hasCredit ? 'rgba(21, 128, 61, 0.04)' : undefined,
                        }}
                      >
                        <td
                          onClick={() => handleOpenCounterpartyPurchases(cp, 'debt_sales')}
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          title="Nasiya va xaridlar tafsilotini ko‘rish uchun bosing"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--primary)', borderBottom: '1px dashed var(--primary)' }}>
                              {cp.name}
                            </span>
                            {hasDebt && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: 'var(--accent-amber)',
                                }}
                              >
                                Qarzdor
                              </span>
                            )}
                            {hasCredit && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: 'rgba(21, 128, 61, 0.14)',
                                  color: '#15803d',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Sparkles size={11} /> Haqqi bor
                              </span>
                            )}
                            {isSettled && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'var(--bg-chip)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                Hisob toza
                              </span>
                            )}
                          </div>
                          {cp.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{cp.note}</div>}
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
                        <td style={{ padding: '14px 16px' }}>
                          {debtUzs > 0 ? (
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                {debtUzs.toLocaleString()} UZS
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Mijoz qarzi</div>
                            </div>
                          ) : debtUzs < 0 ? (
                            <div>
                              <div style={{ fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                +{Math.abs(debtUzs).toLocaleString()} UZS
                              </div>
                              <div style={{ fontSize: 10.5, color: '#10b981', fontWeight: 600 }}>Mijoz haqqi bor</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0 UZS</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {debtUsd > 0 ? (
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                ${debtUsd.toFixed(2)}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Mijoz qarzi</div>
                            </div>
                          ) : debtUsd < 0 ? (
                            <div>
                              <div style={{ fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                +${Math.abs(debtUsd).toFixed(2)}
                              </div>
                              <div style={{ fontSize: 10.5, color: '#10b981', fontWeight: 600 }}>Mijoz haqqi bor</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>$0.00</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => handleOpenCounterpartyPurchases(cp, 'debt_sales')}
                              style={{
                                padding: '6px 11px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-card)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                              title="Nasiya tovarlari va xaridlar tarixi"
                            >
                              <ShoppingBag size={13} color="var(--accent-amber)" />
                              <span>Xaridlar</span>
                            </button>
                            {hasCredit ? (
                              <button
                                onClick={() => handleOpenRefundCredit(cp)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: 'none',
                                  background: '#15803d',
                                  color: '#ffffff',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                                }}
                                title="Mijozga ortiqcha haqini qaytarish / hisobni tozalash"
                              >
                                <RotateCcw size={13} />
                                <span>Haqni Qaytarish</span>
                              </button>
                            ) : (
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
                            )}
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
                              title="To‘lovlar tarixi"
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
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {counterpartySearch ? 'Qidiruv bo‘yicha mijozlar topilmadi' : 'Mijozlar topilmadi'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: B2B Inbox */}
      {activeTab === 'b2b' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Faktura #</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Yuboruvchi Do‘kon</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tovarlar Soni</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Jami Qiymat</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Kelgan Sana</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Qaror</th>
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
        </div>
      )}

      {/* Modal 1: Sale Detail / Printable Receipt */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Sotuv Cheki Tafsilotlari">
        {loadingDetail ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : selectedSaleDetail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Printer format switcher */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>
                Printer:
              </span>
              <button
                type="button"
                onClick={() => setReceiptPaperWidth('58mm')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: receiptPaperWidth === '58mm' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: receiptPaperWidth === '58mm' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: receiptPaperWidth === '58mm' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                58 mm (Uzum/Kichik termal)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPaperWidth('80mm')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: receiptPaperWidth === '80mm' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: receiptPaperWidth === '80mm' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: receiptPaperWidth === '80mm' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                80 mm (Katta POS)
              </button>
            </div>

            {/* Authentic Printable Thermal Receipt */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ReceiptSlip id="printable-receipt" sales={[selectedSaleDetail]} paperWidth={receiptPaperWidth} />
            </div>

            {/* Void Items Action List (Web Only) */}
            {['completed', 'partially_voided'].includes((selectedSaleDetail.status || '').toLowerCase()) && (
              <div
                className="no-print"
                style={{
                  marginTop: 6,
                  padding: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Tovarlarni qisman bekor qilish / qaytarish:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(selectedSaleDetail.items || []).map((it) => {
                    const itStatus = (it.status || '').toLowerCase();
                    const isVoided = itStatus === 'voided' || (it.voided_quantity && it.voided_quantity >= it.quantity);
                    if (isVoided) return null;
                    return (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          padding: '4px 0',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>
                          {it.product_name || 'Tovar'} ({it.quantity} ta)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenVoidItem(it)}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions (Web Only) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => printReceiptSlip('printable-receipt', 'Inventra Savdo Cheki', receiptPaperWidth)}
                  style={{
                    padding: '9px 18px',
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
                  <span>Chekni chop etish</span>
                </button>

                {selectedSaleDetail &&
                  ((selectedSaleDetail.payment_type || '').toLowerCase() === 'debt' ||
                    Boolean(selectedSaleDetail.is_partner_sale) ||
                    Boolean(selectedSaleDetail.counterparty) ||
                    Boolean(selectedSaleDetail.counterparty_name) ||
                    Boolean(selectedSaleDetail.b2b_target_tenant)) && (
                    <button
                      type="button"
                      onClick={() => handleOpenInvoice(selectedSaleDetail)}
                      style={{
                        padding: '9px 18px',
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
                      <FileText size={15} style={{ color: 'var(--primary)' }} />
                      <span>A4 Faktura (Yuk xati)</span>
                    </button>
                  )}
              </div>

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
              <CustomSelect
                value={paymentCurrency}
                onChange={(val) => setPaymentCurrency(val)}
                options={[
                  { value: 'UZS', label: 'UZS (So‘m)' },
                  { value: 'USD', label: 'USD (Dollar)' },
                ]}
                fullWidth
              />
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

      {/* Modal 5.5: Refund Customer Credit */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title={`Mijoz Haqqini Qaytarish — ${selectedCp?.name || ''}`}
        maxWidth={480}
      >
        <form onSubmit={handleConfirmRefundCredit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} />
              <span>Bizda Qolgan Ortiqcha Haq</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Mijoz do‘kondan ortiqcha to‘lagan yoki omonat qoldirgan summasini qaytarib olmoqda. To‘lov amalga oshirilgach, mijozning manfiy qarzi 0 ga tenglashadi.
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
              Mavjud haq:{' '}
              {Math.max(0, -Number(selectedCp?.debt_balance_uzs || 0)) > 0 &&
                `+${Math.max(0, -Number(selectedCp?.debt_balance_uzs || 0)).toLocaleString()} UZS `}
              {Math.max(0, -Number(selectedCp?.debt_balance_usd || 0)) > 0 &&
                `+$${Math.max(0, -Number(selectedCp?.debt_balance_usd || 0)).toFixed(2)}`}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Valyuta
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRefundCurrency('UZS')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: refundCurrency === 'UZS' ? '2px solid #10b981' : '1px solid var(--border-card)',
                  background: refundCurrency === 'UZS' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                  color: refundCurrency === 'UZS' ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                UZS (So‘m)
              </button>
              <button
                type="button"
                onClick={() => setRefundCurrency('USD')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: refundCurrency === 'USD' ? '2px solid #10b981' : '1px solid var(--border-card)',
                  background: refundCurrency === 'USD' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                  color: refundCurrency === 'USD' ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                USD (Dollar)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Qaytariladigan Summa *
            </label>
            <input
              type="number"
              step="any"
              required
              min="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 16,
                fontWeight: 700,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Izoh
            </label>
            <input
              type="text"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              placeholder="Izoh qoldiring..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setRefundModalOpen(false)}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingRefund}
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submittingRefund ? 'Qaytarilmoqda...' : 'Haqni Qaytarish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Customer Purchases & Debt History */}
      <Modal
        isOpen={cpDetailModalOpen}
        onClose={() => setCpDetailModalOpen(false)}
        title={`Mijoz Nasiya & Xarid Tarixi — ${selectedCpDetail?.name || ''}`}
        maxWidth={900}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Customer Summary Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              padding: 14,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mijoz Ma‘lumotlari
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {selectedCpDetail?.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'monospace' }}>
                {selectedCpDetail?.phone_number || 'Telefon kiritilmagan'}
              </div>
              {selectedCpDetail?.note && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                  {selectedCpDetail.note}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, color: Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                {Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? 'Mijoz Haqqi (UZS)' : 'Nasiya Qarzi (UZS)'}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Number(selectedCpDetail?.debt_balance_uzs || 0) > 0 ? 'var(--text-primary)' : Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? '#10b981' : 'var(--text-secondary)',
                  marginTop: 3,
                }}
              >
                {Number(selectedCpDetail?.debt_balance_uzs || 0) < 0
                  ? `+${Math.abs(Number(selectedCpDetail?.debt_balance_uzs || 0)).toLocaleString()} UZS`
                  : `${Number(selectedCpDetail?.debt_balance_uzs || 0).toLocaleString()} UZS`}
              </div>
              <div style={{ fontSize: 11, color: Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? '#10b981' : 'var(--text-muted)', marginTop: 2, fontWeight: Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? 600 : 400 }}>
                {Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 ? 'Mijoz haqqi (ortiqcha to‘lov)' : 'Joriy so‘m balansi'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                {Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? 'Mijoz Haqqi (USD)' : 'Nasiya Qarzi (USD)'}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Number(selectedCpDetail?.debt_balance_usd || 0) > 0 ? 'var(--text-primary)' : Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? '#10b981' : 'var(--text-secondary)',
                  marginTop: 3,
                }}
              >
                {Number(selectedCpDetail?.debt_balance_usd || 0) < 0
                  ? `+$${Math.abs(Number(selectedCpDetail?.debt_balance_usd || 0)).toFixed(2)}`
                  : `$${Number(selectedCpDetail?.debt_balance_usd || 0).toFixed(2)}`}
              </div>
              <div style={{ fontSize: 11, color: Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? '#10b981' : 'var(--text-muted)', marginTop: 2, fontWeight: Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? 600 : 400 }}>
                {Number(selectedCpDetail?.debt_balance_usd || 0) < 0 ? 'Mijoz haqqi (ortiqcha to‘lov)' : 'Joriy dollar balansi'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
              {(Number(selectedCpDetail?.debt_balance_uzs || 0) < 0 || Number(selectedCpDetail?.debt_balance_usd || 0) < 0) ? (
                <button
                  type="button"
                  onClick={() => handleOpenRefundCredit(selectedCpDetail)}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Haqni Qaytarish</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCp(selectedCpDetail);
                    setPaymentAmount('');
                    setPaymentCurrency('UZS');
                    setPaymentNote('');
                    setDebtModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <CreditCard size={14} />
                  <span>Qarz To‘lash</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab buttons */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setCpDetailTab('debt_sales')}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: cpDetailTab === 'debt_sales' ? 'var(--primary)' : 'var(--bg-chip)',
                color: cpDetailTab === 'debt_sales' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ShoppingBag size={13} />
              <span>Nasiya Xaridlari</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: cpDetailTab === 'debt_sales' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                  fontSize: 11,
                }}
              >
                {cpSalesSummary.debt_sales_count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCpDetailTab('all_sales')}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: cpDetailTab === 'all_sales' ? 'var(--primary)' : 'var(--bg-chip)',
                color: cpDetailTab === 'all_sales' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Receipt size={13} />
              <span>Barcha Xaridlar</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: cpDetailTab === 'all_sales' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                  fontSize: 11,
                }}
              >
                {cpSalesSummary.total_sales_count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCpDetailTab('payments')}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: cpDetailTab === 'payments' ? 'var(--primary)' : 'var(--bg-chip)',
                color: cpDetailTab === 'payments' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <History size={13} />
              <span>To‘lovlar Tarixi</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: cpDetailTab === 'payments' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                  fontSize: 11,
                }}
              >
                {cpDetailPayments.length}
              </span>
            </button>
          </div>

          {/* Search bar for items/sales */}
          {(cpDetailTab === 'debt_sales' || cpDetailTab === 'all_sales') && (
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Tovar nomi, kodi yoki chek raqami bo‘yicha qidirish..."
                value={cpPurchasesSearch}
                onChange={(e) => setCpPurchasesSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
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

          {/* Tab 1 & 2: Sales List */}
          {(cpDetailTab === 'debt_sales' || cpDetailTab === 'all_sales') && (
            <div>
              {loadingCpSales ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : filteredCpPurchases.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    maxHeight: '52vh',
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {filteredCpPurchases.map((sale) => (
                    <div
                      key={sale.id}
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-card)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Sale Header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                          padding: '10px 14px',
                          background: 'var(--bg-input)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)' }}>
                            #{sale.receipt_number || sale.id}
                          </span>
                          {sale.payment_type === 'debt' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', fontSize: 11, fontWeight: 700 }}>
                              Nasiya (Qarz)
                            </span>
                          ) : sale.payment_type === 'card' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontSize: 11, fontWeight: 700 }}>
                              Karta
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: 11, fontWeight: 700 }}>
                              Naqd
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                            {new Date(sale.created_at).toLocaleString('uz-UZ')}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                            Sotuvchi: <strong style={{ color: 'var(--text-primary)' }}>{sale.sold_by_name || 'Kassir'}</strong>
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {sale.status === 'voided' && (
                            <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-rose)', fontSize: 11, fontWeight: 700 }}>
                              Bekor qilingan
                            </span>
                          )}
                          {sale.status === 'partially_voided' && (
                            <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', fontSize: 11, fontWeight: 700 }}>
                              Qisman qaytarilgan
                            </span>
                          )}
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {Number(sale.total_amount).toLocaleString()} {sale.currency}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(sale)}
                            title="A4 formatida rasmiy Hisob-faktura / Yuk xati"
                            style={{
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border-card)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <FileText size={13} style={{ color: 'var(--primary)' }} />
                            <span>A4 Faktura</span>
                          </button>
                        </div>
                      </div>

                      {/* Sale Items Table */}
                      <div className="table-responsive">
                        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              <th style={{ padding: '8px 12px', width: 32 }}>№</th>
                              <th style={{ padding: '8px 12px' }}>Tovar & Variant (Nima olgani)</th>
                              <th style={{ padding: '8px 12px' }}>Kodi / Barcode</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Soni (Nechta)</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Dona Narxi (Qaysi narxda)</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Jami Qiymat (Qanchaga)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sale.items || []).map((it, idx) => {
                              const displayName = it.product_name || 'Noma‘lum tovar';
                              const variantSuffix = it.product_variant_name && it.product_variant_name !== it.product_name ? ` (${it.product_variant_name})` : '';
                              return (
                                <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                  <td style={{ padding: '9px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Package size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                      <span>{displayName}{variantSuffix}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                                    {it.product_code || it.product_sku || '—'}
                                  </td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {Number(it.quantity).toLocaleString()} {it.unit || 'dona'}
                                    {Number(it.voided_quantity || 0) > 0 && (
                                      <div style={{ fontSize: 10, color: 'var(--accent-rose)', fontWeight: 500 }}>
                                        ({it.voided_quantity} qaytarildi)
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                    {Number(it.unit_price).toLocaleString()} {sale.currency}
                                  </td>
                                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: sale.payment_type === 'debt' ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                                    {Number(it.total_price).toLocaleString()} {sale.currency}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-card)' }}>
                  <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>{cpDetailTab === 'debt_sales' ? 'Nasiyaga olingan tovarlar mavjud emas' : 'Xaridlar topilmadi'}</div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Debt Payments History */}
          {cpDetailTab === 'payments' && (
            <div>
              {loadingCpDetailPayments ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : cpDetailPayments.length > 0 ? (
                <div className="table-responsive" style={{ maxHeight: '52vh' }}>
                  <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-muted)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Sana & Vaqt</th>
                        <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Qabul qildi (Kassir)</th>
                        <th style={{ padding: '10px 14px' }}>Izoh</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>To‘langan Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cpDetailPayments.map((p) => (
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
                <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-card)' }}>
                  <History size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>Ushbu mijoz bo‘yicha to‘lovlar tarixi mavjud emas</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setCpDetailModalOpen(false)}
              style={{
                padding: '9px 20px',
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

      {/* Official A4 Invoice Modal */}
      <InvoiceA4Modal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        sale={selectedInvoiceSale}
      />
    </div>
  );
}
