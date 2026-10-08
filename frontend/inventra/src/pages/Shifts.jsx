import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  FileText,
  Calendar,
  DollarSign,
  Printer,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Wallet,
  X,
} from 'lucide-react';
import { cashboxApi } from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import InventraLogo from '../components/common/InventraLogo';
import ShiftReportSlip from '../components/common/ShiftReportSlip';
import ZReportModernView from '../components/common/ZReportModernView';
import { printReceiptSlip } from '../components/common/ReceiptSlip';
import usePersistedState from '../hooks/usePersistedState';

const STORAGE_KEY_EXPENSES = 'inventra_custom_expense_categories';
const STORAGE_KEY_INCOMES = 'inventra_custom_income_sources';

// Universal neutral starter categories for ANY type of business
const DEFAULT_EXPENSE_CATEGORIES = [
  'Kommunal to‘lovlar',
  'Ijara to‘lovi',
  'Xodimlar xarajati',
  'Xo‘jalik / Tozalik',
  'Yetkazib berish (Dastavka)',
  'Kantselyariya / Paketlar',
  'Boshqa xarajat',
];

const DEFAULT_INCOME_SOURCES = [
  'Qo‘shimcha xizmat',
  'Yetkazib berish haqi',
  'Mijoz to‘lovi',
  'Kassa to‘ldirish (Qaytim)',
  'Boshqa kirim',
];

export default function Shifts() {
  const toast = useToast();
  const { activeBranch } = useBranch();
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'expenses' | 'income'
  const [shiftStatus, setShiftStatus] = useState(null);
  const [reports, setReports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [reportDetailModalOpen, setReportDetailModalOpen] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [reportViewMode, setReportViewMode] = useState('modern'); // 'modern' | 'slip'
  const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState('inventra_receipt_paper_width', '58mm');

  // Shift Close Form
  const [actualCashUzs, setActualCashUzs] = useState('');
  const [actualCashUsd, setActualCashUsd] = useState('0');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  // Saved Custom Categories & Persistence
  const [savedExpenseCategories, setSavedExpenseCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  });

  const [savedIncomeSources, setSavedIncomeSources] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INCOMES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_INCOME_SOURCES;
  });

  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('UZS');
  const [expenseCategory, setExpenseCategory] = useState(() => savedExpenseCategories[0] || 'Xarajat');
  const [expenseNote, setExpenseNote] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Income Form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCurrency, setIncomeCurrency] = useState('UZS');
  const [incomeSource, setIncomeSource] = useState(() => savedIncomeSources[0] || 'Qo‘shimcha kirim');
  const [incomeNote, setIncomeNote] = useState('');
  const [submittingIncome, setSubmittingIncome] = useState(false);

  const handleDeleteExpenseCategory = (catToDelete) => {
    const updated = savedExpenseCategories.filter((c) => c !== catToDelete);
    setSavedExpenseCategories(updated);
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
    } catch {}
    if (expenseCategory === catToDelete) {
      setExpenseCategory(updated[0] || '');
    }
  };

  const handleDeleteIncomeSource = (srcToDelete) => {
    const updated = savedIncomeSources.filter((s) => s !== srcToDelete);
    setSavedIncomeSources(updated);
    try {
      localStorage.setItem(STORAGE_KEY_INCOMES, JSON.stringify(updated));
    } catch {}
    if (incomeSource === srcToDelete) {
      setIncomeSource(updated[0] || '');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await cashboxApi.getCurrentShift(activeBranch?.id).catch(() => null);
      setShiftStatus(statusRes);

      if (activeTab === 'reports') {
        const res = await cashboxApi.getReports(1, activeBranch?.id);
        const list = res.results || res;
        setReports(Array.isArray(list) ? list : []);
      } else if (activeTab === 'expenses') {
        const res = await cashboxApi.getExpenses(activeBranch?.id);
        const list = res.results || res;
        setExpenses(Array.isArray(list) ? list : []);
      } else if (activeTab === 'income') {
        const res = await cashboxApi.getIncome(activeBranch?.id);
        const list = res.results || res;
        setIncomes(Array.isArray(list) ? list : []);
      }
    } catch {
      toast.error('Kassa ma’lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeBranch?.id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Shift Close (Z-Report generation)
  const handleCloseShiftSubmit = async (e) => {
    e.preventDefault();
    if (!actualCashUzs) {
      toast.warning('Kassadagi haqiqiy sanab olingan naqd pulni kiriting');
      return;
    }
    setSubmittingClose(true);
    try {
      const rep = await cashboxApi.closeShift({
        branch_id: activeBranch?.id,
        actual_cash_uzs: parseFloat(actualCashUzs),
        actual_cash_usd: parseFloat(actualCashUsd || '0'),
        discrepancy_reason: discrepancyReason,
        staff_notes: staffNotes,
      });
      toast.success('Smena muvaffaqiyatli yopildi va Z-Hisobot yaratildi!');
      setCloseShiftModalOpen(false);
      setActualCashUzs('');
      setActualCashUsd('0');
      setDiscrepancyReason('');
      setStaffNotes('');
      setReportViewMode('modern');
      setSelectedReportDetail(rep);
      setReportDetailModalOpen(true);
      loadData();
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
      window.dispatchEvent(new CustomEvent('shift_status_changed'));
    } catch (err) {
      toast.error(err.message || 'Smenani yopishda xatolik yuz berdi');
    } finally {
      setSubmittingClose(false);
    }
  };

  // Handle Expense Submit
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseAmount) {
      toast.warning('Chiqim summasini kiriting');
      return;
    }
    const cleanCategory = expenseCategory.trim();
    if (!cleanCategory) {
      toast.warning('Chiqim toifasini kiriting yoki tanlang');
      return;
    }

    setSubmittingExpense(true);
    try {
      await cashboxApi.createExpense({
        branch_id: activeBranch?.id,
        amount: parseFloat(expenseAmount),
        currency: expenseCurrency,
        category: cleanCategory,
        note: expenseNote,
      });

      // Save category to localStorage if not already present
      if (!savedExpenseCategories.some((c) => c.toLowerCase() === cleanCategory.toLowerCase())) {
        const updated = [...savedExpenseCategories, cleanCategory];
        setSavedExpenseCategories(updated);
        try {
          localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
        } catch {}
      }

      toast.success('Chiqim muvaffaqiyatli saqlandi!');
      setExpenseModalOpen(false);
      setExpenseAmount('');
      setExpenseNote('');
      loadData();
      window.dispatchEvent(new CustomEvent('shift_status_changed'));
    } catch (err) {
      toast.error(err.message || 'Chiqimni saqlashda xatolik');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Handle Income Submit
  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeAmount) {
      toast.warning('Kirim summasini kiriting');
      return;
    }
    const cleanSource = incomeSource.trim();
    if (!cleanSource) {
      toast.warning('Kirim manbasini kiriting yoki tanlang');
      return;
    }

    setSubmittingIncome(true);
    try {
      await cashboxApi.createIncome({
        branch_id: activeBranch?.id,
        amount: parseFloat(incomeAmount),
        currency: incomeCurrency,
        source: cleanSource,
        note: incomeNote,
      });

      // Save source to localStorage if not already present
      if (!savedIncomeSources.some((s) => s.toLowerCase() === cleanSource.toLowerCase())) {
        const updated = [...savedIncomeSources, cleanSource];
        setSavedIncomeSources(updated);
        try {
          localStorage.setItem(STORAGE_KEY_INCOMES, JSON.stringify(updated));
        } catch {}
      }

      toast.success('Kirim muvaffaqiyatli qayd etildi!');
      setIncomeModalOpen(false);
      setIncomeAmount('');
      setIncomeNote('');
      loadData();
      window.dispatchEvent(new CustomEvent('shift_status_changed'));
    } catch (err) {
      toast.error(err.message || 'Kirimni saqlashda xatolik');
    } finally {
      setSubmittingIncome(false);
    }
  };

  // Open Full Z-Report Detail
  const handleOpenReportDetail = async (report) => {
    setReportViewMode('modern');
    try {
      const detail = await cashboxApi.getReportDetail(report.id);
      setSelectedReportDetail(detail);
      setReportDetailModalOpen(true);
    } catch {
      setSelectedReportDetail(report);
      setReportDetailModalOpen(true);
    }
  };

  const expectedUzs = Number(shiftStatus?.expected_cash_uzs || 0);
  const expectedUsd = Number(shiftStatus?.expected_cash_usd || 0);
  const isShiftOpen = Boolean(shiftStatus?.is_open ?? (shiftStatus?.status === 'OPEN'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Current Live Shift Card */}
      <div
        className="glass-card"
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Coins size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Joriy Kassa Smenasi ({isShiftOpen ? 'Jonli Holat' : 'Yopiq'})
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: isShiftOpen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isShiftOpen ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    fontWeight: 800,
                  }}
                >
                  {isShiftOpen ? 'FAOL' : 'YOPIQ'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {isShiftOpen
                  ? (shiftStatus?.shift_start
                      ? `Boshlangan vaqti: ${new Date(shiftStatus.shift_start).toLocaleString('uz-UZ')}`
                      : 'Smena faol')
                  : 'Smena yopilgan. Yangi savdo yoki kirim qilinganda avtomatik ochiladi.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setIncomeAmount('');
                setIncomeNote('');
                setIncomeSource(savedIncomeSources[0] || '');
                setIncomeModalOpen(true);
              }}
              style={{
                padding: '9px 15px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--accent-emerald)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowUpCircle size={16} />
              <span>+ Kassaga Kirim</span>
            </button>

            <button
              onClick={() => {
                setExpenseAmount('');
                setExpenseNote('');
                setExpenseCategory(savedExpenseCategories[0] || '');
                setExpenseModalOpen(true);
              }}
              style={{
                padding: '9px 15px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-rose)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowDownCircle size={16} />
              <span>- Kassadan Chiqim</span>
            </button>

            {isShiftOpen ? (
              <button
                onClick={() => {
                  setActualCashUzs(String(expectedUzs));
                  setActualCashUsd(String(expectedUsd));
                  setCloseShiftModalOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: 'var(--primary-glow)',
                }}
              >
                <Lock size={15} />
                <span>Smenani Yopish (Z-Report)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIncomeAmount('');
                  setIncomeNote('Kassa smenasini ochish');
                  setIncomeSource('Kassa to‘ldirish (Qaytim)');
                  setIncomeModalOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--accent-emerald)',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ArrowUpCircle size={15} />
                <span>+ Smenani Boshlash / Ochish</span>
              </button>
            )}
          </div>
        </div>

        {/* Shift Financial Overview Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={14} color="var(--primary)" />
              <span>Kutilgan Naqd Pul</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
              {expectedUzs.toLocaleString()} UZS
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingUp size={14} color="var(--accent-emerald)" />
              <span>Naqd Sotuv Tushumi</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {Number(shiftStatus?.total_sale_cash_uzs || 0).toLocaleString()} UZS
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CreditCard size={14} color="var(--accent-sky)" />
              <span>Karta Tushumi</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-sky)' }}>
              {Number(shiftStatus?.total_sale_card_uzs || 0).toLocaleString()} UZS
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingDown size={14} color="var(--accent-rose)" />
              <span>Kassadan Chiqimlar</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-rose)' }}>
              -{Number(shiftStatus?.total_expenses_uzs || 0).toLocaleString()} UZS
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-xs)',
            border: 'none',
            background: activeTab === 'reports' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'reports' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Kunlik Z-Hisobotlar
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-xs)',
            border: 'none',
            background: activeTab === 'expenses' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'expenses' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Chiqimlar Tarixi
        </button>
        <button
          onClick={() => setActiveTab('income')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-xs)',
            border: 'none',
            background: activeTab === 'income' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'income' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Qo‘shimcha Kirimlar
        </button>
      </div>

      {/* Main Table Views */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          {activeTab === 'reports' && (
            <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Hisobot ID</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Sana</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Kutilgan Naqd Pul</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Haqiqiy Sanalgan</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tafovut (Farq)</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Yopgan Xodim</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amal</th>
                </tr>
              </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map((r) => {
                  const dUzs = Number(r.discrepancy_uzs || 0);
                  const dUsd = Number(r.discrepancy_usd || 0);
                  const isExact = dUzs === 0 && dUsd === 0;
                  const parts = [];
                  if (dUzs !== 0) {
                    parts.push(`${dUzs > 0 ? `+${dUzs.toLocaleString()}` : dUzs.toLocaleString()} UZS`);
                  }
                  if (dUsd !== 0) {
                    parts.push(`${dUsd > 0 ? `+$${dUsd.toFixed(2)}` : `-$${Math.abs(dUsd).toFixed(2)}`}`);
                  }
                  const diffText = isExact ? 'Aniq (0)' : parts.join(' / ');

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>Z-#{r.id}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(r.closed_at || r.date).toLocaleDateString('uz-UZ')}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                        {Number(r.expected_cash_uzs || 0).toLocaleString()} UZS
                        {Number(r.expected_cash_usd || 0) > 0 && ` / $${Number(r.expected_cash_usd).toFixed(2)}`}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {Number(r.actual_cash_uzs || 0).toLocaleString()} UZS
                        {Number(r.actual_cash_usd || 0) > 0 && ` / $${Number(r.actual_cash_usd).toFixed(2)}`}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: 12,
                            fontWeight: 700,
                            background: isExact ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isExact ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          }}
                        >
                          {diffText}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {r.closed_by_name || 'Admin'}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenReportDetail(r)}
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
                          <FileText size={13} />
                          <span>Batafsil Z-Chek</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Z-hisobotlar mavjud emas</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'expenses' && (
          <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Toifa</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Summa</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Izoh</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Kiritgan Xodim</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Sana</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map((ex) => (
                  <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', fontSize: 12, fontWeight: 700 }}>
                        {ex.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-rose)' }}>
                      -{Number(ex.amount).toLocaleString()} {ex.currency || 'UZS'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{ex.note || '—'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{ex.recorded_by_name || 'Xodim'}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(ex.created_at || ex.date).toLocaleString('uz-UZ')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chiqimlar mavjud emas</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'income' && (
          <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Manba</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Summa</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Izoh</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Qabul qilgan Xodim</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Sana</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : incomes.length > 0 ? (
                incomes.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-emerald)', fontSize: 12, fontWeight: 700 }}>
                        {inc.source}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-emerald)', whiteSpace: 'nowrap' }}>
                      +{Number(inc.amount).toLocaleString()} {inc.currency || 'UZS'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{inc.note || '—'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{inc.recorded_by_name || 'Xodim'}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(inc.created_at || inc.date).toLocaleString('uz-UZ')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Kirimlar mavjud emas</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Modal 1: Shift Close (Z-Report confirmation) */}
      <Modal isOpen={closeShiftModalOpen} onClose={() => setCloseShiftModalOpen(false)} title="Smenani Yopish & Z-Hisobot">
        <form onSubmit={handleCloseShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 14, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Tizim bo‘yicha kutilayotgan naqd pul:</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                {expectedUzs.toLocaleString()} UZS
              </div>
              {expectedUsd > 0 && (
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  / ${expectedUsd.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Kassadagi haqiqiy sanalgan naqd pul (UZS) *
            </label>
            <input
              type="number"
              step="0.01"
              value={actualCashUzs}
              onChange={(e) => setActualCashUzs(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
            />
          </div>

          {expectedUsd > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Kassadagi haqiqiy sanalgan naqd pul (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                value={actualCashUsd}
                onChange={(e) => setActualCashUsd(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
              />
            </div>
          )}

          {((actualCashUzs && parseFloat(actualCashUzs) !== expectedUzs) || (actualCashUsd && parseFloat(actualCashUsd) !== expectedUsd)) && (
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--accent-amber)', marginBottom: 6 }}>
                Tafovut sababi {parseFloat(actualCashUzs || 0) !== expectedUzs && `(UZS farq: ${(parseFloat(actualCashUzs || 0) - expectedUzs).toLocaleString()} UZS)`} {parseFloat(actualCashUsd || 0) !== expectedUsd && `(USD farq: $${(parseFloat(actualCashUsd || 0) - expectedUsd).toFixed(2)})`}
              </label>
              <input
                type="text"
                placeholder="Nima sababdan naqd pul kam yoki ortiqcha chiqdi..."
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Smena bo‘yicha xodim izohi
            </label>
            <input
              type="text"
              placeholder="Ixtiyoriy eslatma..."
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setCloseShiftModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingClose}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 800, cursor: 'pointer' }}
            >
              {submittingClose ? 'Yopilmoqda...' : 'Smenani Yopish & Z-Chek'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Expense Modal */}
      <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Kassadan Chiqim Qilish">
        <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Chiqim Summasi *
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['UZS', 'USD'].map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setExpenseCurrency(cur)}
                    style={{
                      padding: '2px 9px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: expenseCurrency === cur ? 'var(--primary)' : 'var(--border-card)',
                      background: expenseCurrency === cur ? 'var(--primary)' : 'var(--bg-card)',
                      color: expenseCurrency === cur ? 'var(--primary-foreground, #fff)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                placeholder={expenseCurrency === 'USD' ? 'Masalan: 50.00' : 'Masalan: 50000'}
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 52px 12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                {expenseCurrency}
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Chiqim Toifasi *
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Erkin yozing yoki pastdan tanlang
              </span>
            </div>
            <input
              type="text"
              list="expense-categories-datalist"
              placeholder="Masalan: Ijara, Dastavka, Bojxona..."
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              required
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
            <datalist id="expense-categories-datalist">
              {savedExpenseCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {/* Quick Tag Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {savedExpenseCategories.map((cat) => {
                const isSelected = expenseCategory.trim().toLowerCase() === cat.toLowerCase();
                return (
                  <span
                    key={cat}
                    onClick={() => setExpenseCategory(cat)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isSelected ? 'var(--accent-rose)' : 'var(--bg-card)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExpenseCategory(cat);
                      }}
                      title="Toifani o‘chirish"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'inherit',
                        opacity: 0.7,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Izoh
            </label>
            <input
              type="text"
              placeholder="Masalan: Elektr energiyasi to‘lovi"
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setExpenseModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingExpense}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              {submittingExpense ? 'Saqlanmoqda...' : 'Chiqimni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Income Modal */}
      <Modal isOpen={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} title="Kassaga Qo‘shimcha Kirim">
        <form onSubmit={handleIncomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Kirim Summasi *
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['UZS', 'USD'].map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setIncomeCurrency(cur)}
                    style={{
                      padding: '2px 9px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: incomeCurrency === cur ? 'var(--accent-emerald)' : 'var(--border-card)',
                      background: incomeCurrency === cur ? 'var(--accent-emerald)' : 'var(--bg-card)',
                      color: incomeCurrency === cur ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                placeholder={incomeCurrency === 'USD' ? 'Masalan: 100.00' : 'Masalan: 100000'}
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 52px 12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                {incomeCurrency}
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Kirim Manbasi *
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Erkin yozing yoki pastdan tanlang
              </span>
            </div>
            <input
              type="text"
              list="income-sources-datalist"
              placeholder="Masalan: Qo‘shimcha xizmat, Dastavka to‘lovi..."
              value={incomeSource}
              onChange={(e) => setIncomeSource(e.target.value)}
              required
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
            <datalist id="income-sources-datalist">
              {savedIncomeSources.map((src) => (
                <option key={src} value={src} />
              ))}
            </datalist>

            {/* Quick Tag Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {savedIncomeSources.map((src) => {
                const isSelected = incomeSource.trim().toLowerCase() === src.toLowerCase();
                return (
                  <span
                    key={src}
                    onClick={() => setIncomeSource(src)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isSelected ? 'var(--accent-emerald)' : 'var(--bg-card)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {src}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIncomeSource(src);
                      }}
                      title="Manbani o‘chirish"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'inherit',
                        opacity: 0.7,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Izoh
            </label>
            <input
              type="text"
              placeholder="Masalan: Kserokopiya qog‘oz xizmati"
              value={incomeNote}
              onChange={(e) => setIncomeNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIncomeModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingIncome}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-emerald)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              {submittingIncome ? 'Saqlanmoqda...' : 'Kirimni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Full Z-Report Printable Detail */}
      <Modal
        isOpen={reportDetailModalOpen}
        onClose={() => setReportDetailModalOpen(false)}
        title={reportViewMode === 'modern' ? 'Z-Hisobot (Smena Natijalari)' : 'Z-Hisobot Kassa Cheki'}
        maxWidth={reportViewMode === 'modern' ? 560 : 440}
      >
        {selectedReportDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reportViewMode === 'modern' ? (
              <ZReportModernView
                report={selectedReportDetail}
                onPrint={() => printReceiptSlip('printable-z-report', 'Inventra Z-Hisobot', receiptPaperWidth)}
                onClose={() => setReportDetailModalOpen(false)}
                activeView={reportViewMode}
                onToggleView={setReportViewMode}
              />
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  {/* Paper width toggle */}
                  <div style={{ display: 'inline-flex', background: 'var(--bg-card)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => setReceiptPaperWidth('58mm')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: receiptPaperWidth === '58mm' ? '1px solid var(--primary)' : '1px solid transparent',
                        background: receiptPaperWidth === '58mm' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: receiptPaperWidth === '58mm' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      58 mm (Uzum / Kichik)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptPaperWidth('80mm')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: receiptPaperWidth === '80mm' ? '1px solid var(--primary)' : '1px solid transparent',
                        background: receiptPaperWidth === '80mm' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: receiptPaperWidth === '80mm' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      80 mm (Katta POS)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReportViewMode('modern')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    ← 📊 Hisobot ko‘rinishiga qaytish
                  </button>
                </div>
                <ShiftReportSlip report={selectedReportDetail} id="printable-z-report-preview" paperWidth={receiptPaperWidth} />
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => printReceiptSlip('printable-z-report', 'Inventra Z-Hisobot', receiptPaperWidth)}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground, #fff)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Printer size={15} />
                    <span>Chop etish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportDetailModalOpen(false)}
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
            )}

            {/* Hidden thermal receipt kept ready in DOM for direct iframe printing */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 360, pointerEvents: 'none', opacity: 0 }}>
              <ShiftReportSlip report={selectedReportDetail} id="printable-z-report" paperWidth={receiptPaperWidth} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
