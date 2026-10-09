import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Truck,
  Trash2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Clock,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpDown,
  CalendarDays,
  AlertTriangle,
  Plus,
  ArrowRightLeft,
  Tag,
  Check,
  X,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi, catalogApi } from '../api/client';
import Modal from '../components/common/Modal';
import RapidStockIntakeModal from '../components/inventory/RapidStockIntakeModal';
import StockTransferModal from '../components/inventory/StockTransferModal';
import StockPriceModal from '../components/inventory/StockPriceModal';
import CustomSelect from '../components/common/CustomSelect';
import Pagination from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { usePersistedState } from '../hooks/usePersistedState';

const DEFAULT_INVENTORY_FILTERS = {
  stockSearch: '',
  stockCategory: 'all',
  stockSort: 'name_asc', // 'name_asc' | 'name_desc' | 'qty_desc' | 'qty_asc' | 'price_desc' | 'price_asc'
  movementType: 'all',
  movementDate: 'all',
  movementSearch: '',
};

export default function Inventory() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { isOwner, isAdmin, user } = useAuth();
  const { branches, activeBranch } = useBranch();

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'transfers' | 'deficits' | 'movements'
  const [stockList, setStockList] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transferFilter, setTransferFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'rejected'
  const [movements, setMovements] = useState([]);
  const [deficitsList, setDeficitsList] = useState([]);
  const [deficitCount, setDeficitCount] = useState(0);
  const [deficitSearch, setDeficitSearch] = useState('');
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 25;
  const [movementPage, setMovementPage] = useState(1);
  const MOVEMENT_PAGE_SIZE = 25;
  const [inventoryFilters, setInventoryFilters, resetInventoryFilters] = usePersistedState(
    'inventra_inventory_filters_v2',
    DEFAULT_INVENTORY_FILTERS
  );

  // Modals state
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [customerReturnModalOpen, setCustomerReturnModalOpen] = useState(false);
  const [supplierReturnModalOpen, setSupplierReturnModalOpen] = useState(false);
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStockDetail, setSelectedStockDetail] = useState(null);

  // Transfer & Price Modal states
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedVariantForTransfer, setSelectedVariantForTransfer] = useState(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedStockForPrice, setSelectedStockForPrice] = useState(null);

  // Rapid Stock Intake state
  const [selectedVariantForIntake, setSelectedVariantForIntake] = useState(null);

  // Form states for Other Modals (Adjust, Return, Write-off)
  const [selectedVariantId, setSelectedVariantId] = usePersistedState('inventra_draft_stock_variant', '');
  const [formQuantity, setFormQuantity] = usePersistedState('inventra_draft_stock_qty', '');
  const [formDirection, setFormDirection] = useState('in');
  const [formNote, setFormNote] = usePersistedState('inventra_draft_stock_note', '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedVariantId('');
    setFormQuantity('');
    setFormDirection('in');
    setFormNote('');
  };

  const handleQuickIntake = (variantId) => {
    setSelectedVariantForIntake(variantId);
    setIntakeModalOpen(true);
  };

  const refreshDeficitCount = useCallback(async () => {
    try {
      const res = await inventoryApi.getDeficits();
      const list = res.results || res;
      setDeficitCount(Array.isArray(list) ? list.length : 0);
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await inventoryApi.getStock({ branch_id: activeBranch?.id });
        const list = res.results || res;
        setStockList(Array.isArray(list) ? list : []);
      } else if (activeTab === 'transfers') {
        const res = await inventoryApi.getTransfers({
          branch_id: activeBranch?.id,
          status: transferFilter !== 'all' ? transferFilter : undefined,
        });
        const list = res.results || res;
        setTransfers(Array.isArray(list) ? list : []);
      } else if (activeTab === 'deficits') {
        const res = await inventoryApi.getDeficits(deficitSearch);
        const list = res.results || res;
        const arr = Array.isArray(list) ? list : [];
        setDeficitsList(arr);
        setDeficitCount(arr.length);
      } else {
        const res = await inventoryApi.getMovements();
        const list = res.results || res;
        setMovements(Array.isArray(list) ? list : []);
      }
    } catch {
      toast.error('Ombor ma’lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeBranch?.id, transferFilter, deficitSearch, toast]);

  const handleAcceptTransfer = async (transferId) => {
    const isConfirmed = await confirm({
      title: 'Transferni qabul qilish',
      message: 'Ushbu transferdagi tovarlarni qabul qilishni va fililalingiz omboriga kirim qilishni tasdiqlaysizmi?',
      confirmText: 'Qabul qilish',
      cancelText: 'Bekor qilish',
      type: 'info',
    });
    if (!isConfirmed) return;

    try {
      await inventoryApi.acceptTransfer(transferId);
      toast.success('Transfer muvaffaqiyatli qabul qilindi va tovarlar omboringizga qo‘shildi!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Transferni qabul qilishda xatolik yuz berdi');
    }
  };

  const handleRejectTransfer = async (transferId) => {
    const reason = window.prompt('Transferni rad etish sababini kiriting (ixtiyoriy):');
    if (reason === null) return;

    try {
      await inventoryApi.rejectTransfer(transferId, reason);
      toast.warning('Transfer rad etildi va tovarlar jo‘natuvchi filial omboriga qaytarildi.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Transferni rad etishda xatolik yuz berdi');
    }
  };

  useEffect(() => {
    loadData();
    refreshDeficitCount();
    catalogApi.getVariants().then((res) => {
      const list = res.results || res;
      setVariants(Array.isArray(list) ? list : []);
    }).catch(() => {});
    catalogApi.getCategories().then((res) => {
      const list = res.results || res;
      setCategories(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, [loadData, refreshDeficitCount]);



  // Adjust stock (Qoldiqni to‘g‘rilash)
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVariantId || !formQuantity) {
      toast.warning('Variant va miqdorni kiriting');
      return;
    }
    setIsSubmitting(true);
    try {
      await inventoryApi.adjustStock({
        product_variant_id: parseInt(selectedVariantId, 10),
        quantity: parseFloat(formQuantity),
        direction: formDirection,
        note: formNote || 'Inventarizatsiya natijasi',
      });
      toast.success('Ombor qoldig‘i muvaffaqiyatli to‘g‘rilandi!');
      setAdjustModalOpen(false);
      resetForm();
      loadData();
      refreshDeficitCount();
    } catch (err) {
      toast.error(err.message || 'Tuzatishni saqlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer Return (Mijoz qaytardi)
  const handleCustomerReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVariantId || !formQuantity) {
      toast.warning('Variant va qaytarilgan miqdorni kiriting');
      return;
    }
    setIsSubmitting(true);
    try {
      await inventoryApi.customerReturn({
        product_variant_id: parseInt(selectedVariantId, 10),
        quantity: parseFloat(formQuantity),
        note: formNote || 'Mijoz tomonidan qaytarildi',
      });
      toast.success('Mijoz qaytargan tovar omborga qo‘shildi!');
      setCustomerReturnModalOpen(false);
      resetForm();
      loadData();
      refreshDeficitCount();
    } catch (err) {
      toast.error(err.message || 'Qaytarishda xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supplier Return (Ta’minotchiga qaytarish)
  const handleSupplierReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVariantId || !formQuantity) {
      toast.warning('Variant va qaytariladigan miqdorni kiriting');
      return;
    }
    setIsSubmitting(true);
    try {
      await inventoryApi.supplierReturn({
        product_variant_id: parseInt(selectedVariantId, 10),
        quantity: parseFloat(formQuantity),
        note: formNote || 'Yetkazib beruvchiga qaytarildi',
      });
      toast.success('Ta’minotchiga tovar muvaffaqiyatli chiqarildi!');
      setSupplierReturnModalOpen(false);
      resetForm();
      loadData();
      refreshDeficitCount();
    } catch (err) {
      toast.error(err.message || 'Chiqarishda xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Write-Off (Hisobdan chiqarish / Isrofgarchilik)
  const handleWriteOffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVariantId || !formQuantity) {
      toast.warning('Variant va hisobdan chiqariladigan miqdorni kiriting');
      return;
    }
    setIsSubmitting(true);
    try {
      await inventoryApi.writeOff({
        product_variant_id: parseInt(selectedVariantId, 10),
        quantity: parseFloat(formQuantity),
        note: formNote || 'Yaroqsiz / Buzilgan / Muddati o‘tgan',
      });
      toast.success('Tovar muvaffaqiyatli hisobdan chiqarildi (Isrofgarchilik)!');
      setWriteOffModalOpen(false);
      resetForm();
      loadData();
      refreshDeficitCount();
    } catch (err) {
      toast.error(err.message || 'Hisobdan chiqarishda xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Stock Detail
  const handleOpenDetail = async (stockItem) => {
    const vId = stockItem.product_variant_id || stockItem.product_variant || stockItem.id;
    try {
      const detail = await inventoryApi.getStockDetail(vId);
      setSelectedStockDetail({ ...stockItem, ...detail });
      setDetailModalOpen(true);
    } catch {
      setSelectedStockDetail(stockItem);
      setDetailModalOpen(true);
    }
  };

  const formatQuantity = (qty, unit = 'dona') => {
    const num = Number(qty || 0);
    if (unit === 'dona' || num % 1 === 0) {
      return `${Math.round(num)}`;
    }
    return `${parseFloat(num.toFixed(3))}`;
  };

  const getVariantOptionLabel = (v) => {
    const qtyStr = formatQuantity(v.stock_quantity ?? v.quantity, v.unit);
    return `${v.product_name || v.name} — ${qtyStr} ${v.unit || 'dona'}`;
  };

  const filteredStock = useMemo(() => {
    return stockList
      .filter((item) => {
        // 1. Search text
        const q = (inventoryFilters.stockSearch || '').toLowerCase().trim();
        if (q) {
          const name = (item.product_name || item.name || '').toLowerCase();
          const sku = (item.sku || '').toLowerCase();
          const code = (item.code || '').toLowerCase();
          const barcode = (item.barcode || '').toLowerCase();
          if (!name.includes(q) && !sku.includes(q) && !code.includes(q) && !barcode.includes(q)) {
            return false;
          }
        }

        // 2. Category filter
        if (inventoryFilters.stockCategory && inventoryFilters.stockCategory !== 'all') {
          const target = String(inventoryFilters.stockCategory).toLowerCase().trim();
          const itemCatId = String(item.category_id ?? item.category ?? '').toLowerCase().trim();
          const itemCatName = String(item.category_name || '').toLowerCase().trim();

          const catObj = categories.find(
            (c) => String(c.id).toLowerCase() === target || String(c.name).toLowerCase() === target
          );
          const matchedTargetName = catObj ? String(catObj.name).toLowerCase().trim() : '';
          const matchedTargetId = catObj ? String(catObj.id).toLowerCase().trim() : '';

          const match =
            (itemCatId && (itemCatId === target || itemCatId === matchedTargetId)) ||
            (itemCatName && (itemCatName === target || itemCatName === matchedTargetName));

          if (!match) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = (a.product_name || a.name || '').toLowerCase();
        const nameB = (b.product_name || b.name || '').toLowerCase();
        const qtyA = Number(a.quantity ?? a.stock_quantity ?? 0);
        const qtyB = Number(b.quantity ?? b.stock_quantity ?? 0);
        const priceA = Number(a.last_cost_price || 0);
        const priceB = Number(b.last_cost_price || 0);

        switch (inventoryFilters.stockSort) {
          case 'name_desc':
            return nameB.localeCompare(nameA);
          case 'qty_desc':
            return qtyB - qtyA;
          case 'qty_asc':
            return qtyA - qtyB;
          case 'price_desc':
            return priceB - priceA;
          case 'price_asc':
            return priceA - priceB;
          case 'name_asc':
          default:
            return nameA.localeCompare(nameB);
        }
      });
  }, [stockList, inventoryFilters, categories]);

  const paginatedStock = useMemo(() => {
    const start = (stockPage - 1) * STOCK_PAGE_SIZE;
    return filteredStock.slice(start, start + STOCK_PAGE_SIZE);
  }, [filteredStock, stockPage, STOCK_PAGE_SIZE]);

  useEffect(() => {
    setStockPage(1);
  }, [inventoryFilters.stockSearch, inventoryFilters.stockCategory, inventoryFilters.stockSort, activeBranch?.id]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // 1. Search text
      const q = (inventoryFilters.movementSearch || '').toLowerCase().trim();
      if (q) {
        const pName = (m.product_name || m.product_variant_name || m.variant_name || '').toLowerCase();
        const note = (m.note || m.reason || '').toLowerCase();
        if (!pName.includes(q) && !note.includes(q)) {
          return false;
        }
      }

      // 2. Movement type
      if (inventoryFilters.movementType && inventoryFilters.movementType !== 'all') {
        const mType = (m.type || m.movement_type || '').toLowerCase();
        if (mType !== inventoryFilters.movementType.toLowerCase()) {
          return false;
        }
      }

      // 3. Date presets
      if (m.created_at && inventoryFilters.movementDate !== 'all') {
        const mDate = new Date(m.created_at);
        const y = mDate.getFullYear();
        const mo = String(mDate.getMonth() + 1).padStart(2, '0');
        const d = String(mDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${mo}-${d}`;

        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        if (inventoryFilters.movementDate === 'today') {
          if (dateKey !== todayKey) return false;
        } else if (inventoryFilters.movementDate === 'yesterday') {
          if (dateKey !== yesterdayKey) return false;
        } else if (inventoryFilters.movementDate === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (mDate < weekAgo) return false;
        } else if (inventoryFilters.movementDate === 'month') {
          if (mDate.getMonth() !== now.getMonth() || mDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [movements, inventoryFilters]);

  const paginatedMovements = useMemo(() => {
    const start = (movementPage - 1) * MOVEMENT_PAGE_SIZE;
    return filteredMovements.slice(start, start + MOVEMENT_PAGE_SIZE);
  }, [filteredMovements, movementPage, MOVEMENT_PAGE_SIZE]);

  useEffect(() => {
    setMovementPage(1);
  }, [inventoryFilters.movementSearch, inventoryFilters.movementType, inventoryFilters.movementDate, activeBranch?.id]);

  const hasActiveStockFilters =
    Boolean(inventoryFilters.stockSearch) ||
    inventoryFilters.stockCategory !== 'all' ||
    inventoryFilters.stockSort !== 'name_asc';

  const hasActiveMovementFilters =
    Boolean(inventoryFilters.movementSearch) ||
    inventoryFilters.movementType !== 'all' ||
    inventoryFilters.movementDate !== 'all';

  const selectedVariantObj = variants.find((v) => String(v.id) === String(selectedVariantId));
  const activeCurrency = selectedVariantObj?.currency || 'UZS';
  const activeUnit = selectedVariantObj?.unit || 'dona';

  // Count items in draft for badge display on "+ Tovar Kirimi" button
  const draftItemsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('inventra_stock_intake_full_draft_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.items)) return parsed.items.length;
      }
    } catch {}
    return 0;
  }, [intakeModalOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar with Actions & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('stock')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'stock' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'stock' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Ombor Qoldiqlari
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'transfers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'transfers' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Transferlar</span>
            {transfers.filter((t) => t.status === 'PENDING').length > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: activeTab === 'transfers' ? 'rgba(255,255,255,0.25)' : 'var(--accent-amber, #f59e0b)',
                  color: '#ffffff',
                  fontWeight: 800,
                }}
              >
                {transfers.filter((t) => t.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('deficits')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'deficits' ? 'var(--accent-rose, #ef4444)' : 'transparent',
              color: activeTab === 'deficits' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Kamchiliklar</span>
            {deficitCount > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: activeTab === 'deficits' ? 'rgba(255,255,255,0.25)' : 'var(--accent-rose, #ef4444)',
                  color: '#ffffff',
                  fontWeight: 800,
                }}
              >
                {deficitCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              background: activeTab === 'movements' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'movements' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Harakatlar Tarixi
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedVariantForTransfer(null);
              setTransferModalOpen(true);
            }}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
            title="Boshqa filialga tovar o‘tkazish"
          >
            <ArrowRightLeft size={16} color="var(--primary)" />
            <span>Filialga o‘tkazish</span>
          </button>

          <button
            onClick={() => {
              setSelectedVariantForIntake(null);
              setIntakeModalOpen(true);
            }}
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
              gap: 7,
              boxShadow: 'var(--primary-glow)',
            }}
          >
            <PackagePlus size={16} />
            <span>+ Tovar Kirimi</span>
            {draftItemsCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.28)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                }}
                title="Saqlangan qoralamada tovarlar mavjud"
              >
                {draftItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { resetForm(); setAdjustModalOpen(true); }}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={14} />
            <span>Tuzatish</span>
          </button>

          <button
            onClick={() => { resetForm(); setCustomerReturnModalOpen(true); }}
            title="Cheksiz ombor kirimi — rasmiy chek bo‘yicha qaytarish 'Sotuvlar' bo‘limida amalga oshiriladi"
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={14} />
            <span>Mijoz Qaytardi (Cheksiz)</span>
          </button>

          <button
            onClick={() => { resetForm(); setSupplierReturnModalOpen(true); }}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Truck size={14} />
            <span>Ta’minotchiga Qaytarish</span>
          </button>

          <button
            onClick={() => { resetForm(); setWriteOffModalOpen(true); }}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--accent-rose)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={14} />
            <span>Isrofgarchilik</span>
          </button>
        </div>
      </div>

      {/* Filter Bar for Stock Tab */}
      {activeTab === 'stock' && (
        <div
          className="glass-card"
          style={{
            padding: '12px 18px',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'var(--bg-card)',
          }}
        >
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
                placeholder="Tovar nomi, SKU, shtrix-kod yoki 3 bosqichli kod..."
                value={inventoryFilters.stockSearch}
                onChange={(e) => setInventoryFilters({ ...inventoryFilters, stockSearch: e.target.value })}
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

            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Kategoriya:</span>
              <CustomSelect
                value={
                  categories.some((c) => String(c.id) === String(inventoryFilters.stockCategory))
                    ? categories.find((c) => String(c.id) === String(inventoryFilters.stockCategory))?.name || inventoryFilters.stockCategory
                    : inventoryFilters.stockCategory
                }
                onChange={(val) => setInventoryFilters({ ...inventoryFilters, stockCategory: val })}
                options={[
                  { value: 'all', label: 'Barcha kategoriyalar' },
                  ...categories.map((c) => ({ value: c.name, label: c.name })),
                ]}
                size="md"
                style={{ minWidth: 170 }}
              />
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CustomSelect
                icon={ArrowUpDown}
                value={inventoryFilters.stockSort}
                onChange={(val) => setInventoryFilters({ ...inventoryFilters, stockSort: val })}
                options={[
                  { value: 'name_asc', label: 'Nomi bo‘yicha (A-Z)' },
                  { value: 'name_desc', label: 'Nomi bo‘yicha (Z-A)' },
                  { value: 'qty_desc', label: 'Qoldiq: Ko‘pdan ozga' },
                  { value: 'qty_asc', label: 'Qoldiq: Ozdan ko‘pga' },
                  { value: 'price_desc', label: 'Tan narx: Qimmatdan' },
                  { value: 'price_asc', label: 'Tan narx: Arzondan' },
                ]}
                size="md"
                style={{ minWidth: 190 }}
              />
            </div>

            {/* Clear filters button */}
            {hasActiveStockFilters && (
              <button
                type="button"
                onClick={resetInventoryFilters}
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
                <span>Tozalash</span>
              </button>
            )}

            <div
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              Topildi: <strong style={{ color: 'var(--text-primary)' }}>{filteredStock.length}</strong> ta tovar
            </div>
        </div>
      )}

      {/* Filter & Info Bar for Deficits Tab */}
      {activeTab === 'deficits' && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--bg-card)',
          }}
        >
          {/* Explanation banner */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--accent-rose, #ef4444)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Kamchiliklar mezoni:</strong> So‘nggi 30 kun ichida kamida <strong style={{ color: 'var(--primary)' }}>10 ta sotilgan</strong> va ayni paytda ombordagi qoldig‘i <strong style={{ color: 'var(--accent-rose, #ef4444)' }}>5 yoki undan kam qolgan (≤5)</strong> tovarlar. Yangi tovar kirimi qilinib, qoldiq 5 tadan oshsa, tovar ushbu ro‘yxatdan avtomatik ravishda chiqib ketadi.
            </div>
          </div>

          {/* Row: Search & Refresh */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
                placeholder="Kamchilik tovar nomi, kodi yoki shtrix-kodi bo‘yicha izlash..."
                value={deficitSearch}
                onChange={(e) => setDeficitSearch(e.target.value)}
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

            {deficitSearch && (
              <button
                type="button"
                onClick={() => setDeficitSearch('')}
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
                <span>Tozalash</span>
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Kamchiliklar: <strong style={{ color: 'var(--accent-rose, #ef4444)' }}>{deficitsList.length}</strong> ta tovar
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar for Movements Tab */}
      {activeTab === 'movements' && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--bg-card)',
          }}
        >
          {/* Row 1: Search, Movement Type, Reset */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
                placeholder="Tovar nomi yoki harakat izohi bo‘yicha izlash..."
                value={inventoryFilters.movementSearch}
                onChange={(e) => setInventoryFilters({ ...inventoryFilters, movementSearch: e.target.value })}
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

            {/* Movement Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Harakat turi:</span>
              <CustomSelect
                value={inventoryFilters.movementType}
                onChange={(val) => setInventoryFilters({ ...inventoryFilters, movementType: val })}
                options={[
                  { value: 'all', label: 'Barcha harakatlar' },
                  { value: 'kirim', label: 'Kirim (Intake)' },
                  { value: 'sotuv', label: 'Sotuv (Sale)' },
                  { value: 'mijoz_qaytardi', label: 'Mijoz qaytardi' },
                  { value: 'yetkazib_beruvchiga_qaytarish', label: 'Yetkazib beruvchiga qaytarish' },
                  { value: 'tuzatish', label: 'Tuzatish (Adjustment)' },
                  { value: 'isrofgarchilik', label: 'Isrofgarchilik (Write-off)' },
                ]}
                size="md"
                style={{ minWidth: 180 }}
              />
            </div>

            {/* Clear filters button */}
            {hasActiveMovementFilters && (
              <button
                type="button"
                onClick={resetInventoryFilters}
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
                <span>Tozalash</span>
              </button>
            )}
          </div>

          {/* Row 2: Date presets for Movements */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Sana:</span>
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'today', label: 'Bugun' },
              { id: 'yesterday', label: 'Kecha' },
              { id: 'week', label: 'Oxirgi 7 kun' },
              { id: 'month', label: 'Shu oy' },
            ].map((p) => {
              const isSelected = inventoryFilters.movementDate === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setInventoryFilters({ ...inventoryFilters, movementDate: p.id })}
                  style={{
                    padding: '5px 12px',
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
                  {p.label}
                </button>
              );
            })}

            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Topildi: <strong style={{ color: 'var(--text-primary)' }}>{filteredMovements.length}</strong> ta harakat
            </div>
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          {activeTab === 'stock' ? (
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Tovar Varianti</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tovar Kodi</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Filial</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Oxirgi Tan Narxi</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Mavjud Qoldiq</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>Amallar</th>
                </tr>
              </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : filteredStock.length > 0 ? (
                paginatedStock.map((item, idx) => {
                  const qty = Number(item.quantity ?? item.stock_quantity ?? 0);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: qty > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
                          <div>
                            <div>{item.product_name || item.name || `Variant #${item.product_variant || item.id}`}</div>
                            {item.category_name && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category_name}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {item.code ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.code}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Store size={13} color="var(--primary)" />
                          <span>{item.branch_name || activeBranch?.name || 'Asosiy'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {item.last_cost_price ? `${Number(item.last_cost_price).toLocaleString()} ${item.currency || 'UZS'}` : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 12,
                            fontWeight: 700,
                            background: qty > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: qty > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          }}
                        >
                          {formatQuantity(qty, item.unit)} {item.unit || 'dona'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenDetail(item)}
                            title="Batafsil ko‘rish"
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
                            <Info size={13} />
                            <span>Batafsil</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStockForPrice(item);
                              setPriceModalOpen(true);
                            }}
                            title="Filial narxlarini sozlash"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border-card)',
                              background: 'transparent',
                              color: 'var(--primary)',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Tag size={13} />
                            <span>Narx</span>
                          </button>
                          {qty > 0 && (
                            <button
                              onClick={() => {
                                setSelectedVariantForTransfer({
                                  id: item.product_variant?.id || item.product_variant || item.id,
                                  name: item.product_name || item.name,
                                  sku: item.code || item.sku,
                                  quantity: qty,
                                  unit: item.unit,
                                });
                                setTransferModalOpen(true);
                              }}
                              title="Boshqa filialga o‘tkazish"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-card)',
                                background: 'transparent',
                                color: 'var(--accent-emerald)',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <ArrowRightLeft size={13} />
                              <span>Transfer</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {hasActiveStockFilters ? 'Tanlangan filtrlar bo‘yicha tovarlar topilmadi' : 'Hozircha omborda qoldiqlar mavjud emas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : activeTab === 'transfers' ? (
          <div>
            {/* Filter toolbar */}
            <div
              style={{
                padding: '14px 20px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 6 }}>Holat:</span>
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'PENDING', label: 'Kutilmoqda' },
                  { id: 'COMPLETED', label: 'Qabul qilingan' },
                  { id: 'REJECTED', label: 'Rad etilgan' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTransferFilter(f.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: transferFilter === f.id ? '1px solid var(--primary)' : '1px solid var(--border-card)',
                      background: transferFilter === f.id ? 'var(--primary)' : 'transparent',
                      color: transferFilter === f.id ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: transferFilter === f.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Jami: <strong style={{ color: 'var(--text-primary)' }}>{transfers.length}</strong> ta transfer
              </div>
            </div>

            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>Transfer ID</th>
                  <th style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>Yo‘nalish (Filiallar)</th>
                  <th style={{ padding: '14px 18px' }}>Mahsulotlar</th>
                  <th style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>Yubordi</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>Holat</th>
                  <th style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>Sana</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                  </tr>
                ) : transfers.length > 0 ? (
                  transfers.map((tr) => {
                    const isPending = tr.status === 'PENDING';
                    const isCompleted = tr.status === 'COMPLETED';
                    const isRejected = tr.status === 'REJECTED';
                    const isIncoming = activeBranch && String(tr.to_branch?.id || tr.to_branch) === String(activeBranch.id);
                    const canAct = isPending && (isOwner || isAdmin || isIncoming);

                    return (
                      <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          #TR-{tr.id}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                            <span>{tr.from_branch_name}</span>
                            <ArrowRightLeft size={13} color="var(--text-muted)" />
                            <span style={{ color: 'var(--primary)' }}>{tr.to_branch_name}</span>
                          </div>
                          {tr.note && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                              Izoh: {tr.note}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(tr.items || []).map((it, idx) => (
                              <div key={idx} style={{ fontSize: 12.5 }}>
                                • {it.product_name || it.product_variant_name} — <strong>{it.quantity} {it.unit || 'dona'}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {tr.sent_by_name || 'Xodim'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: isPending
                                ? 'rgba(234, 179, 8, 0.15)'
                                : isCompleted
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              color: isPending
                                ? '#d97706'
                                : isCompleted
                                ? 'var(--accent-emerald)'
                                : 'var(--accent-rose)',
                            }}
                          >
                            {isPending ? 'Kutilmoqda' : isCompleted ? 'Qabul qilingan' : 'Rad etilgan'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(tr.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {canAct ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleAcceptTransfer(tr.id)}
                                className="btn btn-primary"
                                style={{ padding: '5px 10px', fontSize: 11.5, background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                                title="Qabul qilish"
                              >
                                <Check size={13} />
                                <span>Qabul</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectTransfer(tr.id)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: 11.5, color: 'var(--accent-rose)' }}
                                title="Rad etish"
                              >
                                <X size={13} />
                                <span>Rad</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Transferlar mavjud emas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'deficits' ? (
          <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Tovar Varianti</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tovar Kodi</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>30 Kundagi Sotuv</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Mavjud Qoldiq</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Holat</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : deficitsList.length > 0 ? (
                deficitsList.map((item) => {
                  const currentStock = Number(item.current_stock ?? 0);
                  const isZero = currentStock <= 0;
                  return (
                    <tr key={item.id || item.product_variant_id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isZero ? 'var(--accent-rose, #ef4444)' : '#f59e0b',
                            }}
                          />
                          <div>
                            <div>{item.full_name || item.product_name}</div>
                            {item.category_name && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {item.code ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.code}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#3b82f6',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {formatQuantity(item.total_sold_last_month, item.unit)} {item.unit || 'dona'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-xs)',
                            background: isZero ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isZero ? 'var(--accent-rose, #ef4444)' : '#d97706',
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          {formatQuantity(currentStock, item.unit)} {item.unit || 'dona'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: 11,
                            fontWeight: 700,
                            background: isZero ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isZero ? 'var(--accent-rose, #ef4444)' : '#d97706',
                          }}
                        >
                          <AlertTriangle size={12} />
                          {isZero ? 'Tugagan (0 dona)' : `Kam qolgan (${formatQuantity(currentStock, item.unit)} dona)`}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickIntake(item.product_variant_id || item.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: 'var(--primary-glow)',
                          }}
                        >
                          <PackagePlus size={14} />
                          <span>Kirim qilish</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 28 }}>✅</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>
                        {deficitSearch ? 'Qidiruv bo‘yicha kamchilik tovarlar topilmadi' : 'Ayni damda kamayib qolgan tovarlar mavjud emas!'}
                      </strong>
                      <span style={{ fontSize: 13, maxWidth: 460 }}>
                        {deficitSearch
                          ? 'Boshqa so‘z yoki kod bilan qidirib ko‘ring'
                          : 'Barcha talabgir tovarlar omborda 5 tadan ortiq yetarli miqdorda mavjud.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Harakat Turi</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tovar</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Yo‘nalish / Miqdor</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tan Narxi</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Izoh</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Sana</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
                </tr>
              ) : filteredMovements.length > 0 ? (
                paginatedMovements.map((m) => {
                  const isIn = m.direction === 'in';
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: isIn ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isIn ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                          {m.type_display || m.movement_type || m.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {m.product_name ? `${m.product_name} (${m.variant_name || 'Standart'})` : (m.product_variant_name || m.variant_name || `Variant #${m.product_variant}`)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: isIn ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        {isIn ? `+${formatQuantity(m.quantity, m.unit)}` : `-${formatQuantity(m.quantity, m.unit)}`} {m.unit || 'dona'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {m.cost_price ? `${Number(m.cost_price).toLocaleString()} ${m.currency || 'UZS'}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13 }}>{m.note || m.reason || '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {new Date(m.created_at).toLocaleString('uz-UZ')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {hasActiveMovementFilters ? 'Tanlangan filtrlar bo‘yicha harakatlar topilmadi' : 'Harakatlar tarixi mavjud emas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Pagination Controls for Stock Tab */}
      {activeTab === 'stock' && filteredStock.length > STOCK_PAGE_SIZE && (
        <Pagination
          currentPage={stockPage}
          totalItems={filteredStock.length}
          pageSize={STOCK_PAGE_SIZE}
          onPageChange={setStockPage}
        />
      )}

      {/* Pagination Controls for Movements Tab */}
      {activeTab === 'movements' && filteredMovements.length > MOVEMENT_PAGE_SIZE && (
        <Pagination
          currentPage={movementPage}
          totalItems={filteredMovements.length}
          pageSize={MOVEMENT_PAGE_SIZE}
          onPageChange={setMovementPage}
        />
      )}

      {/* Rapid POS-Style Barcode & Keyboard Stream Intake Workspace with Persisted Draft */}
      <RapidStockIntakeModal
        isOpen={intakeModalOpen}
        onClose={() => {
          setIntakeModalOpen(false);
          setSelectedVariantForIntake(null);
        }}
        onSuccess={() => {
          loadData();
          refreshDeficitCount();
        }}
        variants={variants}
        categories={categories}
        preselectedVariantId={selectedVariantForIntake}
      />

      {/* Modal 2: Qoldiqni To‘g‘rilash (Stock Adjust) */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Ombor Qoldig‘ini Tuzatish">
        <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tovar Varianti *
            </label>
            <CustomSelect
              value={selectedVariantId}
              onChange={(val) => setSelectedVariantId(val)}
              placeholder="Tovarni tanlang..."
              options={variants.map((v) => ({
                value: v.id,
                label: getVariantOptionLabel(v),
              }))}
              fullWidth
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Yo‘nalish *
              </label>
              <CustomSelect
                value={formDirection}
                onChange={(val) => setFormDirection(val)}
                options={[
                  { value: 'in', label: '+ Qo‘shish (Ortiqcha topildi)' },
                  { value: 'out', label: '- Ayirish (Kamomad/Yetishmovchilik)' },
                ]}
                fullWidth
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Miqdor (dona) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="Masalan: 5"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tuzatish Sababi / Izoh
            </label>
            <input
              type="text"
              placeholder="Masalan: Yillik inventarizatsiya natijasi"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSubmitting ? 'Saqlanmoqda...' : 'Tuzatishni Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Mijoz Qaytardi (Customer Return) */}
      <Modal isOpen={customerReturnModalOpen} onClose={() => setCustomerReturnModalOpen(false)} title="Mijozdan Tovarni Qaytarib Olish (Cheksiz)">
        <form onSubmit={handleCustomerReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93c5fa', fontSize: 13 }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: '#60a5fa' }} />
            <div>
              <strong>Eslatma:</strong> Bu amal ombor qoldig‘ini qo‘lda/cheksiz oshirish uchun xizmat qiladi.
              <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                Agar mijoz rasmiy sotuv cheki bo‘yicha tovarni qaytargan bo‘lsa, pulni kassadan chiqarish yoki mijoz qarzini to‘g‘ri kamaytirish uchun <strong>"Sotuvlar"</strong> bo‘limidagi chekdan <strong>"Bekor qilish (Void)"</strong> tugmasidan foydalaning.
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Qaytarilgan Variant *
            </label>
            <CustomSelect
              value={selectedVariantId}
              onChange={(val) => setSelectedVariantId(val)}
              placeholder="Tovarni tanlang..."
              options={variants.map((v) => ({
                value: v.id,
                label: getVariantOptionLabel(v),
              }))}
              fullWidth
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Qaytarilgan Miqdor (dona) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Masalan: 1"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Qaytarish Sababi / Chek raqami
            </label>
            <input
              type="text"
              placeholder="Masalan: Chek #582, o‘lchami to‘g‘ri kelmadi"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setCustomerReturnModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSubmitting ? 'Qabul qilinmoqda...' : 'Qaytarishni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Ta’minotchiga Qaytarish (Supplier Return) */}
      <Modal isOpen={supplierReturnModalOpen} onClose={() => setSupplierReturnModalOpen(false)} title="Ta’minotchiga Tovarni Qaytarish">
        <form onSubmit={handleSupplierReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Qaytariladigan Variant *
            </label>
            <CustomSelect
              value={selectedVariantId}
              onChange={(val) => setSelectedVariantId(val)}
              placeholder="Tovarni tanlang..."
              options={variants.map((v) => ({
                value: v.id,
                label: getVariantOptionLabel(v),
              }))}
              fullWidth
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Chiqariladigan Miqdor (dona) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Masalan: 10"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Izoh / Sabab / Ta’minotchi nomi
            </label>
            <input
              type="text"
              placeholder="Masalan: Zavod braki, Ta’minotchi bilan kelishildi"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setSupplierReturnModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSubmitting ? 'Chiqarilmoqda...' : 'Chiqarishni Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Write-off / Hisobdan chiqarish */}
      <Modal isOpen={writeOffModalOpen} onClose={() => setWriteOffModalOpen(false)} title="Hisobdan Chiqarish (Isrofgarchilik)">
        <form onSubmit={handleWriteOffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-xs)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-rose)', fontSize: 13 }}>
            Diqqat: Ushbu amal tovarlarni ombordan butunlay hisobdan chiqaradi va tizim auditiga qayd etiladi.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Hisobdan chiqariladigan Variant *
            </label>
            <CustomSelect
              value={selectedVariantId}
              onChange={(val) => setSelectedVariantId(val)}
              placeholder="Tovarni tanlang..."
              options={variants.map((v) => ({
                value: v.id,
                label: getVariantOptionLabel(v),
              }))}
              fullWidth
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Hisobdan chiqariladigan Miqdor *
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Masalan: 3"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Sabab (Buzilgan, Yaroqsiz, Siniq) *
            </label>
            <input
              type="text"
              placeholder="Masalan: Tashish paytida sindi"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setWriteOffModalOpen(false)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSubmitting ? 'Chiqarilmoqda...' : 'Hisobdan Chiqarish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Variant Stock Detail */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Ombor Qoldig‘i Tafsilotlari" maxWidth={500}>
        {selectedStockDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20,
                padding: '16px 18px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word',
                    lineHeight: 1.35,
                  }}
                >
                  {selectedStockDetail.product_name || selectedStockDetail.name || `Variant #${selectedStockDetail.product_variant || selectedStockDetail.id}`}
                </h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  SKU: {selectedStockDetail.sku || 'Mavjud emas'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  {selectedStockDetail.quantity ?? selectedStockDetail.stock_quantity ?? 0} dona
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Mavjud qoldiq</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Oxirgi Tan Narxi</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedStockDetail.last_cost_price ? `${Number(selectedStockDetail.last_cost_price).toLocaleString()} UZS` : 'Kiritilmagan'}
                </div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Kategoriya</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedStockDetail.category_name || 'Bosh kategoriya'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Yopish
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Filiallararo Tovar Transferi */}
      <StockTransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedVariantForTransfer(null);
        }}
        onSuccess={loadData}
        initialVariant={selectedVariantForTransfer}
      />

      {/* Modal: Filial Narxlarini Sozlash */}
      <StockPriceModal
        isOpen={priceModalOpen}
        onClose={() => {
          setPriceModalOpen(false);
          setSelectedStockForPrice(null);
        }}
        stockItem={selectedStockForPrice}
        onSuccess={loadData}
      />
    </div>
  );
}
