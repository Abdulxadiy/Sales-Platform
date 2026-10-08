import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ScanBarcode,
  Search,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { usePersistedState } from '../../hooks/usePersistedState';

const EMPTY_DRAFT = {
  supplier: '',
  invoiceNumber: '',
  note: '',
  items: [],
};

export default function RapidStockIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  variants = [],
  categories = [],
  preselectedVariantId = null,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  // Persisted Draft in localStorage: survives navigation, tab switches, and reloads
  const [draft, setDraft, resetDraft] = usePersistedState(
    'inventra_stock_intake_full_draft_v1',
    EMPTY_DRAFT
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAddedRowId, setLastAddedRowId] = useState(null);

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

  // Handle preselected variant if opened via "Quick Intake"
  useEffect(() => {
    if (isOpen && preselectedVariantId && variants.length > 0) {
      const match = variants.find((v) => String(v.id) === String(preselectedVariantId));
      if (match) {
        addItemToDraft(match);
      }
    }
  }, [isOpen, preselectedVariantId, variants]);

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

  // Add or increment item in draft
  const addItemToDraft = useCallback(
    (variant) => {
      if (!variant || !variant.id) return;

      const variantId = variant.id;
      const info = getVariantInfo(variant);
      const rowId = `row-${variantId}-${Date.now()}`;

      setDraft((prevDraft) => {
        const currentItems = Array.isArray(prevDraft?.items) ? prevDraft.items : [];
        const existingIdx = currentItems.findIndex((it) => String(it.variantId) === String(variantId));

        if (existingIdx >= 0) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <PackagePlus size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Tovar Kirimi (Tezkor Partiya Oqimi)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Shtrix-kod skaneri yoki klaviatura orqali tovarlarni bir zumda qabul qilish
              </p>
            </div>
          </div>

          {/* Draft Persistence Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
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
                gap: 5,
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--primary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Katalogga o‘tib yangi tovar yaratish (Qoralama o‘chmaydi)"
            >
              <Plus size={14} />
              <span>+ Yangi tovar yaratish</span>
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
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
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

        {/* Rapid Barcode & Autocomplete Search Bar */}
        <div style={{ position: 'relative' }}>
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
                padding: '3px 8px',
                background: 'var(--bg-chip)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                border: '1px solid var(--border-subtle)',
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
                  <th style={{ padding: '10px 12px', width: 40, color: 'var(--text-secondary)', fontWeight: 600 }}>№</th>
                  <th style={{ padding: '10px 12px', minWidth: 260, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tovar va Variant
                  </th>
                  <th style={{ padding: '10px 12px', width: 110, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                    Joriy qoldiq
                  </th>
                  <th style={{ padding: '10px 12px', width: 170, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Kirim miqdori *
                  </th>
                  <th style={{ padding: '10px 12px', width: 180, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tan narxi *
                  </th>
                  <th style={{ padding: '10px 12px', width: 150, color: 'var(--text-secondary)', fontWeight: 600 }}>
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
                          Yuqoridagi maydonda shtrix-kodni skanerlang yoki tovar nomini yozib{' '}
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

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isRecentlyAdded
                            ? 'rgba(59, 130, 246, 0.08)'
                            : idx % 2 === 1
                            ? 'rgba(255, 255, 255, 0.015)'
                            : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {idx + 1}
                        </td>

                        {/* Product & Variant details */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                                {snap.name || 'Tovar'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {snap.sub && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: '1px 5px',
                                      background: 'var(--bg-chip)',
                                      borderRadius: 4,
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
                                    {snap.sub}
                                  </span>
                                )}
                                {snap.barcode && (
                                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                    #{snap.barcode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: snap.stock > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: snap.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            }}
                          >
                            {snap.stock ?? 0} {unit}
                          </span>
                        </td>

                        {/* Quantity Stepper & Input */}
                        <td style={{ padding: '8px 12px' }}>
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
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              ref={(el) => (rowInputRefs.current[`${item.id}_cost`] = el)}
                              type="number"
                              step={currency === 'USD' ? '0.01' : '1'}
                              min="0"
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
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: lineTotal > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {lineTotal.toLocaleString()} {currency}
                        </td>

                        {/* Remove Action */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
                            }}
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
  );
}
