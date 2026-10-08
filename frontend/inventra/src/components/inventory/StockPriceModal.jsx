import React, { useState, useEffect } from 'react';
import { Tag, DollarSign, Store, Check, RefreshCw } from 'lucide-react';
import Modal from '../common/Modal';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';

export default function StockPriceModal({
  isOpen,
  onClose,
  stockItem = null,
  onSuccess,
}) {
  const toast = useToast();
  const { activeBranch } = useBranch();

  const [recPrice, setRecPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [partnerPrice, setPartnerPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && stockItem) {
      setRecPrice(stockItem.custom_price_recommended ?? '');
      setMinPrice(stockItem.custom_price_min ?? '');
      setPartnerPrice(stockItem.custom_price_partner ?? '');
    }
  }, [isOpen, stockItem]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!stockItem) return;

    setSaving(true);
    try {
      const variantId = stockItem.product_variant?.id || stockItem.product_variant;
      const payload = {
        branch_id: stockItem.branch?.id || stockItem.branch || activeBranch?.id,
        custom_price_recommended: recPrice !== '' ? parseFloat(recPrice) : null,
        custom_price_min: minPrice !== '' ? parseFloat(minPrice) : null,
        custom_price_partner: partnerPrice !== '' ? parseFloat(partnerPrice) : null,
      };

      await inventoryApi.updateStockPrices(variantId, payload);
      toast.success('Filial uchun maxsus narxlar muvaffaqiyatli saqlandi!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Narxlarni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToBase = () => {
    setRecPrice('');
    setMinPrice('');
    setPartnerPrice('');
  };

  const variantName = stockItem?.product_variant_name || stockItem?.product_name || 'Mahsulot';
  const branchName = stockItem?.branch_name || activeBranch?.name || 'Filial';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filial Narxlarini Sozlash"
      maxWidth={520}
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: 12,
            background: 'var(--bg-chip)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {variantName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Store size={13} />
            <span>Filial: {branchName}</span>
          </div>
        </div>

        {/* Base Prices Reference */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            background: 'var(--bg-card)',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-card)',
            fontSize: 12,
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Asosiy Tavsiya:</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>
              {Number(stockItem?.base_price_recommended || stockItem?.effective_price_recommended || 0).toLocaleString()} UZS
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Asosiy Minimal:</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>
              {Number(stockItem?.base_price_min || stockItem?.effective_price_min || 0).toLocaleString()} UZS
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Asosiy 1-Narx:</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>
              {Number(stockItem?.base_price_partner || stockItem?.effective_price_partner || 0).toLocaleString()} UZS
            </div>
          </div>
        </div>

        {/* Custom Price Inputs */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
            Ushbu filial uchun tavsiya etilgan narx (UZS)
          </label>
          <input
            type="number"
            step="any"
            className="input-field"
            placeholder="Bo‘sh qoldirilsa, asosiy narx ishlatiladi"
            value={recPrice}
            onChange={(e) => setRecPrice(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
            Ushbu filial uchun minimal sotuv narxi (UZS)
          </label>
          <input
            type="number"
            step="any"
            className="input-field"
            placeholder="Bo‘sh qoldirilsa, asosiy narx ishlatiladi"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
            Ushbu filial uchun 1-Narx (Hamkor narxi, UZS)
          </label>
          <input
            type="number"
            step="any"
            className="input-field"
            placeholder="Bo‘sh qoldirilsa, asosiy narx ishlatiladi"
            value={partnerPrice}
            onChange={(e) => setPartnerPrice(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <button
            type="button"
            onClick={handleResetToBase}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} />
            <span>Asosiy narxga qaytarish</span>
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
