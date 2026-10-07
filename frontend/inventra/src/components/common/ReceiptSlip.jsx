import React from 'react';
import InventraLogo from './InventraLogo';
import { useAuth } from '../../context/AuthContext';

/**
 * Print receipt slip in a completely isolated hidden iframe.
 * Guarantees zero leakage of web page UI, buttons, modals, or headers into the printout!
 */
export function printReceiptSlip(elementId = 'printable-pos-receipt', title = 'Inventra Savdo Cheki') {
  const printEl = document.getElementById(elementId);
  if (!printEl) {
    window.print();
    return;
  }

  // Remove any previously created print iframe
  const existingIframe = document.getElementById('inventra-thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'inventra-thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="uz">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif;
            width: 78mm;
            max-width: 78mm;
            margin: 0 !important;
            margin-left: 0 !important;
            margin-right: auto !important;
            padding: 4mm 3mm 8mm 3mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .thermal-receipt-paper,
          #printable-pos-receipt,
          #printable-receipt,
          #printable-z-report,
          #printable-shift-report {
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          svg {
            display: block;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        ${printEl.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      window.print();
    }
  }, 200);
}

/**
 * Procedural barcode visual SVG generator for authentic thermal receipts
 */
export function ReceiptBarcode({ value = 'POS-00000' }) {
  // Generate consistent bar widths based on char codes of the value
  const bars = [];
  const seedStr = value || 'INVENTRA';
  for (let i = 0; i < 48; i++) {
    const charCode = seedStr.charCodeAt(i % seedStr.length);
    const width = ((charCode + i * 7) % 3) + 1.2;
    const isGap = (i + charCode) % 5 === 0;
    bars.push({ width, isGap });
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 10 }}>
      <svg
        width="180"
        height="36"
        viewBox="0 0 180 36"
        style={{ margin: '0 auto', display: 'block' }}
      >
        <rect width="180" height="36" fill="#ffffff" />
        <g fill="#000000">
          {bars.reduce((acc, bar, idx) => {
            const currentX = acc.currentX;
            if (!bar.isGap) {
              acc.elements.push(
                <rect key={idx} x={currentX} y="2" width={bar.width} height="32" fill="#000000" />
              );
            }
            acc.currentX += bar.width + 1.2;
            return acc;
          }, { currentX: 10, elements: [] }).elements}
        </g>
      </svg>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#111', marginTop: 2, fontFamily: 'monospace' }}>
        *{value}*
      </div>
    </div>
  );
}

/**
 * Reusable Thermal POS Receipt Component
 */
export default function ReceiptSlip({
  sales = [],
  paidAmountUZS = null,
  paidAmountUSD = null,
  changeDueUZS = null,
  changeDueUSD = null,
  storeName = null,
  cashierName = null,
  id = 'printable-pos-receipt',
  className = '',
}) {
  const { user } = useAuth();

  // Normalize sales to array
  const salesList = Array.isArray(sales) ? sales : sales ? [sales] : [];

  const store = storeName || user?.tenant_name || user?.tenant?.name || 'INVENTRA SAVDO MARKAZI';
  const cashier =
    cashierName ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'Kassir');

  const formatMoney = (val, cur = 'UZS') => {
    const num = Number(val || 0);
    if (cur === 'USD') {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(num).toLocaleString('uz-UZ')} UZS`;
  };

  const formatQty = (qty, unit) => {
    const n = Number(qty || 0);
    const unitStr = unit || 'ta';
    return `${Number.isInteger(n) ? n : n.toFixed(2)} ${unitStr}`;
  };

  const formatPaymentType = (type) => {
    const t = String(type || 'cash').toLowerCase();
    if (t === 'card') return 'BANK KARTASI';
    if (t === 'debt') return 'NASIYA (QARZ)';
    return 'NAQD PUL';
  };

  const formatDate = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      id={id}
      className={`thermal-receipt-paper ${className}`}
      style={{
        background: '#ffffff',
        color: '#000000',
        padding: '20px 18px',
        borderRadius: 4,
        fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif",
        fontSize: 12,
        lineHeight: 1.35,
        width: '100%',
        maxWidth: 360,
        margin: '0 auto',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.2)',
        border: '1px solid #e5e7eb',
        textAlign: 'left',
        userSelect: 'text',
      }}
    >
      {salesList.map((sale, sIdx) => {
        const cur = sale?.currency || 'UZS';
        const isUsd = cur === 'USD';
        const receiptNo = sale?.receipt_number || sale?.id || `POS-${Date.now()}`;
        const items = sale?.items || [];
        const totalAmount = Number(sale?.total_amount || 0);
        const counterparty = sale?.counterparty_name || sale?.counterparty?.name;

        return (
          <div
            key={sale?.id || sIdx}
            style={{
              marginBottom: sIdx < salesList.length - 1 ? 24 : 0,
              paddingBottom: sIdx < salesList.length - 1 ? 20 : 0,
              borderBottom: sIdx < salesList.length - 1 ? '2px dashed #9ca3af' : 'none',
            }}
          >
            {/* Header: Logo & Store Info */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <InventraLogo size={32} showBadge={false} textColor="#000000" />
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#000000',
                  marginTop: 4,
                }}
              >
                {store}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#333333',
                  marginTop: 2,
                }}
              >
                *** SAVDO CHEKI ***
              </div>
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '8px 0',
              }}
            />

            {/* Receipt Meta Details */}
            <div style={{ fontSize: 11, color: '#111111', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Chek raqami:</span>
                <strong style={{ fontFamily: 'monospace' }}>#{receiptNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sana / Vaqt:</span>
                <span>{formatDate(sale?.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kassir:</span>
                <strong>{sale?.sold_by_name || cashier}</strong>
              </div>
              {counterparty && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mijoz:</span>
                  <strong>{counterparty}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>To‘lov turi:</span>
                <strong>{formatPaymentType(sale?.payment_type)}</strong>
              </div>
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '8px 0',
              }}
            />

            {/* Items Column Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                borderBottom: '1px solid #000000',
                paddingBottom: 4,
                marginBottom: 6,
              }}
            >
              <span style={{ flex: 1 }}>TOVAR NOMI</span>
              <span style={{ textAlign: 'right', minWidth: 80 }}>JAMI</span>
            </div>

            {/* Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((it, idx) => {
                const name =
                  it.product_name ||
                  it.product_variant_name ||
                  it.variant_name ||
                  it.name ||
                  `Tovar #${it.product_variant || it.id || idx + 1}`;
                const variantExtra =
                  it.product_variant_name && it.product_variant_name !== name && it.product_variant_name.toLowerCase() !== 'standart'
                    ? ` (${it.product_variant_name})`
                    : '';
                const qty = Number(it.quantity || 1);
                const unitPrice = Number(it.unit_price || 0);
                const lineTotal = Number(it.total_price || (unitPrice * qty) || 0);
                const unit = it.unit || it.unit_type || 'ta';

                return (
                  <div key={idx} style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 700, color: '#000000', wordBreak: 'break-word' }}>
                      {idx + 1}. {name}{variantExtra}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#222222', marginTop: 1, paddingLeft: 12 }}>
                      <span style={{ color: '#444444' }}>
                        {formatQty(qty, unit)} × {formatMoney(unitPrice, cur)}
                      </span>
                      <strong style={{ color: '#000000', textAlign: 'right' }}>
                        {formatMoney(lineTotal, cur)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '10px 0 6px',
              }}
            />

            {/* Total Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>
                JAMI TO‘LOV ({cur}):
              </span>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace' }}>
                {formatMoney(totalAmount, cur)}
              </span>
            </div>

            {/* Optional Cash & Change Breakdown (for cash sales in POS) */}
            {sale?.payment_type === 'cash' && (isUsd ? paidAmountUSD : paidAmountUZS) && (
              <div
                style={{
                  borderTop: '1px dotted #9ca3af',
                  marginTop: 6,
                  paddingTop: 6,
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Naqd qabul qilindi:</span>
                  <span>{formatMoney(isUsd ? paidAmountUSD : paidAmountUZS, cur)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Qaytim berildi:</span>
                  <span>{formatMoney(isUsd ? (changeDueUSD || 0) : (changeDueUZS || 0), cur)}</span>
                </div>
              </div>
            )}

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '10px 0 8px',
              }}
            />

            {/* Barcode & Footer */}
            <ReceiptBarcode value={receiptNo} />

            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#333333' }}>
              <div style={{ fontWeight: 700 }}>XARIDINGIZ UCHUN RAHMAT!</div>
              <div>Iltimos, chekni saqlab qo‘ying.</div>
              <div style={{ marginTop: 2, fontSize: 9, color: '#666666' }}>www.inventra.uz</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
