import IlbiLoader from '../components/common/IlbiLoader';
import { useDebouncedValue, usePaginatedList } from '../hooks/usePaginatedList';
import Pagination from '../components/common/Pagination';
import React, { useState, useEffect, } from 'react';
import {
  Building2,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
} from 'lucide-react';
import { catalogApi, salesApi } from '../api/client';
import Modal from '../components/common/Modal';
import InvoiceA4Modal from '../components/common/InvoiceA4Modal';
import { useToast } from '../context/ToastContext';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../hooks/useAuth';
import CustomSelect from '../components/common/CustomSelect';

const pendingQuantity = (item) => Math.max(0, Number(item.quantity || 0) - ['voided_quantity', 'b2b_accepted_quantity', 'b2b_rejected_quantity', 'b2b_return_pending_quantity', 'b2b_discrepancy_closed_quantity'].reduce((sum, field) => sum + Number(item[field] || 0), 0));

export default function B2BTransactions() {
  const { activeTenant } = useTenant();
  const { isOwner } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice A4 Modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceSale, setSelectedInvoiceSale] = useState(null);

  // B2B Accept Modal & State
  const [b2bAcceptSale, setB2BAcceptSale] = useState(null);
  const [b2bAcceptCategories, setB2BAcceptCategories] = useState([]);
  const [b2bAcceptCategoryByItem, setB2BAcceptCategoryByItem] = useState({});
  const [b2bAcceptVariantByItem, setB2BAcceptVariantByItem] = useState({});
  const [submittingB2BAccept, setSubmittingB2BAccept] = useState(false);

  // B2B Reject Modal & State
  const [b2bRejectModalOpen, setB2BRejectModalOpen] = useState(false);
  const [selectedB2BSaleId, setSelectedB2BSaleId] = useState(null);
  const [b2bRejectReason, setB2BRejectReason] = useState('');
  const [submittingB2BReject, setSubmittingB2BReject] = useState(false);

  // B2B Return Receive Modal & State
  const [b2bReturnSale, setB2BReturnSale] = useState(null);
  const [b2bReturnQuantities, setB2BReturnQuantities] = useState({});
  const [b2bReturnReason, setB2BReturnReason] = useState('Jismoniy qaytgan tovar qabul qilindi');
  const [b2bReturnIdempotencyKey, setB2BReturnIdempotencyKey] = useState('');
  const [submittingB2BReturn, setSubmittingB2BReturn] = useState(false);

  // B2B Discrepancy Close Modal & State
  const [b2bDiscrepancySale, setB2BDiscrepancySale] = useState(null);
  const [b2bDiscrepancyQuantities, setB2BDiscrepancyQuantities] = useState({});
  const [b2bDiscrepancyReason, setB2BDiscrepancyReason] = useState('');
  const [b2bDiscrepancyIdempotencyKey, setB2BDiscrepancyIdempotencyKey] = useState('');
  const [submittingB2BDiscrepancy, setSubmittingB2BDiscrepancy] = useState(false);

  const search = useDebouncedValue(searchQuery.trim());
  const inbox = usePaginatedList(salesApi.getB2BInbox, { search }, { tenantId: activeTenant?.id });
  const outgoing = usePaginatedList(salesApi.getSales, { b2b_only: true, search }, { tenantId: activeTenant?.id });
  const b2bInbox = inbox.items;
  const outgoingB2B = outgoing.items;
  const loading = activeTab === 'inbox' ? inbox.loading : outgoing.loading;
  const activeList = activeTab === 'inbox' ? inbox : outgoing;
  const loadData = () => { inbox.refresh(); outgoing.refresh(); };
  useEffect(() => { const error = inbox.error || outgoing.error; if (error) toast.error(error.message); }, [inbox.error, outgoing.error, toast]);

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
    } catch {
      toast.error('Faktura ma’lumotlarini yuklab bo‘lmadi');
    }
  };

  // Open Accept B2B
  const handleAcceptB2B = async (sale) => {
    try {
      const barcodes = [...new Set((sale.items || []).map(item => item.product_barcode).filter(Boolean))];
      const [response, variantResponse] = await Promise.all([
        catalogApi.getCategories(),
        barcodes.length ? catalogApi.getVariants({ barcodes: barcodes.join(',') }) : Promise.resolve([]),
      ]);
      const allCategories = response.results || response;
      const list = allCategories.filter(category => !category.currency || category.currency === sale.currency);
      const variants = variantResponse.results || variantResponse;
      const variantResults = (sale.items || []).map(item => {
        const exact = variants.filter(variant => item.product_barcode && variant.barcode === item.product_barcode
          && variant.currency === sale.currency && variant.unit === item.unit);
        return [item.id, exact.length === 1 ? exact[0] : null];
      });

      const mappedItemIds = new Set(variantResults.filter(([, variant]) => variant).map(([itemId]) => itemId));
      const needsCategory = (sale.items || []).some(
        (item) => pendingQuantity(item) > 0 && !mappedItemIds.has(item.id)
      );

      if (!list.length && needsCategory) {
        toast.error('Mos shtrix-kodli mahsulot topilmadi. Avval qabul qiluvchi do‘konda kategoriya yarating');
        return;
      }

      setB2BAcceptCategories(list);
      setB2BAcceptCategoryByItem({});
      setB2BAcceptVariantByItem(
        Object.fromEntries(variantResults.filter(([, variant]) => variant).map(([itemId, variant]) => [itemId, variant]))
      );
      setB2BAcceptSale(sale);
    } catch (err) {
      toast.error(err.message || 'Kategoriyalarni yuklab bo‘lmadi');
    }
  };

  // Confirm Accept B2B
  const handleConfirmAcceptB2B = async (event) => {
    event.preventDefault();
    if (!b2bAcceptSale) return;

    const items = (b2bAcceptSale.items || [])
      .map((item) => {
        const target = {
          sale_item_id: item.id,
          accepted_quantity: String(pendingQuantity(item)),
        };
        if (b2bAcceptVariantByItem[item.id]) target.target_variant_id = b2bAcceptVariantByItem[item.id].id;
        else if (b2bAcceptCategoryByItem[item.id]) target.target_category_id = b2bAcceptCategoryByItem[item.id];
        return target;
      })
      .filter((item) => Number(item.accepted_quantity) > 0);

    if (items.some((item) => !item.target_variant_id && !item.target_category_id)) {
      toast.error('Har bir qabul qilinadigan tovar uchun o‘z kategoriyangizni tanlang');
      return;
    }

    setSubmittingB2BAccept(true);
    try {
      await salesApi.acceptB2B(b2bAcceptSale.id, { items });
      toast.success('B2B tovarlar tanlangan kategoriyalarga muvaffaqiyatli qabul qilindi');
      setB2BAcceptSale(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'B2B qabul qilishda xatolik yuz berdi');
    } finally {
      setSubmittingB2BAccept(false);
    }
  };

  // Open Reject B2B
  const handleOpenRejectB2B = (saleId) => {
    setSelectedB2BSaleId(saleId);
    setB2BRejectReason('');
    setB2BRejectModalOpen(true);
  };

  // Confirm Reject B2B
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
      toast.error(err.message || 'Rad etishda xatolik yuz berdi');
    } finally {
      setSubmittingB2BReject(false);
    }
  };

  // Open Receive B2B Return
  const handleOpenReceiveB2BReturn = (sale) => {
    setB2BReturnSale(sale);
    setB2BReturnReason('Jismoniy qaytgan tovar qabul qilindi');
    setB2BReturnQuantities(
      Object.fromEntries(
        (sale.items || [])
          .filter((item) => Number(item.b2b_return_pending_quantity || 0) > 0)
          .map((item) => [item.id, String(item.b2b_return_pending_quantity)])
      )
    );
    setB2BReturnIdempotencyKey(
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  };

  // Confirm Receive B2B Return
  const handleConfirmReceiveB2BReturn = async (event) => {
    event.preventDefault();
    if (!b2bReturnSale || !b2bReturnReason.trim()) {
      toast.warning('Qaytish sababini kiriting');
      return;
    }

    const items = Object.entries(b2bReturnQuantities)
      .map(([sale_item_id, quantity]) => ({ sale_item_id: Number(sale_item_id), quantity: String(quantity) }))
      .filter((item) => Number(item.quantity) > 0);

    if (!items.length) {
      toast.warning('Amalda qabul qilingan miqdorni kiriting');
      return;
    }

    setSubmittingB2BReturn(true);
    try {
      await salesApi.receiveB2BReturn(b2bReturnSale.id, {
        idempotency_key: b2bReturnIdempotencyKey,
        reason: b2bReturnReason.trim(),
        items,
      });
      toast.success('Jismoniy qaytgan tovar omborga qabul qilindi');
      setB2BReturnSale(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Qaytgan tovarni qabul qilishda xatolik yuz berdi');
    } finally {
      setSubmittingB2BReturn(false);
    }
  };

  // Open Close Discrepancy
  const handleOpenCloseB2BDiscrepancy = (sale) => {
    setB2BDiscrepancySale(sale);
    setB2BDiscrepancyReason('');
    setB2BDiscrepancyQuantities(
      Object.fromEntries(
        (sale.items || [])
          .filter((item) => Number(item.b2b_return_pending_quantity || 0) > 0)
          .map((item) => [item.id, '0'])
      )
    );
    setB2BDiscrepancyIdempotencyKey(
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  };

  // Confirm Close Discrepancy
  const handleConfirmCloseB2BDiscrepancy = async (event) => {
    event.preventDefault();
    if (!b2bDiscrepancySale || !b2bDiscrepancyReason.trim()) {
      toast.warning('Tafovutni yopish sababini kiriting');
      return;
    }

    const items = Object.entries(b2bDiscrepancyQuantities)
      .map(([sale_item_id, quantity]) => ({ sale_item_id: Number(sale_item_id), quantity: String(quantity) }))
      .filter((item) => Number(item.quantity) > 0);

    if (!items.length) {
      toast.warning('Yo‘qolgan yoki shikastlangan miqdorni kiriting');
      return;
    }

    setSubmittingB2BDiscrepancy(true);
    try {
      await salesApi.closeB2BReturnDiscrepancy(b2bDiscrepancySale.id, {
        idempotency_key: b2bDiscrepancyIdempotencyKey,
        reason: b2bDiscrepancyReason.trim(),
        items,
      });
      toast.success('Tafovut yopildi; hisob-kitoblar va qarzlar to‘g‘rilandi');
      setB2BDiscrepancySale(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Tafovutni yopishda xatolik yuz berdi');
    } finally {
      setSubmittingB2BDiscrepancy(false);
    }
  };

  const filteredInbox = b2bInbox;
  const filteredOutgoing = outgoingB2B;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderLeft: '4px solid var(--accent-emerald)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(var(--success-rgb), 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)',
            }}
          >
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Kiruvchi B2B Fakturalar
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {inbox.total} ta kutilmoqda
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderLeft: '4px solid var(--primary)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Jo‘natilgan B2B Tranzaksiyalar
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {outgoing.summary?.total_count ?? outgoing.total} ta faktura
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderLeft: '4px solid var(--accent-amber)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(var(--primary-rgb), 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <RotateCcw size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Qaytish Kutilayotgan
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {outgoing.summary?.return_pending_count || 0} ta tovar
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Controls */}
      <div
        className="glass-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'inbox' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'inbox' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Kiruvchi Fakturalar (Inbox)</span>
            {b2bInbox.length > 0 && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  background: activeTab === 'inbox' ? 'rgba(0, 0, 0, 0.1)' : 'var(--accent-emerald)',
                  color: activeTab === 'inbox' ? 'var(--text-on-primary)' : 'var(--on-success)',
                }}
              >
                {inbox.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'outgoing' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'outgoing' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight size={16} />
            <span>Jo‘natilgan B2B & Qaytishlar</span>
            {outgoingB2B.length > 0 && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  background: activeTab === 'outgoing' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-input)',
                  color: activeTab === 'outgoing' ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {outgoing.summary?.total_count ?? outgoing.total}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Faktura # yoki hamkor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Yangilash"
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? <IlbiLoader size={21} inline decorative /> : <RefreshCw size={13} />}
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'inbox' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Faktura #</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Yuboruvchi Do‘kon</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tovarlar Soni</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Jami Qiymat</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Kelgan Sana</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Qaror & Faktura</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <IlbiLoader label="Yuklanmoqda..." />
                    </td>
                  </tr>
                ) : filteredInbox.length > 0 ? (
                  filteredInbox.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        #{b.receipt_number || b.id}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Store size={15} style={{ color: 'var(--primary)' }} />
                          <span>{b.source_tenant_name || 'B2B Hamkor'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {(b.items || []).length} xil pozitsiya
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                        {Number(b.total_amount || 0).toLocaleString()} {b.currency || 'UZS'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={13} />
                          <span>{new Date(b.created_at).toLocaleString('uz-UZ')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(b)}
                            title="A4 formatida hisob-faktura / yuk xati"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border-card)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <FileText size={13} style={{ color: 'var(--primary)' }} />
                            <span>Faktura</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptB2B(b)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-xs)',
                              border: 'none',
                              background: 'var(--accent-emerald)',
                              color: 'var(--on-success)',
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
                            type="button"
                            onClick={() => handleOpenRejectB2B(b.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid rgba(var(--danger-rgb), 0.3)',
                              background: 'rgba(var(--danger-rgb), 0.1)',
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
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Building2 size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                      <div>B2B yangi kiruvchi fakturalar mavjud emas</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Outgoing B2B Transfers & Returns */}
      {activeTab === 'outgoing' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Faktura #</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Qabul Qiluvchi Hamkor</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Holat</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Jami Qiymat</th>
                  <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Sana</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <IlbiLoader label="Yuklanmoqda..." />
                    </td>
                  </tr>
                ) : filteredOutgoing.length > 0 ? (
                  filteredOutgoing.map((s) => {
                    const statusLower = (s.status || '').toLowerCase();
                    const isCompleted = statusLower === 'completed';
                    const isB2BReturnPending = statusLower === 'b2b_return_pending';
                    const isRejected = statusLower === 'b2b_rejected' || statusLower === 'voided';
                    const isPending = statusLower === 'b2b_pending';

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          #{s.receipt_number || s.id}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Store size={15} style={{ color: 'var(--primary)' }} />
                            <span>{s.b2b_target_tenant_name || s.counterparty_name || 'B2B Do‘kon'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: 11,
                              fontWeight: 700,
                              background: isCompleted
                                ? 'rgba(34, 197, 94, 0.12)'
                                : isB2BReturnPending
                                ? 'rgba(var(--primary-rgb), 0.12)'
                                : isRejected
                                ? 'rgba(var(--danger-rgb), 0.12)'
                                : 'rgba(59, 130, 246, 0.12)',
                              color: isCompleted
                                ? 'var(--accent-emerald)'
                                : isB2BReturnPending
                                ? 'var(--accent-amber)'
                                : isRejected
                                ? 'var(--accent-rose)'
                                : 'var(--primary)',
                            }}
                          >
                            {isCompleted
                              ? 'Qabul qilingan'
                              : isB2BReturnPending
                              ? 'Qaytish kutilmoqda'
                              : isRejected
                              ? 'Rad etilgan'
                              : isPending
                              ? 'Kutilmoqda'
                              : s.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {Number(s.total_amount || 0).toLocaleString()} {s.currency || 'UZS'}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(s.created_at).toLocaleString('uz-UZ')}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(s)}
                              title="A4 formatida rasmiy Hisob-faktura / Yuk xati"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-card)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <FileText size={13} style={{ color: 'var(--primary)' }} />
                              <span>Faktura</span>
                            </button>

                            {isB2BReturnPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenReceiveB2BReturn(s)}
                                title="Amalda qaytib kelgan tovarni qabul qilish"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid rgba(var(--success-rgb), 0.35)',
                                  background: 'rgba(var(--success-rgb), 0.08)',
                                  color: 'var(--accent-emerald)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <CheckCircle size={12} />
                                <span>Qaytishni qabul qilish</span>
                              </button>
                            )}

                            {isB2BReturnPending && isOwner && (
                              <button
                                type="button"
                                onClick={() => handleOpenCloseB2BDiscrepancy(s)}
                                title="Qaytmagan yoki shikastlangan miqdorni sabab bilan yopish"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid rgba(var(--primary-rgb), 0.4)',
                                  background: 'rgba(var(--primary-rgb), 0.08)',
                                  color: 'var(--accent-amber)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <AlertTriangle size={12} />
                                <span>Tafovutni yopish</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RotateCcw size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                      <div>Jo‘natilgan B2B tranzaksiyalar mavjud emas</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B2B Accept / Category Mapping Modal */}
      <Pagination currentPage={activeList.page} totalItems={activeList.total} onPageChange={activeList.setPage} />
      <Modal
        isOpen={Boolean(b2bAcceptSale)}
        onClose={() => !submittingB2BAccept && setB2BAcceptSale(null)}
        title="B2B tovarlarni do‘kon katalogiga joylash"
        maxWidth={880}
      >
        <form onSubmit={handleConfirmAcceptB2B} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
            Aniq bir xil shtrix-kod topilsa mavjud mahalliy variant ishlatiladi. Aks holda o‘z kategoriyangizni tanlang — manba do‘kon katalogiga ulanmagan alohida mahsulot nusxasi yaratiladi.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '55vh', overflowY: 'auto' }}>
            {(b2bAcceptSale?.items || [])
              .filter((item) => pendingQuantity(item) > 0)
              .map((item) => {
                const availableQuantity = pendingQuantity(item);
                return (
                  <div key={item.id} style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {item.product_name || 'Tovar'} — {item.product_variant_name || item.product_code || 'Variant'}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {availableQuantity} {item.unit || ''}</span>
                    </div>
                    {b2bAcceptVariantByItem[item.id] ? (
                      <div style={{ fontSize: 13, color: 'var(--accent-emerald)' }}>
                        Mavjud variant topildi: {b2bAcceptVariantByItem[item.id].product_name} — {b2bAcceptVariantByItem[item.id].name}
                      </div>
                    ) : (
                      <>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Mahalliy kategoriyangiz *
                        </label>
                        <CustomSelect
                          value={b2bAcceptCategoryByItem[item.id] || ''}
                          onChange={(val) => setB2BAcceptCategoryByItem((current) => ({ ...current, [item.id]: val }))}
                          options={[
                            { value: '', label: 'Kategoriyani tanlang' },
                            ...b2bAcceptCategories.map((category) => ({
                              value: String(category.id),
                              label: category.name,
                            })),
                          ]}
                          size="md"
                          fullWidth
                        />
                      </>
                    )}
                  </div>
                );
              })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setB2BAcceptSale(null)}
              disabled={submittingB2BAccept}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submittingB2BAccept}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-emerald)', color: 'var(--on-success)', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingB2BAccept ? 'Qabul qilinmoqda...' : 'Kategoriyalarga qabul qilish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reject B2B Transfer */}
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
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
              }}
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
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-rose)', color: 'var(--on-danger)', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingB2BReject ? 'Rad etilmoqda...' : 'Rad Etishni Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Receive B2B Return */}
      <Modal
        isOpen={Boolean(b2bReturnSale)}
        onClose={() => !submittingB2BReturn && setB2BReturnSale(null)}
        title={`B2B qaytgan tovarni qabul qilish${b2bReturnSale ? ` — #${b2bReturnSale.receipt_number || b2bReturnSale.id}` : ''}`}
        maxWidth={760}
      >
        <form onSubmit={handleConfirmReceiveB2BReturn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb), 0.10)', color: 'var(--text-secondary)', fontSize: 13 }}>
            Faqat amalda qaytib kelib tekshirilgan miqdorni kiriting. Tasdiqlangan miqdor jo‘natuvchi omboriga qaytadi; qolgan tafovut ochiq qoladi.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '45vh', overflowY: 'auto' }}>
            {(b2bReturnSale?.items || []).filter((item) => Number(item.b2b_return_pending_quantity || 0) > 0).map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 650, fontSize: 13 }}>
                    {item.product_name} {item.product_variant_name && `— ${item.product_variant_name}`}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    Qaytishi kutilayotgan: {item.b2b_return_pending_quantity} {item.unit || 'dona'}
                  </div>
                </div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Qabul qilindi
                  <input
                    type="number"
                    min="0"
                    max={item.b2b_return_pending_quantity}
                    step="0.001"
                    value={b2bReturnQuantities[item.id] ?? '0'}
                    onChange={(event) => setB2BReturnQuantities((current) => ({ ...current, [item.id]: event.target.value }))}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 5,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)' }}>
            Qabul qilish sababi *
            <textarea
              rows={2}
              required
              value={b2bReturnReason}
              onChange={(event) => setB2BReturnReason(event.target.value)}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 6,
                padding: 10,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              disabled={submittingB2BReturn}
              onClick={() => setB2BReturnSale(null)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={submittingB2BReturn}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-emerald)', color: 'var(--on-success)', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingB2BReturn ? 'Saqlanmoqda...' : 'Qabul qilinganini tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close B2B Discrepancy */}
      <Modal
        isOpen={Boolean(b2bDiscrepancySale)}
        onClose={() => !submittingB2BDiscrepancy && setB2BDiscrepancySale(null)}
        title={`B2B qaytish tafovutini yopish${b2bDiscrepancySale ? ` — #${b2bDiscrepancySale.receipt_number || b2bDiscrepancySale.id}` : ''}`}
        maxWidth={760}
      >
        <form onSubmit={handleConfirmCloseB2BDiscrepancy} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb), 0.10)', color: 'var(--text-secondary)', fontSize: 13 }}>
            Faqat amalda qaytmagan yoki shikastlangan miqdorni kiriting. Miqdor sotuv narxida sotuv summasi va hamkor qarz/kreditidan ayriladi; qarz to‘langan bo‘lsa hamkor kreditiga yoziladi. Bu naqd qaytarim emas va ombor qoldig‘ini o‘zgartirmaydi.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '45vh', overflowY: 'auto' }}>
            {(b2bDiscrepancySale?.items || []).filter((item) => Number(item.b2b_return_pending_quantity || 0) > 0).map((item) => {
              const quantity = Number(b2bDiscrepancyQuantities[item.id] || 0);
              const amount = quantity * Number(item.unit_price || 0);
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 650, fontSize: 13 }}>
                      {item.product_name} {item.product_variant_name && `— ${item.product_variant_name}`}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                      Qaytishi kutilayotgan: {item.b2b_return_pending_quantity} {item.unit || 'dona'} · taxminiy tuzatish: {new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 2 }).format(amount)} {b2bDiscrepancySale?.currency || 'UZS'}
                    </div>
                  </div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Yopiladigan miqdor
                    <input
                      type="number"
                      min="0"
                      max={item.b2b_return_pending_quantity}
                      step="0.001"
                      value={b2bDiscrepancyQuantities[item.id] ?? '0'}
                      onChange={(event) => setB2BDiscrepancyQuantities((current) => ({ ...current, [item.id]: event.target.value }))}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: 5,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)' }}>
            Tafovut sababi *
            <textarea
              rows={2}
              required
              value={b2bDiscrepancyReason}
              onChange={(event) => setB2BDiscrepancyReason(event.target.value)}
              placeholder="Yo‘qolgan yoki shikastlangan tovar tafsiloti"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 6,
                padding: 10,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              disabled={submittingB2BDiscrepancy}
              onClick={() => setB2BDiscrepancySale(null)}
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={submittingB2BDiscrepancy}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-amber)', color: 'var(--on-warning)', fontWeight: 600, cursor: 'pointer' }}
            >
              {submittingB2BDiscrepancy ? 'Yopilmoqda...' : 'Tafovutni yopish'}
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
