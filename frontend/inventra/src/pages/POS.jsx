import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  Banknote,
  Receipt,
  Zap,
  ShoppingBag,
  Printer,
  FileText,
} from 'lucide-react';
import { catalogApi, salesApi } from '../api/client';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import ReceiptSlip, { printReceiptSlip } from '../components/common/ReceiptSlip';
import InvoiceA4Modal from '../components/common/InvoiceA4Modal';
import Pagination from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useBranch } from '../context/BranchContext';
import { usePersistedState } from '../hooks/usePersistedState';

export default function POS() {
  const toast = useToast();
  const confirm = useConfirm();
  const { activeBranch } = useBranch();
  const searchInputRef = useRef(null);

  // Catalog State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allVariants, setAllVariants] = useState([]);
  const allVariantsRef = useRef([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [posPage, setPosPage] = useState(1);
  const POS_PAGE_SIZE = 20;

  // 1-Narx (Partner Price) Switcher - Persisted
  const [isPartnerSale, setIsPartnerSale] = usePersistedState('inventra_pos_partner_sale', false);

  // Cart State - Persisted across routes and refreshes
  const [cart, setCart, resetCart] = usePersistedState('inventra_pos_cart', []);

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, DEBT
  const [paidAmountUZS, setPaidAmountUZS] = useState('');
  const [paidAmountUSD, setPaidAmountUSD] = useState('');
  const [counterparties, setCounterparties] = useState([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  // Receipt Modal State (supports multiple sales from split dual-currency checkout)
  const [completedSales, setCompletedSales] = useState([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [posInvoiceModalOpen, setPosInvoiceModalOpen] = useState(false);
  const [selectedPosInvoiceSale, setSelectedPosInvoiceSale] = useState(null);
  const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState('inventra_receipt_paper_width', '58mm');

  const handleOpenPosInvoice = (saleToOpen = null) => {
    const target = saleToOpen || (completedSales && completedSales.length > 0 ? completedSales[0] : null);
    if (target) {
      setSelectedPosInvoiceSale(target);
      setPosInvoiceModalOpen(true);
    }
  };

  const formatQuantity = (qty, unit = 'dona') => {
    const num = Number(qty || 0);
    if (unit === 'dona' || num % 1 === 0) {
      return `${Math.round(num)}`;
    }
    return `${parseFloat(num.toFixed(3))}`;
  };

  const formatPrice = (val, cur = 'UZS') => {
    const num = Number(val || 0);
    if (cur === 'USD') {
      return `$${num.toLocaleString()}`;
    }
    return `${num.toLocaleString()} UZS`;
  };

  const getDefaultPrice = useCallback((variant, partner = isPartnerSale) => {
    if (partner) {
      return Number(variant.price_partner || variant.price_recommended || variant.price_min || 0);
    }
    return Number(variant.price_recommended || variant.price_min || 0);
  }, [isPartnerSale]);

  const getItemEffectivePrice = useCallback((item) => {
    if (item.customPrice !== undefined && item.customPrice !== '') {
      return Number(item.customPrice);
    }
    return getDefaultPrice(item.variant, isPartnerSale);
  }, [getDefaultPrice, isPartnerSale]);

  const loadVariants = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = {};
      if (activeBranch?.id) params.branch_id = activeBranch.id;
      const res = await catalogApi.getVariants(params);
      const items = res.results || res;
      const list = Array.isArray(items) ? items : [];
      setAllVariants(list);
      allVariantsRef.current = list;
    } catch {
      setAllVariants([]);
      allVariantsRef.current = [];
    } finally {
      setLoadingProducts(false);
    }
  }, [activeBranch?.id]);

  // Load initial categories and variants
  useEffect(() => {
    catalogApi.getCategories().then((res) => {
      const list = res.results || res;
      setCategories(Array.isArray(list) ? list : []);
    }).catch(() => {});

    loadVariants();
  }, [loadVariants]);

  // In-memory instant filtering (0ms latency, zero HTTP requests)
  const variants = useMemo(() => {
    let list = allVariants;
    if (selectedCategory) {
      list = list.filter((v) => v.category_id === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => {
        const pName = (v.product_name || '').toLowerCase();
        const vName = (v.name || '').toLowerCase();
        const bCode = (v.barcode || '').toLowerCase();
        const code = (v.code || '').toLowerCase();
        const sku = (v.sku || '').toLowerCase();
        return pName.includes(q) || vName.includes(q) || bCode.includes(q) || code.includes(q) || sku.includes(q);
      });
    }
    return list;
  }, [allVariants, selectedCategory, searchQuery]);

  // Paginated subset of filtered variants for display
  const paginatedVariants = useMemo(() => {
    const start = (posPage - 1) * POS_PAGE_SIZE;
    return variants.slice(start, start + POS_PAGE_SIZE);
  }, [variants, posPage, POS_PAGE_SIZE]);

  // Reset to first page when category or search changes
  useEffect(() => {
    setPosPage(1);
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const addToCart = useCallback((variant) => {
    const available = Number(variant.stock_quantity ?? 0);
    if (available <= 0) {
      toast.warning(`"${variant.product_name || variant.name || 'Ushbu tovar'}" bazada tugagan! (Ombordagi qoldiq: 0)`);
      return false;
    }
    const initialPrice = getDefaultPrice(variant, isPartnerSale);
    let success = true;
    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        const currentQty = Number(existing.quantity) || 0;
        if (currentQty + 1 > available) {
          toast.warning(`"${variant.product_name || variant.name || 'Tovar'}" omborda faqat ${available} ta mavjud!`);
          success = false;
          return prev;
        }
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: currentQty + 1 }
            : item
        );
      }
      return [...prev, { variant, quantity: 1, customPrice: initialPrice }];
    });
    return success;
  }, [getDefaultPrice, isPartnerSale, setCart, toast]);

  // Barcode quick add on Enter (instantly searches in-memory array)
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        if (cart.length > 0) {
          handleOpenCheckout();
        }
        return;
      }
      e.preventDefault();
      // Try exact barcode match or 3-level code first across all branch variants
      const exactMatch = allVariantsRef.current.find(
        (v) =>
          v.barcode?.toLowerCase() === q ||
          v.code?.toLowerCase() === q ||
          v.sku?.toLowerCase() === q
      );
      if (exactMatch) {
        if (addToCart(exactMatch)) {
          setSearchQuery('');
          toast.success(`"${exactMatch.product_name}" savatga qo‘shildi`);
        }
      } else if (variants.length === 1) {
        if (addToCart(variants[0])) {
          setSearchQuery('');
          toast.success(`"${variants[0].product_name}" savatga qo‘shildi`);
        }
      } else {
        toast.error(`"${searchQuery}" shtrix-kodli tovar topilmadi`);
      }
    }
  };

  const updateQuantity = (variantId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant.id === variantId) {
            const currentQty = Number(item.quantity) || 0;
            const newQty = currentQty + delta;
            const available = Number(item.variant.stock_quantity ?? 0);
            if (delta > 0 && available > 0 && newQty > available) {
              toast.warning(`Omborda faqat ${available} ta mavjud!`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const updateItemQuantity = (variantId, newQty) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variant.id === variantId) {
          const available = Number(item.variant.stock_quantity ?? 0);
          if (newQty !== '' && !isNaN(newQty)) {
            const num = Number(newQty);
            if (num > available && available > 0) {
              toast.warning(`Omborda faqat ${available} ta mavjud!`);
            }
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateItemPrice = (variantId, newPrice) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variant.id === variantId) {
          return { ...item, customPrice: newPrice };
        }
        return item;
      })
    );
  };

  const togglePartnerSale = () => {
    const nextPartner = !isPartnerSale;
    setIsPartnerSale(nextPartner);
    setCart((prev) =>
      prev.map((item) => {
        const oldDefault = getDefaultPrice(item.variant, isPartnerSale);
        if (Number(item.customPrice) === oldDefault || item.customPrice === undefined) {
          return { ...item, customPrice: getDefaultPrice(item.variant, nextPartner) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const handleClearCart = async () => {
    if (cart.length === 0) return;
    const isConfirmed = await confirm({
      title: 'Savatni tozalash',
      message: 'Savatdagi barcha tovarlarni o‘chirmoqchimisiz?',
      confirmText: 'Ha, tozalash',
      cancelText: 'Bekor qilish',
      type: 'warning',
    });
    if (isConfirmed) {
      resetCart();
      toast.info('Savat tozalandi');
    }
  };

  const cartUZS = useMemo(
    () => cart.filter((item) => item.variant.currency === 'UZS' || !item.variant.currency),
    [cart]
  );
  const cartUSD = useMemo(
    () => cart.filter((item) => item.variant.currency === 'USD'),
    [cart]
  );
  const hasUZS = cartUZS.length > 0;
  const hasUSD = cartUSD.length > 0;
  const isSplitCheckout = hasUZS && hasUSD;

  const cartTotalUZS = useMemo(
    () =>
      cartUZS.reduce(
        (acc, item) => acc + getItemEffectivePrice(item) * (Number(item.quantity) || 0),
        0
      ),
    [cartUZS, getItemEffectivePrice]
  );

  const cartTotalUSD = useMemo(
    () =>
      cartUSD.reduce(
        (acc, item) => acc + getItemEffectivePrice(item) * (Number(item.quantity) || 0),
        0
      ),
    [cartUSD, getItemEffectivePrice]
  );

  const changeDueUZS = useMemo(
    () => Math.max(0, parseFloat(paidAmountUZS || 0) - cartTotalUZS),
    [paidAmountUZS, cartTotalUZS]
  );
  const changeDueUSD = useMemo(
    () => Math.max(0, parseFloat(paidAmountUSD || 0) - cartTotalUSD),
    [paidAmountUSD, cartTotalUSD]
  );

  const hasStockError = useMemo(
    () =>
      cart.some((item) => {
        const available = Number(item.variant.stock_quantity ?? 0);
        const qty = Number(item.quantity) || 0;
        return available <= 0 || qty > available;
      }),
    [cart]
  );

  // Open Checkout
  const handleOpenCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Savat bo‘sh, tovar tanlang');
      return;
    }

    // Check each cart item against stock
    for (const item of cart) {
      const available = Number(item.variant.stock_quantity ?? 0);
      const qty = Number(item.quantity) || 0;
      if (available <= 0) {
        toast.error(`"${item.variant.product_name || item.variant.name || 'Tovar'}" bazada tugagan (qoldiq: 0). Sotuv qilish uchun savatdan o‘chiring.`);
        return;
      }
      if (qty > available) {
        toast.error(`"${item.variant.product_name || item.variant.name || 'Tovar'}" uchun omborda yetarli qoldiq yo‘q (Mavjud: ${available}, Savatda: ${qty}).`);
        return;
      }
    }

    try {
      const res = await salesApi.getCounterparties();
      const list = res.results || res;
      setCounterparties(Array.isArray(list) ? list : []);
    } catch {}

    setPaidAmountUZS(cartTotalUZS > 0 ? String(cartTotalUZS) : '');
    setPaidAmountUSD(cartTotalUSD > 0 ? String(cartTotalUSD) : '');
    setCheckoutOpen(true);
  };

  // Complete Sale
  const handleConfirmSale = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'DEBT' && !selectedCounterparty) {
      toast.warning('Nasiya uchun kontragent (mijoz)ni tanlash majburiy');
      return;
    }

    // Stock check before submitting
    for (const item of cart) {
      const available = Number(item.variant.stock_quantity ?? 0);
      const qty = Number(item.quantity) || 0;
      if (available <= 0) {
        toast.error(`"${item.variant.product_name || item.variant.name || 'Tovar'}" bazada tugagan (qoldiq: 0).`);
        return;
      }
      if (qty > available) {
        toast.error(`"${item.variant.product_name || item.variant.name || 'Tovar'}" uchun omborda yetarli qoldiq yo‘q (Mavjud: ${available}, Savatda: ${qty}).`);
        return;
      }
    }

    setSubmittingSale(true);
    try {
      const salePayload = {
        branch_id: activeBranch?.id,
        payment_type: paymentMethod.toLowerCase(), // 'cash' | 'card' | 'debt'
        is_partner_sale: isPartnerSale,
        counterparty_id: selectedCounterparty ? parseInt(selectedCounterparty, 10) : null,
        items: cart.map((i) => ({
          product_variant_id: i.variant.id,
          quantity: Number(i.quantity) || 1,
          unit_price: getItemEffectivePrice(i),
        })),
      };

      const res = await salesApi.createSale(salePayload);
      const salesList = Array.isArray(res) ? res : [res];
      setCompletedSales(salesList);
      resetCart();
      loadVariants();
      setCheckoutOpen(false);
      setReceiptOpen(true);
      toast.success('Sotuv muvaffaqiyatli amalga oshirildi!');
      window.dispatchEvent(new CustomEvent('shift_status_changed'));
    } catch (err) {
      toast.error(err.message || 'Sotuvni saqlashda xatolik yuz berdi');
    } finally {
      setSubmittingSale(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left Column: Catalog & Quick Select */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {/* Top Controls: Search Bar & 1-Narx Switcher */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 14, top: 12 }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Shtrix-kod, 3 bosqichli kod yoki tovar nomini yozing (Enter bosing)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                padding: '11px 14px 11px 42px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {/* 1-Narx (Partner) Switch Button */}
          <button
            type="button"
            onClick={togglePartnerSale}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              border: isPartnerSale
                ? '1px solid var(--accent-emerald)'
                : '1px solid var(--border-subtle)',
              background: isPartnerSale
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(255, 255, 255, 0.04)',
              color: isPartnerSale ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: isPartnerSale ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Zap size={16} />
            <span>1-Narx (Ulgurji)</span>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isPartnerSale ? 'var(--accent-emerald)' : 'var(--text-muted)',
              }}
            />
          </button>
        </div>

        {/* Category Pills Bar */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => handleCategorySelect(null)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: selectedCategory === null ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: selectedCategory === null ? 'var(--primary)' : 'var(--bg-chip)',
              color: selectedCategory === null ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Barchasi
          </button>
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: active ? 'var(--primary)' : 'var(--bg-chip)',
                  color: active ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
            gap: 12,
            alignContent: 'start',
            paddingRight: 4,
          }}
        >
          {loadingProducts ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Tovarlar yuklanmoqda...
            </div>
          ) : variants.length > 0 ? (
            paginatedVariants.map((v) => {
              const activePrice = getDefaultPrice(v);
              const inStock = Number(v.stock_quantity || 0) > 0;
              return (
                <div
                  key={v.id}
                  onClick={() => addToCart(v)}
                  className={`glass-card ${inStock ? 'interactive' : ''}`}
                  style={{
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: inStock ? 'pointer' : 'not-allowed',
                    opacity: inStock ? 1 : 0.55,
                    filter: inStock ? 'none' : 'grayscale(0.35)',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: inStock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: inStock ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          fontWeight: 700,
                        }}
                      >
                        {inStock ? `${formatQuantity(v.stock_quantity, v.unit)} ${v.unit || 'ta'}` : 'Tugagan'}
                      </span>
                      {v.code && (
                        <span style={{ fontSize: 10, color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                          {v.code}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                      {v.product_name || v.name}
                    </div>
                    {v.name && v.name !== v.product_name && v.name.toLowerCase() !== 'standart' && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {v.name}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Price details: Tavsiya, Min, 1-Narx */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tavsiya:</span>
                        <span style={{ fontWeight: 600, color: !isPartnerSale ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {formatPrice(v.price_recommended, v.currency)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Min narx:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {formatPrice(v.price_min, v.currency)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>1-Narx:</span>
                        <span style={{ fontWeight: isPartnerSale ? 700 : 500, color: isPartnerSale ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          {formatPrice(v.price_partner, v.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Main Price & Add Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontSize: 9, color: isPartnerSale ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {isPartnerSale ? '1-Narx (Ulgurji)' : 'Sotuv narxi'}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: isPartnerSale ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                          {formatPrice(activePrice, v.currency)}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-xs)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                        }}
                      >
                        <Plus size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Mahsulot topilmadi
              </div>
              <div style={{ fontSize: 13 }}>
                Ushbu filial omborida mahsulot mavjud emas yoki qoldig‘i 0 ga teng.
              </div>
            </div>
          )}
        </div>

        {/* POS Pagination Bar */}
        {variants.length > POS_PAGE_SIZE && (
          <Pagination
            currentPage={posPage}
            totalItems={variants.length}
            pageSize={POS_PAGE_SIZE}
            onPageChange={setPosPage}
            compact={true}
          />
        )}
      </div>

      {/* Right Column: Live Cart Drawer */}
      <div
        className="glass-card"
        style={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          background: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 14,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={20} color="var(--primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Savat</h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--primary)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-rose)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.length > 0 ? (
            cart.map((item) => {
              const currentPrice = item.customPrice !== undefined ? item.customPrice : getDefaultPrice(item.variant);
              const minPrice = Number(item.variant.price_min || 0);
              const partnerPrice = Number(item.variant.price_partner || 0);
              const numPrice = Number(currentPrice || 0);
              const qty = Number(item.quantity) || 0;

              // Wholesale mode is active or price matches the wholesale tier
              const isWholesaleApplied = isPartnerSale || (partnerPrice > 0 && numPrice === partnerPrice);

              let priceWarning = null;
              if (isWholesaleApplied) {
                // In wholesale mode, minimal retail price warnings are NOT needed
                // Only warn if the cashier enters a price strictly below the wholesale price itself:
                if (partnerPrice > 0 && numPrice > 0 && numPrice < partnerPrice) {
                  priceWarning = `⚠️ Ulgurji narxdan past (${formatPrice(partnerPrice, item.variant.currency)})`;
                }
              } else {
                // In retail mode, warn if entered price is strictly below the retail minimum price
                if (minPrice > 0 && numPrice > 0 && numPrice < minPrice) {
                  priceWarning = `⚠️ Minimal narxdan past (${formatPrice(minPrice, item.variant.currency)})`;
                }
              }
              const isBelowMin = !!priceWarning;
              const isUSD = item.variant.currency === 'USD';
              const availableStock = Number(item.variant.stock_quantity ?? 0);
              const isOutOfStock = availableStock <= 0;
              const isOverStock = Number(item.quantity) > availableStock;

              return (
                <div
                  key={item.variant.id}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    background: (isOutOfStock || isOverStock) ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    border: (isOutOfStock || isOverStock)
                      ? '1px solid var(--accent-rose)'
                      : isBelowMin
                      ? '1px solid var(--accent-amber)'
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.variant.product_name || item.variant.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {isPartnerSale && partnerPrice > 0 ? (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            1-Narx: {formatPrice(partnerPrice, item.variant.currency)}
                          </span>
                        ) : (
                          <span>Min: {formatPrice(minPrice, item.variant.currency)}</span>
                        )}
                        <span>Tavsiya: {formatPrice(item.variant.price_recommended, item.variant.currency)}</span>
                        {isOutOfStock ? (
                          <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                            ⚠️ Omborda tugagan (0 ta)
                          </span>
                        ) : isOverStock ? (
                          <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                            ⚠️ Omborda faqat {availableStock} ta
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, -1)}
                        title="1 taga kamaytirish"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step={item.variant.unit === 'dona' ? '1' : 'any'}
                        value={item.quantity ?? ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            updateItemQuantity(item.variant.id, '');
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= 0) {
                              updateItemQuantity(item.variant.id, num);
                            }
                          }
                        }}
                        onBlur={() => {
                          const available = Number(item.variant.stock_quantity ?? 0);
                          if (!item.quantity || Number(item.quantity) <= 0) {
                            updateItemQuantity(item.variant.id, 1);
                          } else if (available > 0 && Number(item.quantity) > available) {
                            updateItemQuantity(item.variant.id, available);
                            toast.warning(`"${item.variant.product_name || item.variant.name}" omborda faqat ${available} ta mavjud!`);
                          }
                        }}
                        title="Soni (qo‘lda kiritish mumkin)"
                        style={{
                          width: 46,
                          height: 24,
                          padding: '2px 4px',
                          textAlign: 'center',
                          borderRadius: 4,
                          border: '1px solid var(--border-card)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, 1)}
                        title="1 taga oshirish"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variant.id)}
                        title="Savatdan o‘chirish"
                        style={{
                          marginLeft: 4,
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Editable Price Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 6, borderTop: '1px dashed var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Narx ({isUSD ? '$' : 'UZS'}):</span>
                      <input
                        type="number"
                        min="0"
                        step={isUSD ? "0.01" : "500"}
                        value={item.customPrice ?? ''}
                        onChange={(e) => updateItemPrice(item.variant.id, e.target.value)}
                        style={{
                          width: 105,
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-xs)',
                          border: isBelowMin ? '1px solid var(--accent-amber)' : '1px solid var(--border-card)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {isUSD
                        ? `$${(numPrice * qty).toFixed(2)}`
                        : `${(numPrice * qty).toLocaleString()} UZS`}
                    </div>
                  </div>

                  {/* Advisory warning if entered price is lower than floor price */}
                  {priceWarning && (
                    <div style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {priceWarning}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
              <ShoppingBag size={36} strokeWidth={1.5} />
              <div style={{ fontSize: 13 }}>Savat hozircha bo‘sh</div>
              <div style={{ fontSize: 11 }}>Tovar ustiga bosing yoki skan qiling</div>
            </div>
          )}
        </div>

        {/* Cart Totals & Checkout Button */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 12 }}>
          {cartTotalUSD > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Valyuta (USD):</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                ${cartTotalUSD.toFixed(2)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Jami Summa:</span>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {cartTotalUZS.toLocaleString()} UZS
            </span>
          </div>

          {hasStockError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid var(--accent-rose)',
                color: 'var(--accent-rose)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ⚠️ Savatda omborda qolmagan yoki yetarli bo‘lmagan tovarlar bor!
            </div>
          )}

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0 || hasStockError}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: cart.length > 0 && !hasStockError
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'rgba(255,255,255,0.06)',
              color: cart.length > 0 && !hasStockError ? '#fff' : 'var(--text-muted)',
              fontSize: 16,
              fontWeight: 700,
              cursor: cart.length > 0 && !hasStockError ? 'pointer' : 'not-allowed',
              boxShadow: cart.length > 0 && !hasStockError ? 'var(--shadow-glow-emerald)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all var(--transition-fast)',
            }}
          >
            <CreditCard size={18} />
            <span>To‘lovga O‘tish</span>
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="To‘lovni Qabul Qilish"
        maxWidth={isSplitCheckout ? 840 : 540}
      >
        <form onSubmit={handleConfirmSale} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Payment Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              To‘lov Usuli
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { id: 'CASH', label: 'Naqd Pul', icon: Banknote },
                { id: 'CARD', label: 'Bank Karta', icon: CreditCard },
                { id: 'DEBT', label: 'Nasiya / Qarz', icon: Receipt },
              ].map((m) => {
                const active = paymentMethod === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: active ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                      background: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: active ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon size={20} color={active ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Counterparty selection: Required for DEBT, recommended for Partner sale, optional for regular sale */}
          {(paymentMethod === 'DEBT' || isPartnerSale || (counterparties && counterparties.length > 0)) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {paymentMethod === 'DEBT'
                    ? 'Kontragent (Nasiya qarzdor mijoz) *'
                    : isPartnerSale
                    ? 'Hamkor Do‘kon / Kontragent (1-Narx xaridori)'
                    : 'Mijoz / Hamkor biriktirish (Ixtiyoriy)'}
                </label>
                {selectedCounterparty && paymentMethod !== 'DEBT' && !isPartnerSale && (
                  <button
                    type="button"
                    onClick={() => setSelectedCounterparty('')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontSize: 11, cursor: 'pointer' }}
                  >
                    Tozalash
                  </button>
                )}
              </div>
              <CustomSelect
                value={selectedCounterparty}
                onChange={(val) => setSelectedCounterparty(val)}
                placeholder={
                  paymentMethod === 'DEBT'
                    ? 'Mijozni tanlang (Majburiy)...'
                    : isPartnerSale
                    ? 'Hamkor do‘kon / sherikni tanlang...'
                    : 'Oddiy chakana xaridor (Biriktirilmagan)'
                }
                options={[
                  {
                    value: '',
                    label:
                      paymentMethod === 'DEBT'
                        ? 'Mijozni tanlang (Majburiy)...'
                        : isPartnerSale
                        ? 'Hamkor do‘kon / sherikni tanlang...'
                        : 'Oddiy chakana xaridor (Biriktirilmagan)',
                  },
                  ...counterparties.map((cp) => ({
                    value: cp.id,
                    label: `${cp.name} (${cp.phone_number || 'Tel yo‘q'})${cp.target_tenant_name ? ` [B2B: ${cp.target_tenant_name}]` : ''}`,
                  })),
                ]}
                fullWidth
                style={isPartnerSale ? { borderColor: 'var(--accent-emerald)' } : {}}
              />
            </div>
          )}

          {/* DUAL-CURRENCY SPLIT VIEW (USD on Left, UZS on Right with vertical divider line) */}
          {isSplitCheckout ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 16,
              }}
            >
              {/* LEFT COLUMN: USD */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingRight: 16,
                  borderRight: '1px solid var(--border-card)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--accent-emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>💵</span> USD Tovarlar ({cartUSD.length})
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    ${cartTotalUSD.toLocaleString()}
                  </span>
                </div>

                {/* Items list */}
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 4,
                  }}
                >
                  {cartUSD.map((item) => {
                    const price = getItemEffectivePrice(item);
                    const lineTotal = price * item.quantity;
                    return (
                      <div
                        key={item.variant.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {item.variant.product_name}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>
                            ({formatQuantity(item.quantity, item.variant.unit_type)})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ${lineTotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cash & Change for USD */}
                {paymentMethod === 'CASH' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Mijozdan qabul qilingan summa ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={paidAmountUSD}
                      onChange={(e) => setPaidAmountUSD(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qaytim (USD):</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        ${changeDueUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: UZS */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingLeft: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>🇺🇿</span> UZS Tovarlar ({cartUZS.length})
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                    {cartTotalUZS.toLocaleString()} UZS
                  </span>
                </div>

                {/* Items list */}
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 4,
                  }}
                >
                  {cartUZS.map((item) => {
                    const price = getItemEffectivePrice(item);
                    const lineTotal = price * item.quantity;
                    return (
                      <div
                        key={item.variant.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {item.variant.product_name}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>
                            ({formatQuantity(item.quantity, item.variant.unit_type)})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {lineTotal.toLocaleString()} UZS
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cash & Change for UZS */}
                {paymentMethod === 'CASH' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Mijozdan qabul qilingan summa (UZS)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={paidAmountUZS}
                      onChange={(e) => setPaidAmountUZS(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qaytim (UZS):</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                        {changeDueUZS.toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SINGLE CURRENCY VIEW (compact layout when only one currency is present) */
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              {hasUSD ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Jami to‘lov summasi:</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      ${cartTotalUSD.toLocaleString()}
                    </span>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Mijozdan qabul qilingan summa ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={paidAmountUSD}
                        onChange={(e) => setPaidAmountUSD(e.target.value)}
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 8,
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Qaytim:</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ${changeDueUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Jami to‘lov summasi:</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                      {cartTotalUZS.toLocaleString()} UZS
                    </span>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Mijozdan qabul qilingan summa (UZS)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={paidAmountUZS}
                        onChange={(e) => setPaidAmountUZS(e.target.value)}
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 8,
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Qaytim (Сдача):</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          {changeDueUZS.toLocaleString()} UZS
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Common Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
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
              disabled={submittingSale}
              style={{
                padding: '11px 26px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 700,
                fontSize: 15,
                cursor: submittingSale ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--primary-glow)',
              }}
            >
              {submittingSale ? 'Saqlanmoqda...' : 'Sotuvni Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Print Modal */}
      <Modal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} title="Chek Kvitansiyasi" maxWidth={440}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div className="no-print">
            <CheckCircle size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 8px' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 2px', color: 'var(--text-primary)' }}>
              Sotuv Muvaffaqiyatli Yakunlandi!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>
              {completedSales.length > 1
                ? `${completedSales.length} ta chek shakllantirildi (Dual-valyuta)`
                : `Chek raqami: #${completedSales[0]?.receipt_number || completedSales[0]?.id}`}
            </p>
          </div>

          {/* Thermal Printer Format Switcher */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 14 }}>
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

          {/* Authentic Real-world Thermal Receipt Slip */}
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
            <ReceiptSlip
              id="printable-pos-receipt"
              sales={completedSales}
              paidAmountUZS={paidAmountUZS}
              paidAmountUSD={paidAmountUSD}
              changeDueUZS={changeDueUZS}
              changeDueUSD={changeDueUSD}
              paperWidth={receiptPaperWidth}
            />
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => printReceiptSlip('printable-pos-receipt', 'Inventra Savdo Cheki', receiptPaperWidth)}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Printer size={16} />
              <span>Chekni chop etish ({receiptPaperWidth})</span>
            </button>
            {/* A4 Invoice only for Debt or Partner/Counterparty/B2B sales */}
            {(completedSales || []).some(
              (s) =>
                (s.payment_type || '').toLowerCase() === 'debt' ||
                Boolean(s.is_partner_sale) ||
                Boolean(s.counterparty) ||
                Boolean(s.counterparty_name) ||
                Boolean(s.b2b_target_tenant)
            ) && (
              <button
                type="button"
                onClick={() => handleOpenPosInvoice()}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText size={16} style={{ color: 'var(--primary)' }} />
                <span>A4 Faktura</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setReceiptOpen(false)}
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      </Modal>

      {/* Official A4 Invoice Modal */}
      <InvoiceA4Modal
        isOpen={posInvoiceModalOpen}
        onClose={() => setPosInvoiceModalOpen(false)}
        sale={selectedPosInvoiceSale}
      />
    </div>
  );
}
