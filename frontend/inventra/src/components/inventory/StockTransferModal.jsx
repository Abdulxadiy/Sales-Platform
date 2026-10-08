import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  GitBranch,
} from 'lucide-react';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import { inventoryApi, catalogApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

export default function StockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  initialVariant = null,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { isOwner, isAdmin } = useAuth();
  const { branches, activeBranch } = useBranch();

  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available stock items for selection from fromBranch
  const [availableStock, setAvailableStock] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultFrom = activeBranch?.id || branches[0]?.id || '';
      setFromBranchId(String(defaultFrom));

      // Pick first different branch as toBranch
      const other = branches.find((b) => String(b.id) !== String(defaultFrom));
      setToBranchId(other ? String(other.id) : '');

      setNote('');
      setSelectedVariantId('');
      setSelectedQuantity('1');

      if (initialVariant) {
        setItems([
          {
            variant_id: initialVariant.id,
            name: initialVariant.product_name || initialVariant.name,
            sku: initialVariant.sku || initialVariant.code || '',
            unit: initialVariant.unit || 'dona',
            available_qty: Number(initialVariant.stock_quantity || initialVariant.quantity || 9999),
            quantity: 1,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, activeBranch, branches, initialVariant]);

  // Load stock for selected fromBranch
  useEffect(() => {
    if (!isOpen || !fromBranchId) return;

    setLoadingStock(true);
    inventoryApi
      .getStock({ branch_id: fromBranchId })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.results || [];
        // Only items with positive stock can be transferred out
        const positiveList = list.filter((s) => Number(s.quantity) > 0);
        setAvailableStock(positiveList);
      })
      .catch(() => setAvailableStock([]))
      .finally(() => setLoadingStock(false));
  }, [isOpen, fromBranchId]);

  const handleAddItem = () => {
    if (!selectedVariantId) {
      toast.warning('O‘tkazish uchun mahsulotni tanlang');
      return;
    }
    const qty = parseFloat(selectedQuantity);
    if (!qty || qty <= 0) {
      toast.warning('O‘tkazish miqdorini to‘g‘ri kiriting');
      return;
    }

    const stockItem = availableStock.find(
      (s) => String(s.product_variant?.id || s.product_variant) === String(selectedVariantId)
    );
    if (!stockItem) return;

    const available = Number(stockItem.quantity || 0);
    if (qty > available) {
      toast.error(`Yetarli qoldiq mavjud emas (Mavjud: ${available})`);
      return;
    }

    // Check if already in items list
    const existingIndex = items.findIndex((i) => String(i.variant_id) === String(selectedVariantId));
    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + qty;
      if (newQty > available) {
        toast.error(`Jami miqdor mavjud qoldiqdan oshib ketdi (Mavjud: ${available})`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          variant_id: stockItem.product_variant?.id || stockItem.product_variant,
          name: stockItem.product_variant_name || stockItem.product_name || 'Mahsulot',
          sku: stockItem.product_variant?.sku || stockItem.product_variant?.code || '',
          unit: stockItem.product_variant?.unit || 'dona',
          available_qty: available,
          quantity: qty,
        },
      ]);
    }

    setSelectedVariantId('');
    setSelectedQuantity('1');
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId) {
      toast.warning('Jo‘natuvchi va qabul qiluvchi filialni tanlang');
      return;
    }
    if (String(fromBranchId) === String(toBranchId)) {
      toast.warning('Jo‘natuvchi va qabul qiluvchi filial bir xil bo‘lishi mumkin emas');
      return;
    }
    if (items.length === 0) {
      toast.warning('Kamida bitta tovar qo‘shing');
      return;
    }

    const fromBranch = branches.find((b) => String(b.id) === String(fromBranchId));
    const toBranch = branches.find((b) => String(b.id) === String(toBranchId));

    // If Owner: prompt confirmation and auto-accept
    let autoAccept = false;
    if (isOwner || isAdmin) {
      const isConfirmed = await confirm({
        title: 'Transferni tasdiqlaysizmi?',
        message: `"${fromBranch?.name}" filialidan "${toBranch?.name}" filialiga ${items.length} ta mahsulotni o‘tkazishni tasdiqlaysizmi? Do‘kon egasi sifatida ushbu transfer darhol avtomatik qabul qilinadi va tovarlar ${toBranch?.name} omboriga kirim bo‘ladi.`,
        confirmText: 'Ha, transferni amalga oshirish',
        cancelText: 'Bekor qilish',
        type: 'info',
      });
      if (!isConfirmed) return;
      autoAccept = true;
    }

    setSubmitting(true);
    try {
      const payload = {
        from_branch_id: parseInt(fromBranchId, 10),
        to_branch_id: parseInt(toBranchId, 10),
        auto_accept: autoAccept,
        note: note.trim(),
        items: items.map((i) => ({
          product_variant_id: i.variant_id,
          quantity: i.quantity,
        })),
      };

      await inventoryApi.createTransfer(payload);

      if (autoAccept) {
        toast.success('Transfer muvaffaqiyatli yakunlandi va tovarlar yangi filialga o‘tkazildi!');
      } else {
        toast.success('Transfer jo‘natildi! Qabul qiluvchi filial uni tasdiqlashi kutilmoqda.');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Transferni amalga oshirishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filiallararo Tovar Transferi"
      maxWidth={680}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Branch Selection Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
              Qayerdan (Jo‘natuvchi) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <CustomSelect
              value={fromBranchId}
              onChange={(val) => setFromBranchId(val)}
              disabled={!isOwner && !isAdmin}
              options={branches.map((b) => ({
                value: b.id,
                label: `${b.name} ${b.is_main ? '(Asosiy)' : ''}`,
              }))}
              placeholder="Jo‘natuvchi filial..."
              fullWidth
            />
          </div>

          <div style={{ paddingTop: 20, display: 'flex', justifyContent: 'center' }}>
            <ArrowRightLeft size={20} color="var(--primary)" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
              Qayerga (Qabul qiluvchi) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <CustomSelect
              value={toBranchId}
              onChange={(val) => setToBranchId(val)}
              options={branches
                .filter((b) => String(b.id) !== String(fromBranchId))
                .map((b) => ({
                  value: b.id,
                  label: `${b.name} ${b.is_main ? '(Asosiy)' : ''}`,
                }))}
              placeholder="Filialni tanlang..."
              fullWidth
            />
          </div>
        </div>

        {/* Add Product Section */}
        <div
          style={{
            background: 'var(--bg-chip)',
            padding: 14,
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            O‘tkaziladigan tovarlarni qo‘shish
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'center' }}>
            <div>
              <CustomSelect
                value={selectedVariantId}
                onChange={(val) => setSelectedVariantId(val)}
                disabled={loadingStock}
                placeholder={loadingStock ? 'Qoldiqlar yuklanmoqda...' : 'Tovarni tanlang (mavjud qoldiq)...'}
                options={availableStock.map((s) => {
                  const vId = s.product_variant?.id || s.product_variant;
                  const name = s.product_variant_name || s.product_name || 'Mahsulot';
                  return {
                    value: vId,
                    label: `${name} — Qoldiq: ${s.quantity} ${s.unit || 'dona'}`,
                  };
                })}
                fullWidth
              />
            </div>

            <div>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="Miqdor"
                className="input-field"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px' }}
            >
              <Plus size={16} />
              <span>Qo‘shish</span>
            </button>
          </div>
        </div>

        {/* Items Table */}
        {items.length > 0 ? (
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              borderRadius: 10,
              border: '1px solid var(--border-card)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Mahsulot</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Mavjud</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>O‘tkazish miqdori</th>
                  <th style={{ padding: '8px 12px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg-chip)',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                      {item.name}
                      {item.sku && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          SKU: {item.sku}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {item.available_qty} {item.unit}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-rose)',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        title="O‘chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Transfer uchun hech qanday tovar tanlanmagan
          </div>
        )}

        {/* Note */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
            Izoh yoki sabab (ixtiyoriy)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Masalan: Yangi filialni to‘ldirish..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Footer info alert */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: isOwner || isAdmin ? 'rgba(59, 130, 246, 0.08)' : 'rgba(234, 179, 8, 0.08)',
            border: `1px solid ${isOwner || isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
            fontSize: 12,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <HelpCircle size={16} color={isOwner || isAdmin ? 'var(--primary)' : 'var(--accent-amber)'} />
          <span>
            {isOwner || isAdmin
              ? 'Do‘kon egasi transferni tasdiqlaganida, tovarlar avtomatik ravishda qabul qilinadi.'
              : 'Xodimlar tomonidan jo‘natilgan transfer qabul qiluvchi filial xodimi tomonidan tasdiqlanishi kerak.'}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="btn btn-primary"
          >
            {submitting ? 'Amalga oshirilmoqda...' : 'Transferni tasdiqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
