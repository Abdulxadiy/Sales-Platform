import React from 'react';

export default function ReceiptTaxSummary({ sale, formatMoney }) {
  const config = sale?.receipt_snapshot;
  if (!config?.version || sale.tax_amount == null) return null;
  if (config.tax_regime === 'unspecified') return <div style={{ fontSize: 10 }}>Soliq rejimi belgilanmagan</div>;
  if (!config.is_vat_payer) return <div style={{ fontSize: 11, marginTop: 5 }}>QQSsiz</div>;
  const rate = Number(config.vat_rate || 0).toLocaleString('uz-UZ');
  return (
    <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
      {!config.price_includes_vat && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>QQSsiz qiymat:</span><strong>{formatMoney(sale.subtotal_amount, sale.currency)}</strong>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{config.price_includes_vat ? 'Shu jumladan' : 'Qo‘shilgan'} QQS {rate}%:</span>
        <strong>{formatMoney(sale.tax_amount, sale.currency)}</strong>
      </div>
    </div>
  );
}
