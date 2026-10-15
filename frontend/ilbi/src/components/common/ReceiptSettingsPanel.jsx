import React from 'react';
import { Save } from 'lucide-react';
import ReceiptSlip from './ReceiptSlip';
import { calculateTaxLine } from '../../utils/receiptTax';

const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-primary)' };
const labelStyle = { display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' };

export default function ReceiptSettingsPanel({ tenant, value, onChange, onSave, saving, previewDate }) {
  const set = (field, val) => onChange(previous => ({ ...previous, [field]: val }));
  const vatAllowed = ['general', 'other'].includes(value.tax_regime);
  const snapshot = { ...tenant.receipt_settings, ...value, store_name: tenant.name, store_address: value.address };
  const amounts = calculateTaxLine(1, 100000, snapshot);
  const preview = {
    id: 'settings-preview', receipt_number: 'NAMUNA', created_at: previewDate.toISOString(), currency: 'UZS',
    receipt_snapshot: snapshot, tenant_name: tenant.name, sold_by_name: 'Namuna kassir', counterparty_name: 'Namuna mijoz',
    payment_type: 'cash', total_amount: amounts.totalAmount, subtotal_amount: amounts.netAmount, tax_amount: amounts.taxAmount,
    items: [{ id: 'sample', product_name: 'Namuna mahsulot', quantity: 1, unit: 'dona', unit_price: 100000,
      total_price: amounts.totalAmount, tax_amount: amounts.taxAmount, tax_rate: value.is_vat_payer ? value.vat_rate : null }],
  };
  const percent = (field, label, disabled = false) => (
    <label style={labelStyle}>{label}
      <input type="number" min="0" max="100" step="0.01" value={value[field]} disabled={disabled}
        onChange={e => set(field, e.target.value)} style={fieldStyle} />
    </label>
  );
  const toggle = (field, label, disabled = false) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
      <input type="checkbox" checked={Boolean(value[field])} disabled={disabled} onChange={e => set(field, e.target.checked)} />{label}
    </label>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
      <div className="glass-card" style={{ padding: 24, display: 'grid', gap: 18, alignContent: 'start' }}>
        <h3 style={{ margin: 0 }}>Chek va soliq sozlamalari</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Sotuvchi: <strong>{snapshot.seller_name || 'Profil biriktirilmagan'}</strong><br />
          STIR / JShShIR: <strong>{snapshot.seller_tax_identifier || 'Kiritilmagan'}</strong><br />
          Rasmiy rekvizitlar do‘konga biriktirilgan sotuvchi profilidan olinadi.
        </div>
        <label style={labelStyle}>Soliq rejimi
          <select value={value.tax_regime} style={fieldStyle} onChange={e => {
            const regime = e.target.value;
            onChange(previous => ({ ...previous, tax_regime: regime,
              ...(!['general', 'other'].includes(regime) ? { is_vat_payer: false, profit_tax_enabled: false } : {}) }));
          }}>
            <option value="unspecified">Belgilanmagan</option>
            <option value="general">Umumbelgilangan (QQS / foyda solig‘i)</option>
            <option value="turnover">Aylanmadan olinadigan soliq (AOS)</option>
            <option value="other">Boshqa soliq rejimi</option>
          </select>
        </label>
        {value.tax_regime === 'other' && <label style={labelStyle}>Soliq rejimi nomi
          <input style={fieldStyle} maxLength={150} value={value.tax_regime_name} onChange={e => set('tax_regime_name', e.target.value)} />
        </label>}
        {vatAllowed && <>
          {toggle('is_vat_payer', 'Do‘kon QQS to‘lovchisi')}
          {value.is_vat_payer && <>
            {percent('vat_rate', 'QQS stavkasi (%)')}
            <label style={labelStyle}>Katalog va POSdagi kiritilgan narxlar
              <select style={fieldStyle} value={value.price_includes_vat ? 'included' : 'excluded'} onChange={e => set('price_includes_vat', e.target.value === 'included')}>
                <option value="included">QQS narx ichiga kiritilgan</option>
                <option value="excluded">QQS narx ustiga qo‘shiladi</option>
              </select>
            </label>
          </>}
          {toggle('profit_tax_enabled', 'Foyda solig‘i to‘laydi')}
          {value.profit_tax_enabled && percent('profit_tax_rate', 'Foyda solig‘i stavkasi (%)')}
        </>}
        {value.tax_regime === 'turnover' && percent('turnover_tax_rate', 'AOS stavkasi (%)')}
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          AOS va foyda solig‘i sotuvchining soliq sozlamalari sifatida saqlanadi; xaridor summasiga qo‘shilmaydi.
          Foyda solig‘i bazasi davr daromadlari va chegiriladigan xarajatlarga bog‘liq; bitta chekdan hisoblanmaydi.
          Stavkalarni amaldagi soliq maqomingizga mos kiriting. O‘zgarishlar yangi savdolarga qo‘llanadi.
        </div>
        <label style={labelStyle}>Do‘konning to‘liq manzili
          <input style={fieldStyle} maxLength={255} value={value.address} onChange={e => set('address', e.target.value)} />
        </label>
        <label style={labelStyle}>Chek yuqori qismidagi matn
          <textarea style={fieldStyle} rows={2} value={value.receipt_header} onChange={e => set('receipt_header', e.target.value)} />
        </label>
        <label style={labelStyle}>Chek pastki qismidagi matn
          <textarea style={fieldStyle} rows={3} value={value.receipt_footer} onChange={e => set('receipt_footer', e.target.value)} />
        </label>
        <label style={labelStyle}>Aloqa telefoni
          <input style={fieldStyle} maxLength={30} value={value.receipt_phone} onChange={e => set('receipt_phone', e.target.value)} />
        </label>
        <label style={labelStyle}>Standart chek qog‘ozi
          <select style={fieldStyle} value={value.receipt_paper_width} onChange={e => set('receipt_paper_width', e.target.value)}>
            <option value="58mm">58 mm</option><option value="80mm">80 mm</option>
          </select>
        </label>
        {toggle('receipt_show_item_tax', 'Har bir mahsulotda QQS foizi va summasini ko‘rsatish')}
        {toggle('receipt_show_cashier', 'Kassir nomini ko‘rsatish')}
        {toggle('receipt_show_customer', 'Ichki chekda mijoz nomini ko‘rsatish')}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>
          <Save size={16} />{saving ? 'Saqlanmoqda...' : 'Chek va soliq sozlamalarini saqlash'}
        </button>
      </div>
      <div className="glass-card" style={{ padding: 24, alignSelf: 'start' }}>
        <h3 style={{ marginTop: 0 }}>Chek namunasi</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>100 000 so‘mlik kiritilgan narx asosida. Fiskal chek emas.</p>
        <ReceiptSlip id="receipt-settings-preview" sales={[preview]} paperWidth={value.receipt_paper_width} showQrCode={false} />
      </div>
    </div>
  );
}
