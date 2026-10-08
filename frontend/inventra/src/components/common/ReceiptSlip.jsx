import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import InventraLogo from './InventraLogo';
import { useAuth } from '../../context/AuthContext';

/**
 * High-resolution QR Code generator optimized for thermal printer heads (203 DPI)
 * Encodes the direct electronic receipt / PDF link for the customer.
 */
export function ReceiptQRCode({ value = '', size = 84 }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x multiplier ensures crisp 1-bit thermal print
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div style={{ width: size, height: size, margin: '6px auto', background: '#ffffff', border: '1px dashed #000000' }} />
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
      <div
        className="receipt-qr-card"
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 10px',
          border: '1px dashed #000000',
          borderRadius: 4,
          background: '#ffffff',
          textAlign: 'center',
        }}
      >
        <img
          src={dataUrl}
          alt="E-Chek QR Code"
          width={size}
          height={size}
          style={{ display: 'block', margin: '0 auto', imageRendering: 'pixelated' }}
        />
        <div style={{ fontSize: 8.5, fontWeight: 700, color: '#000000', marginTop: 4, letterSpacing: '0.02em', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
          E-Chek: Skaner qiling
        </div>
      </div>
    </div>
  );
}

/**
 * Print receipt slip in a completely isolated hidden iframe.
 * Supports both standard 58mm (small portable/USB thermal printer like Uzum)
 * and 80mm (large POS thermal printer).
 * Guarantees zero leakage of web page UI, buttons, modals, or headers into the printout!
 */
export function printReceiptSlip(
  elementId = 'printable-pos-receipt',
  title = 'Inventra Savdo Cheki',
  customPaperWidth = null
) {
  const printEl = document.getElementById(elementId);
  if (!printEl) {
    window.print();
    return;
  }

  // Paper width: 58mm default (matching Uzum 58mm thermal printers) or 80mm
  const storedWidth =
    customPaperWidth ||
    (typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) ||
    '58mm';

  const is58mm = storedWidth === '58mm';
  const paperWidth = is58mm ? '58mm' : '80mm';

  // Calculate approximate content height to make roll height match content in Chrome preview & drivers
  const contentHeightPx = printEl.scrollHeight || printEl.offsetHeight || 0;
  // 1px = ~0.2646mm. Add 12mm buffer for top/bottom margins and printer tear-off
  const dynamicHeightMm = contentHeightPx > 50
    ? `${Math.max(80, Math.ceil(contentHeightPx * 0.265) + 12)}mm`
    : (is58mm ? '210mm' : '297mm');

  const pageSizeRule = `${paperWidth} ${dynamicHeightMm}`;

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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${pageSizeRule};
            margin: 0mm;
          }
          @media print {
            @page {
              size: ${pageSizeRule};
              margin: 0mm;
            }
            html {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            body {
              margin: 0 auto !important;
              padding: 0 !important;
              width: 100% !important;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'JetBrains Mono', 'SF Mono', Consolas, 'Courier New', monospace !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            -webkit-font-smoothing: antialiased;
          }
          .receipt-print-wrapper {
            width: 100% !important;
            max-width: ${is58mm ? '54mm' : '76mm'} !important;
            margin: 0 auto !important;
            padding: ${is58mm ? '1.5mm 2.5mm 3.5mm 2.5mm' : '2.5mm 4mm 5mm 4mm'} !important;
            box-sizing: border-box !important;
            text-align: left;
          }
          .no-print {
            display: none !important;
          }
          img, svg {
            display: block;
            margin: 0 auto;
            max-width: 100%;
          }
          @media print {
            .receipt-dashed-line {
              border-top: 1px dashed #000000 !important;
            }
            .receipt-total-box {
              background: transparent !important;
              border: 1px solid #000000 !important;
            }
            .receipt-qr-card {
              background: transparent !important;
              border: 1px dashed #000000 !important;
            }
            .receipt-tag {
              border: 1px solid #000000 !important;
              background: transparent !important;
              color: #000000 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-print-wrapper">
          ${printEl.innerHTML}
        </div>
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
  }, 250);
}

/**
 * Procedural barcode visual SVG generator with guard bars and mathematically centered bars
 */
export function ReceiptBarcode({ value = 'POS-00000', width = 145 }) {
  const seedStr = value || 'INVENTRA';
  // Standard structured retail barcode simulation with solid start & stop guard bars
  const elements = [{ w: 2.2, gap: false }];
  for (let i = 0; i < 36; i++) {
    const charCode = seedStr.charCodeAt(i % seedStr.length);
    const w = ((charCode + i * 7) % 3) + 1.2;
    const isGap = (i + charCode) % 4 === 0;
    elements.push({ w, gap: isGap });
  }
  elements.push({ w: 2.2, gap: false });

  // Compute exact total pattern width and startX for 100% mathematical center alignment
  const totalPatternWidth = elements.reduce(
    (acc, el, idx) => acc + el.w + (idx < elements.length - 1 ? 1.2 : 0),
    0
  );
  const startX = Math.max(0, (width - totalPatternWidth) / 2);

  const drawnBars = [];
  let curX = startX;
  elements.forEach((el, idx) => {
    if (!el.gap) {
      drawnBars.push(
        <rect key={idx} x={curX.toFixed(2)} y="2" width={el.w.toFixed(2)} height="26" fill="#000000" />
      );
    }
    curX += el.w + 1.2;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 10, textAlign: 'center' }}>
      <svg
        width={width}
        height="30"
        viewBox={`0 0 ${width} 30`}
        style={{ margin: '0 auto', display: 'block' }}
      >
        <rect width={width} height="30" fill="#ffffff" />
        <g fill="#000000">{drawnBars}</g>
      </svg>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#000000', marginTop: 3, fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace", whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 600 }}>
        {value}
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
  paperWidth = null,
  showQrCode = true,
}) {
  const { user } = useAuth();

  const effectivePaperWidth =
    paperWidth ||
    (typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) ||
    '58mm';
  const is58mm = effectivePaperWidth === '58mm';

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
        padding: is58mm ? '12px 10px 16px 10px' : '16px 14px 20px 14px',
        borderRadius: 4,
        fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, 'Courier New', monospace",
        fontSize: is58mm ? 10 : 11,
        lineHeight: 1.35,
        width: '100%',
        maxWidth: is58mm ? 260 : 340,
        margin: '0 auto',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.18)',
        border: '1px solid #e5e7eb',
        textAlign: 'left',
        userSelect: 'text',
        boxSizing: 'border-box',
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
              marginBottom: sIdx < salesList.length - 1 ? 20 : 0,
              paddingBottom: sIdx < salesList.length - 1 ? 16 : 0,
              borderBottom: sIdx < salesList.length - 1 ? '1px dashed #000000' : 'none',
            }}
          >
            {/* Header: Logo & Store Info */}
            <div style={{ textAlign: 'center', marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <InventraLogo size={26} showBadge={false} textColor="#000000" />
              </div>
              <div
                style={{
                  fontSize: is58mm ? 12 : 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#000000',
                  marginTop: 2,
                }}
              >
                {store}
              </div>
              {sale?.branch_name && (
                <div style={{ fontSize: is58mm ? 9.5 : 10.5, fontWeight: 600, color: '#000000', marginTop: 1 }}>
                  Filial: {sale.branch_name}
                </div>
              )}
              {sale?.branch_address && (
                <div style={{ fontSize: is58mm ? 8.5 : 9.5, color: '#000000', marginTop: 1 }}>
                  {sale.branch_address}
                </div>
              )}
              {sale?.branch_phone && (
                <div style={{ fontSize: is58mm ? 8.5 : 9.5, color: '#000000', marginTop: 1 }}>
                  Tel: {sale.branch_phone}
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#000000',
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
                margin: '6px 0',
              }}
            />

            {/* Receipt Meta Details */}
            <div style={{ fontSize: is58mm ? 9.5 : 10.5, color: '#000000', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Chek:</span>
                <span style={{ fontWeight: 700 }}>#{receiptNo}</span>
              </div>
              {sale?.branch_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>Filial:</span>
                  <span style={{ fontWeight: 600 }}>{sale.branch_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Sana:</span>
                <span>{formatDate(sale?.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Kassir:</span>
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                  {sale?.sold_by_name || cashier}
                </span>
              </div>
              {counterparty && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>Mijoz:</span>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                    {counterparty}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>To‘lov:</span>
                <span style={{ fontWeight: 700 }}>
                  {formatPaymentType(sale?.payment_type)}
                </span>
              </div>
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0',
              }}
            />

            {/* Items Column Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: is58mm ? 9.5 : 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                borderBottom: '1px solid #000000',
                paddingBottom: 3,
                marginBottom: 5,
              }}
            >
              <span style={{ flex: 1 }}>TOVAR NOMI</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>JAMI</span>
            </div>

            {/* Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                  <div key={idx} style={{ fontSize: is58mm ? 9.5 : 10.5 }}>
                    <div style={{ fontWeight: 700, color: '#000000', wordBreak: 'break-word', lineHeight: 1.25 }}>
                      {idx + 1}. {name}{variantExtra}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: '#000000', marginTop: 1, paddingLeft: 6 }}>
                      <span style={{ fontSize: is58mm ? 9 : 10 }}>
                        {formatQty(qty, unit)} × {formatMoney(unitPrice, cur)}
                      </span>
                      <span style={{ fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {formatMoney(lineTotal, cur)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '7px 0 5px',
              }}
            />

            {/* Total Section (Pure receipt text, NO gray boxes/frames!) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '2px 0',
              }}
            >
              <span style={{ fontSize: is58mm ? 12 : 13, fontWeight: 700, textTransform: 'uppercase' }}>
                JAMI:
              </span>
              <span style={{ fontSize: is58mm ? 14 : 16, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {formatMoney(totalAmount, cur)}
              </span>
            </div>

            {/* Optional Cash & Change Breakdown */}
            {sale?.payment_type === 'cash' && (isUsd ? paidAmountUSD : paidAmountUZS) && (
              <div
                style={{
                  borderTop: '1px dotted #000000',
                  marginTop: 4,
                  paddingTop: 4,
                  fontSize: is58mm ? 9.5 : 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>Naqd:</span>
                  <span>{formatMoney(isUsd ? paidAmountUSD : paidAmountUZS, cur)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 700 }}>
                  <span>Qaytim:</span>
                  <span>{formatMoney(isUsd ? (changeDueUSD || 0) : (changeDueUZS || 0), cur)}</span>
                </div>
              </div>
            )}

            {/* Separator */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '7px 0 5px',
              }}
            />

            {/* QR Code (Has dashed border frame!) */}
            {showQrCode && (
              <ReceiptQRCode
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/r/${receiptNo}`
                    : `https://app.inventra.uz/r/${receiptNo}`
                }
                size={is58mm ? 84 : 105}
              />
            )}

            {/* Barcode */}
            <ReceiptBarcode value={receiptNo} width={is58mm ? 145 : 180} />

            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontWeight: 700 }}>XARIDINGIZ UCHUN RAHMAT!</div>
              <div>Iltimos, chekni saqlab qo‘ying.</div>
              <div style={{ marginTop: 2, fontSize: 8.5, color: '#000000' }}>www.inventra.uz</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
