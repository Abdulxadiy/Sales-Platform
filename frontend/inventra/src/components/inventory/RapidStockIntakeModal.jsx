import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ScanBarcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  CalendarDays,
  Tag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Truck,
  FileText,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import PriceInput from '../common/PriceInput';
import CameraBarcodeScanner from '../common/CameraBarcodeScanner';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useTenant } from '../../context/TenantContext';

const EMPTY_DRAFT = {
  supplier: '',
  invoiceNumber: '',
  note: '',
  items: [],
};

// Helper: Calculate future expiration date string YYYY-MM-DD from months delta
const getPresetDate = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Analyze expiration status and calculate remaining period
const getExpiryStatus = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      type: 'expired',
      label: `Muddati o‘tgan (${Math.abs(diffDays)} kun oldin)`,
      bg: 'rgba(239, 68, 68, 0.15)',
      color: 'var(--accent-rose, #ef4444)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      icon: <AlertCircle size={12} />,
      tooltip: 'Ushbu partiyaning yaroqlilik muddati tugagan!',
    };
  }
  if (diffDays <= 30) {
    return {
      type: 'warning',
      label: `${diffDays} kun qoldi`,
      bg: 'rgba(245, 158, 11, 0.15)',
      color: 'var(--accent-amber, #f59e0b)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      icon: <AlertTriangle size={12} />,
      tooltip: 'Yaroqlilik muddati 1 oydan kam qoldi',
    };
  }
  if (diffDays <= 365) {
    const months = Math.round(diffDays / 30.5);
    return {
      type: 'ok',
      label: `${months} oy yaroqli`,
      bg: 'rgba(16, 185, 129, 0.12)',
      color: 'var(--accent-emerald, #10b981)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
      icon: <CheckCircle2 size={12} />,
      tooltip: `Yaroqlilik sanasi: ${dateStr}`,
    };
  }
  const years = (diffDays / 365.25).toFixed(1);
  return {
    type: 'ok',
    label: `${years} yil yaroqli`,
    bg: 'rgba(16, 185, 129, 0.12)',
    color: 'var(--accent-emerald, #10b981)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
    icon: <CheckCircle2 size={12} />,
    tooltip: `Yaroqlilik sanasi: ${dateStr}`,
  };
};

export default function RapidStockIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  variants = [],
  preselectedVariantId = null,
}) {
  const toast = useToast();
  const { activeTenant } = useTenant();
  const confirm = useConfirm();
  const navigate = useNavigate();

  // Persisted Draft in localStorage: survives navigation, tab switches, and reloads
  const [draft, setDraft, resetDraft] = usePersistedState(
    `inventra_stock_intake_full_draft_v1:${activeTenant?.id || 'pending'}`,
    EMPTY_DRAFT
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAddedRowId, setLastAddedRowId] = useState(null);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  const searchInputRef = useRef(null);
  const rowInputRefs = useRef({});
  const dropdownRef = useRef(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    } else {
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Helper to get clean variant details
  const getVariantInfo = useCallback((variant) => {
    const name = variant.product_name || variant.name || 'Noma’lum tovar';
    const sub =
      variant.name && variant.name !== variant.product_name && variant.name.toLowerCase() !== 'standart'
        ? variant.name
        : '';
    const code = variant.code || variant.sku || '';
    const barcode = variant.barcode || '';
    const unit = variant.unit || 'dona';
    const currency = variant.currency || 'UZS';
    const stock = Number(variant.stock_quantity ?? variant.quantity ?? 0);
    const costPrice = variant.cost_price || variant.base_cost || '';

    return { name, sub, code, barcode, unit, currency, stock, costPrice };
  }, []);

  // Add or increment item in draft
  const addItemToDraft = useCallback(
    (variant, forceNew = false) => {
      if (!variant || !variant.id) return;

      const variantId = variant.id;
      const info = getVariantInfo(variant);
      const rowId = `row-${variantId}-${crypto.randomUUID()}`;

      setDraft((prevDraft) => {
        const currentItems = Array.isArray(prevDraft?.items) ? prevDraft.items : [];
        const existingIdx = currentItems.findIndex((it) => String(it.variantId) === String(variantId));

        if (existingIdx >= 0 && !forceNew) {
          // Increment quantity if already exists
          const updatedItems = [...currentItems];
          const currQty = parseFloat(updatedItems[existingIdx].quantity) || 0;
          const nextQty = currQty + 1;
          updatedItems[existingIdx] = {
            ...updatedItems[existingIdx],
            quantity: String(nextQty),
          };
          setLastAddedRowId(updatedItems[existingIdx].id);

          setTimeout(() => {
            const input = rowInputRefs.current[`${updatedItems[existingIdx].id}_qty`];
            if (input) {
              input.focus();
              input.select();
            }
          }, 50);

          return { ...prevDraft, items: updatedItems };
        } else {
          // Add new item row
          const newItem = {
            id: rowId,
            variantId: variant.id,
            variantSnapshot: {
              id: variant.id,
              name: info.name,
              sub: info.sub,
              code: info.code,
              barcode: info.barcode,
              unit: info.unit,
              currency: info.currency,
              stock: info.stock,
            },
            quantity: '1',
            cost_price: info.costPrice ? String(info.costPrice) : '',
            note: '',
            batch_code: '',
            expires_on: '',
          };

          setLastAddedRowId(rowId);

          setTimeout(() => {
            const input = rowInputRefs.current[`${rowId}_qty`];
            if (input) {
              input.focus();
              input.select();
            }
          }, 50);

          return {
            ...prevDraft,
            items: [newItem, ...currentItems],
          };
        }
      });

      setSearchQuery('');
      setIsDropdownOpen(false);
      setHighlightedIndex(0);
      toast.success(`"${info.name}" kirim jadvaliga qo‘shildi`);
    },
    [getVariantInfo, setDraft, toast]
  );

  // Handle preselected variant if opened via "Quick Intake"
  useEffect(() => {
    if (isOpen && preselectedVariantId && variants.length > 0) {
      const match = variants.find((v) => String(v.id) === String(preselectedVariantId));
      if (match) {
        addItemToDraft(match);
      }
    }
  }, [isOpen, preselectedVariantId, variants, addItemToDraft]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered variants for autocomplete
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return variants
      .filter((v) => {
        const name = (v.product_name || v.name || '').toLowerCase();
        const barcode = (v.barcode || '').toLowerCase();
        const code = (v.code || '').toLowerCase();
        const sku = (v.sku || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || code.includes(q) || sku.includes(q);
      })
      .slice(0, 10);
  }, [variants, searchQuery]);

  // Handle Search Input KeyDown (Barcode scanner or manual autocomplete)
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen && searchResults.length > 0) {
        setIsDropdownOpen(true);
      }
      setHighlightedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Check exact barcode match first
      const exactMatch = variants.find(
        (v) =>
          v.barcode?.toLowerCase() === q ||
          v.code?.toLowerCase() === q ||
          v.sku?.toLowerCase() === q
      );

      if (exactMatch) {
        addItemToDraft(exactMatch);
        return;
      }

      // 2. If dropdown item is highlighted
      if (searchResults.length > 0 && searchResults[highlightedIndex]) {
        addItemToDraft(searchResults[highlightedIndex]);
        return;
      }

      // 3. If exact 1 match
      if (searchResults.length === 1) {
        addItemToDraft(searchResults[0]);
        return;
      }

      toast.info('Bunday shtrix-kod yoki tovar topilmadi. Qidiruvni aniqlashtiring');
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Camera Barcode Scanner detection handler
  const handleCameraBarcodeScan = useCallback(
    (code) => {
      const q = (code || '').trim().toLowerCase();
      if (!q) return;

      const exactMatch = variants.find(
        (v) =>
          v.barcode?.toLowerCase() === q ||
          v.code?.toLowerCase() === q ||
          v.sku?.toLowerCase() === q
      );

      if (exactMatch) {
        addItemToDraft(exactMatch);
        toast.success(`"${exactMatch.product_name || exactMatch.name}" kirim jadvaliga qo‘shildi`);
      } else {
        setSearchQuery(code);
        setIsDropdownOpen(true);
        toast.info(`"${code}" shtrix-kodi bo‘yicha tovar qidirilmoqda...`);
      }
    },
    [variants, addItemToDraft, toast]
  );

  // Row update handlers
  const handleUpdateItem = (id, field, value) => {
    setDraft((prevDraft) => {
      const currentItems = Array.isArray(prevDraft?.items) ? prevDraft.items : [];
      const updated = currentItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prevDraft, items: updated };
    });
  };

  const handleStepQuantity = (id, delta) => {
    setDraft((prevDraft) => {
      const currentItems = Array.isArray(prevDraft?.items) ? prevDraft.items : [];
      const updated = currentItems.map((item) => {
        if (item.id === id) {
          const curr = parseFloat(item.quantity) || 0;
          const next = Math.max(1, curr + delta);
          return { ...item, quantity: String(next) };
        }
        return item;
      });
      return { ...prevDraft, items: updated };
    });
  };

  const handleRemoveItem = (id) => {
    setDraft((prevDraft) => {
      const currentItems = Array.isArray(prevDraft?.items) ? prevDraft.items : [];
      return {
        ...prevDraft,
        items: currentItems.filter((it) => it.id !== id),
      };
    });
  };

  // Clear draft with confirmation
  const handleClearDraft = async () => {
    const hasData =
      (draft.items && draft.items.length > 0) ||
      draft.supplier ||
      draft.invoiceNumber ||
      draft.note;

    if (!hasData) {
      resetDraft();
      return;
    }

    const isConfirmed = await confirm({
      title: 'Qoralamani tozalash',
      message:
        'Haqiqatan ham barcha to‘plangan tovarlar va kiritilgan qoralama ma’lumotlarini tozalashni xohlaysizmi?',
      confirmText: 'Ha, tozalash',
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      resetDraft();
      toast.info('Kirim qoralamasi tozalandi');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  // Live Summary calculation
  const summary = useMemo(() => {
    const items = Array.isArray(draft?.items) ? draft.items : [];
    let totalQuantity = 0;
    let totalSumUZS = 0;
    let totalSumUSD = 0;

    items.forEach((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const cost = parseFloat(it.cost_price) || 0;
      const currency = it.variantSnapshot?.currency || 'UZS';

      totalQuantity += qty;
      if (currency === 'USD') {
        totalSumUSD += qty * cost;
      } else {
        totalSumUZS += qty * cost;
      }
    });

    return {
      distinctCount: items.length,
      totalQuantity,
      totalSumUZS,
      totalSumUSD,
    };
  }, [draft]);

  // Batch Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const items = Array.isArray(draft?.items) ? draft.items : [];

    if (items.length === 0) {
      toast.warning('Kirim qilish uchun kamida bitta tovar kiriting');
      if (searchInputRef.current) searchInputRef.current.focus();
      return;
    }

    // Validate fields
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name = it.variantSnapshot?.name || `${i + 1}-tovar`;
      const qty = parseFloat(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        toast.warning(`"${name}" miqdori noto‘g‘ri kiritilgan`);
        const input = rowInputRefs.current[`${it.id}_qty`];
        if (input) input.focus();
        return;
      }
      const cost = parseFloat(it.cost_price);
      if (isNaN(cost) || cost < 0) {
        toast.warning(`"${name}" tan narxi noto‘g‘ri kiritilgan`);
        const input = rowInputRefs.current[`${it.id}_cost`];
        if (input) input.focus();
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await inventoryApi.batchStockIntake({
        supplier: (draft.supplier || '').trim(),
        faktura_number: (draft.invoiceNumber || '').trim(),
        note: (draft.note || '').trim(),
        items: items.map((it) => ({
          product_variant_id: parseInt(it.variantId, 10),
          quantity: parseFloat(it.quantity),
          cost_price: parseFloat(it.cost_price),
          note: it.note ? it.note.trim() : '',
          batch_code: (it.batch_code || '').trim(),
          expires_on: it.expires_on || null,
        })),
      });

      toast.success(
        `Kirim muvaffaqiyatli qabul qilindi! (${items.length} xil tovar, ${summary.totalQuantity} dona)`
      );

      // Successfully submitted: clear draft
      resetDraft();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Tovar partiyasini qabul qilishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = Array.isArray(draft?.items) ? draft.items : [];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth={1120}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Top Header with Title and Auto-Saved Draft status */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #f59e0b)',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)',
              }}
            >
              <PackagePlus size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Tovar Kirimi (Tezkor Partiya Oqimi)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Kamera skaneri, shtrix-kod yoki klaviatura orqali tovarlar partiyasini bir zumda qabul qilish
              </p>
            </div>
          </div>

          {/* Draft Persistence Badge & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: items.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-chip)',
                color: items.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                border: items.length > 0 ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
              }}
              title="Siz sahifadan chiqib ketsangiz ham, barcha kiritilgan ma'lumotlar saqlanadi"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: items.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  boxShadow: items.length > 0 ? '0 0 6px var(--accent-emerald)' : 'none',
                }}
              />
              <span>
                {items.length > 0
                  ? `Qoralama saqlandi (${items.length} ta tovar)`
                  : 'Qoralama avtomatik saqlanadi'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/catalog?new=1&intake=1');
                toast.info('Qoralamangiz saqlandi. Yangi tovar qo‘shib qaytishingiz mumkin.');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--primary, #f59e0b)',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Katalogga o‘tib yangi tovar yaratish (Qoralama o‘chmaydi)"
            >
              <Plus size={14} />
              <span>Yangi tovar yaratish</span>
            </button>
          </div>
        </div>

        {/* Batch Metadata Header: Ta'minotchi, Faktura raqami, Izoh */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            background: 'var(--bg-card)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
              <Truck size={13} style={{ color: 'var(--primary, #f59e0b)' }} />
              Ta’minotchi (Yetkazib beruvchi)
            </label>
            <input
              type="text"
              placeholder="Masalan: Artel Zavod yoki Baza MCHJ"
              value={draft.supplier || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, supplier: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
              <FileText size={13} style={{ color: 'var(--primary, #f59e0b)' }} />
              Faktura / Nakladnoy raqami
            </label>
            <input
              type="text"
              placeholder="Masalan: FAK-2026-904"
              value={draft.invoiceNumber || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
              <MessageSquare size={13} style={{ color: 'var(--primary, #f59e0b)' }} />
              Umumiy izoh
            </label>
            <input
              type="text"
              placeholder="Masalan: 1-partiya kirimi, to‘lov kutilmoqda"
              value={draft.note || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Rapid Barcode & Autocomplete Search Bar + Camera Scanner Trigger */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: isDropdownOpen ? '2px solid var(--primary)' : '1px solid var(--border-card)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 14px',
                gap: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'border 0.15s ease',
              }}
            >
              <ScanBarcode size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  setHighlightedIndex(0);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsDropdownOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Shtrix-kodni skanerlang yoki tovar nomi / artikul / model bo‘yicha qidiring..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  padding: '6px 0',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              )}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'var(--bg-chip)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Enter ↵</span>
                <span style={{ color: 'var(--text-muted)' }}>qo‘shish</span>
              </div>
            </div>

            {/* Autocomplete Dropdown Popover */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--bg-modal, var(--bg-surface))',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
                zIndex: 9999,
                maxHeight: '340px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Topilgan tovarlar ({searchResults.length} ta)</span>
                <span>↑ ↓ tugmalari orqali tanlang va Enter bosing</span>
              </div>

              {searchResults.map((variant, index) => {
                const info = getVariantInfo(variant);
                const isSelected = index === highlightedIndex;

                return (
                  <div
                    key={variant.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => addItemToDraft(variant)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: 'var(--bg-chip)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {info.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {info.name}
                          </span>
                          {info.sub && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: '1px 5px',
                                background: 'var(--bg-chip)',
                                borderRadius: 4,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {info.sub}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          {info.barcode && (
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              #{info.barcode}
                            </span>
                          )}
                          {info.code && (
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--primary)' }}>
                              [{info.code}]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Joriy qoldiq</div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: info.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          }}
                        >
                          {info.stock} {info.unit}
                        </div>
                      </div>

                      {info.costPrice ? (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Oxirgi tan narxi</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {Number(info.costPrice).toLocaleString()} {info.currency}
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: isSelected ? 'var(--primary)' : 'var(--bg-chip)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        + Qo‘shish
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Camera Barcode Scanner Trigger Button */}
        <button
          type="button"
          onClick={() => setCameraScannerOpen(true)}
          title="Telefon / kompyuter kamerasi orqali shtrix-kod skanerlash"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--primary, #f59e0b)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.color = 'var(--primary-foreground, #000)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
            e.currentTarget.style.color = 'var(--primary, #f59e0b)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Camera size={18} />
          <span>Kamera skaneri</span>
        </button>
      </div>

        {/* Stream Table for Batch Intake */}
        <div
          style={{
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="table-responsive" style={{ maxHeight: '420px', overflow: 'auto' }}>
            <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead
                style={{
                  background: 'var(--bg-card)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  borderBottom: '1px solid var(--border-card)',
                }}
              >
                <tr>
                  <th style={{ padding: '10px 12px', width: 36, color: 'var(--text-secondary)', fontWeight: 600 }}>№</th>
                  <th style={{ padding: '10px 12px', minWidth: 320, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tovar va Partiya / Yaroqlilik ma’lumotlari
                  </th>
                  <th style={{ padding: '10px 12px', width: 100, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                    Joriy qoldiq
                  </th>
                  <th style={{ padding: '10px 12px', width: 165, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Kirim miqdori *
                  </th>
                  <th style={{ padding: '10px 12px', width: 175, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tan narxi *
                  </th>
                  <th style={{ padding: '10px 12px', width: 140, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Jami qiymat
                  </th>
                  <th style={{ padding: '10px 12px', width: 44, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <ScanBarcode size={36} style={{ opacity: 0.4, color: 'var(--text-muted)' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Hozircha tovarlar qo‘shilmadi
                        </div>
                        <div style={{ fontSize: 12, maxWidth: 440, lineHeight: 1.5 }}>
                          Yuqoridagi maydonda kamera yoki shtrix-kod skaneri orqali tovar nomini yozib{' '}
                          <kbd style={{ padding: '2px 5px', background: 'var(--bg-chip)', borderRadius: 4 }}>Enter</kbd>{' '}
                          bosing. Tovar avtomatik ushbu jadvalga qo‘shiladi.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const snap = item.variantSnapshot || {};
                    const unit = snap.unit || 'dona';
                    const currency = snap.currency || 'UZS';
                    const lineQty = parseFloat(item.quantity) || 0;
                    const lineCost = parseFloat(item.cost_price) || 0;
                    const lineTotal = lineQty * lineCost;
                    const isRecentlyAdded = item.id === lastAddedRowId;
                    const expiryStatus = getExpiryStatus(item.expires_on);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isRecentlyAdded
                            ? 'rgba(245, 158, 11, 0.08)'
                            : idx % 2 === 1
                            ? 'rgba(255, 255, 255, 0.015)'
                            : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontWeight: 600, verticalAlign: 'top' }}>
                          {idx + 1}
                        </td>

                        {/* Product, Variant, Batch & Expiration sub-panel */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <div>
                            {/* Product Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                {snap.name || 'Tovar'}
                              </span>
                              {snap.sub && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: '1px 6px',
                                    background: 'var(--bg-chip)',
                                    borderRadius: 4,
                                    color: 'var(--primary, #f59e0b)',
                                    fontWeight: 600,
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {snap.sub}
                                </span>
                              )}
                              {snap.barcode && (
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '1px 5px', borderRadius: 4 }}>
                                  #{snap.barcode}
                                </span>
                              )}
                              {snap.code && (
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                  [{snap.code}]
                                </span>
                              )}
                            </div>

                            {/* Partiya va Yaroqlilik Muddati Control Box */}
                            <div
                              style={{
                                marginTop: 8,
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-xs)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                              }}
                            >
                              {/* Input Row: Partiya raqami + Yaroqlilik muddati + Yangi partiya */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {/* Partiya raqami */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: '1 1 130px' }}>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    <Tag size={12} style={{ color: 'var(--primary, #f59e0b)' }} />
                                    Partiya:
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Partiya / Seriya (ixtiyoriy)"
                                    value={item.batch_code || ''}
                                    maxLength={80}
                                    onChange={(e) => handleUpdateItem(item.id, 'batch_code', e.target.value)}
                                    style={{
                                      flex: 1,
                                      minWidth: 90,
                                      padding: '5px 8px',
                                      fontSize: 12,
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      background: 'var(--bg-input)',
                                      color: 'var(--text-primary)',
                                      outline: 'none',
                                    }}
                                  />
                                </div>

                                {/* Yaroqlilik muddati */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: '1 1 200px' }}>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    <CalendarDays size={12} style={{ color: 'var(--primary, #f59e0b)' }} />
                                    Yaroqlilik muddati:
                                  </label>
                                  <input
                                    type="date"
                                    value={item.expires_on || ''}
                                    min="2020-01-01"
                                    max="2045-12-31"
                                    onChange={(e) => handleUpdateItem(item.id, 'expires_on', e.target.value)}
                                    title="Partiyaning yaroqlilik muddati (tugash sanasi)"
                                    style={{
                                      padding: '5px 8px',
                                      fontSize: 12,
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--border-subtle)',
                                      background: 'var(--bg-input)',
                                      color: 'var(--text-primary)',
                                      outline: 'none',
                                      cursor: 'pointer',
                                    }}
                                  />

                                  {/* Status indicator badge */}
                                  {expiryStatus && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: 4,
                                        background: expiryStatus.bg,
                                        color: expiryStatus.color,
                                        border: `1px solid ${expiryStatus.borderColor}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={expiryStatus.tooltip}
                                    >
                                      {expiryStatus.icon}
                                      <span>{expiryStatus.label}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Yangi partiya qo'shish */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const match = variants.find((v) => String(v.id) === String(item.variantId));
                                    if (match) addItemToDraft(match, true);
                                  }}
                                  title="Aynan shu tovardan boshqa partiya yoki muddati boshqa yangi qator ochish"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 10px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-xs)',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.28)',
                                    color: 'var(--primary, #f59e0b)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--primary)';
                                    e.currentTarget.style.color = 'var(--primary-foreground, #000)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                    e.currentTarget.style.color = 'var(--primary, #f59e0b)';
                                  }}
                                >
                                  <Layers size={12} />
                                  <span>+ Yangi partiya</span>
                                </button>
                              </div>

                              {/* Quick Duration Presets for Yaroqlilik Muddati */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={11} /> Tezkor muddat:
                                </span>
                                {[
                                  { label: '+1 oy', months: 1 },
                                  { label: '+3 oy', months: 3 },
                                  { label: '+6 oy', months: 6 },
                                  { label: '+1 yil', months: 12 },
                                  { label: '+2 yil', months: 24 },
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handleUpdateItem(item.id, 'expires_on', getPresetDate(preset.months))}
                                    style={{
                                      padding: '2px 7px',
                                      fontSize: 10,
                                      fontWeight: 600,
                                      borderRadius: 4,
                                      border: '1px solid var(--border-subtle)',
                                      background: 'var(--bg-input)',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      transition: 'all 0.1s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = 'var(--primary)';
                                      e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = 'var(--text-secondary)';
                                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                    }}
                                  >
                                    {preset.label}
                                  </button>
                                ))}

                                {item.expires_on && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(item.id, 'expires_on', '')}
                                    style={{
                                      padding: '2px 7px',
                                      fontSize: 10,
                                      fontWeight: 600,
                                      borderRadius: 4,
                                      border: '1px dashed var(--accent-rose)',
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: 'var(--accent-rose)',
                                      cursor: 'pointer',
                                    }}
                                    title="Yaroqlilik muddatini tozalash (muddatsiz qilish)"
                                  >
                                    Muddatsiz ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td style={{ padding: '12px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: snap.stock > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: snap.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                              display: 'inline-block',
                            }}
                          >
                            {snap.stock ?? 0} {unit}
                          </span>
                        </td>

                        {/* Quantity Stepper & Input */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(item.id, -1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-chip)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="1 taga kamaytirish"
                            >
                              <Minus size={13} />
                            </button>

                            <input
                              ref={(el) => (rowInputRefs.current[`${item.id}_qty`] = el)}
                              type="number"
                              step={unit === 'dona' ? '1' : '0.001'}
                              min={unit === 'dona' ? '1' : '0.001'}
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                              required
                              style={{
                                width: 75,
                                padding: '6px 8px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-card)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontWeight: 700,
                                textAlign: 'center',
                                outline: 'none',
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleStepQuantity(item.id, 1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-chip)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="1 taga oshirish"
                            >
                              <Plus size={13} />
                            </button>

                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
                          </div>
                        </td>

                        {/* Cost Price */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <PriceInput
                              ref={(el) => (rowInputRefs.current[`${item.id}_cost`] = el)}
                              placeholder="0"
                              value={item.cost_price}
                              onChange={(e) => handleUpdateItem(item.id, 'cost_price', e.target.value)}
                              required
                              style={{
                                width: 110,
                                padding: '6px 8px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-card)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currency}</span>
                          </div>
                        </td>

                        {/* Line Total */}
                        <td style={{ padding: '12px 12px', fontWeight: 700, color: lineTotal > 0 ? 'var(--primary, #f59e0b)' : 'var(--text-muted)', verticalAlign: 'top' }}>
                          {lineTotal.toLocaleString()} {currency}
                        </td>

                        {/* Remove Action */}
                        <td style={{ padding: '12px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-rose)',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.8,
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                            title="Qatorni o‘chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Summary Footer Card */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Partiya tarkibi: </span>
              <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{summary.distinctCount} xil tovar</strong>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Jami kirim miqdori: </span>
              <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{summary.totalQuantity.toLocaleString()} dona</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Jami partiya summasi:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {summary.totalSumUZS > 0 && (
                <strong style={{ fontSize: 16, color: 'var(--primary)', fontWeight: 800 }}>
                  {summary.totalSumUZS.toLocaleString()} UZS
                </strong>
              )}
              {summary.totalSumUSD > 0 && (
                <strong style={{ fontSize: 16, color: 'var(--accent-emerald)', fontWeight: 800 }}>
                  {summary.totalSumUSD.toLocaleString()} USD
                </strong>
              )}
              {summary.totalSumUZS === 0 && summary.totalSumUSD === 0 && (
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>0 UZS</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions: Clear Draft, Cancel, Submit */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
          }}
        >
          <div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearDraft}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-rose)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '6px 0',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={13} />
                <span>Qoralamani tozalash</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Bekor qilish
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: items.length > 0 ? 'var(--primary)' : 'var(--border-subtle)',
                color: items.length > 0 ? 'var(--primary-foreground)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 13,
                cursor: items.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
                boxShadow: items.length > 0 ? '0 4px 14px rgba(245, 158, 11, 0.28)' : 'none',
              }}
            >
              <PackagePlus size={16} />
              <span>
                {isSubmitting
                  ? 'Qabul qilinmoqda...'
                  : items.length > 0
                  ? `Partiyani Tasdiqlash (${items.length} ta tovar)`
                  : 'Kirimni Tasdiqlash'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Camera Barcode Scanner Modal */}
    <CameraBarcodeScanner
      isOpen={cameraScannerOpen}
      onClose={() => setCameraScannerOpen(false)}
      onScan={handleCameraBarcodeScan}
      title="Tovar Kirimi Shtrix-kod Skaneri"
    />
    </>
  );
}
