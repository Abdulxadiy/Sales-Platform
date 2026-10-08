import React from 'react';
import InventraLogo from './InventraLogo';
import { ReceiptBarcode, ReceiptQRCode } from './ReceiptSlip';
import { useAuth } from '../../context/AuthContext';

/**
 * Authentic 58mm/80mm Thermal Z-Report Slip Component (Smena / Kassa Z-Hisoboti)
 */
export default function ShiftReportSlip({
  report = null,
  id = 'printable-z-report',
  className = '',
  paperWidth = null,
}) {
  const { user } = useAuth();

  const effectivePaperWidth =
    paperWidth ||
    (typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) ||
    '58mm';
  const is58mm = effectivePaperWidth === '58mm';

  if (!report) return null;

  const store = report?.tenant_name || user?.tenant_name || user?.tenant?.name || 'INVENTRA SAVDO MARKAZI';
  const cashier = report?.closed_by_name || report?.user_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Admin');

  const formatMoney = (val, cur = 'UZS') => {
    const num = Number(val || 0);
    if (cur === 'USD') {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(num).toLocaleString('uz-UZ')} UZS`;
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

  const cashSalesUzs = Number(report.total_sale_cash_uzs || 0);
  const cashSalesUsd = Number(report.total_sale_cash_usd || 0);

  const cardSalesUzs = Number(report.total_sale_card_uzs || 0);
  const cardSalesUsd = Number(report.total_sale_card_usd || 0);

  const debtSalesUzs = Number(report.total_sale_debt_uzs || 0);
  const debtSalesUsd = Number(report.total_sale_debt_usd || 0);

  const totalSalesUzs = cashSalesUzs + cardSalesUzs + debtSalesUzs;
  const totalSalesUsd = cashSalesUsd + cardSalesUsd + debtSalesUsd;

  const extraIncomeUzs = Number(report.total_extra_income_uzs || 0);
  const extraIncomeUsd = Number(report.total_extra_income_usd || 0);

  const expensesUzs = Number(report.total_expenses_uzs || 0);
  const expensesUsd = Number(report.total_expenses_usd || 0);

  const expectedCashUzs = Number(report.expected_cash_uzs || 0);
  const expectedCashUsd = Number(report.expected_cash_usd || 0);

  const actualCashUzs = Number(report.actual_cash_uzs || 0);
  const actualCashUsd = Number(report.actual_cash_usd || 0);

  const dUzs = Number(report.discrepancy_uzs || 0);
  const dUsd = Number(report.discrepancy_usd || 0);
  const isDiscrepancyZero = dUzs === 0 && dUsd === 0;

  const formatDual = (uzsVal, usdVal, { prefix = '', forceUsd = false } = {}) => {
    const uzs = Number(uzsVal || 0);
    const usd = Number(usdVal || 0);
    const uzsText = `${prefix}${Math.round(uzs).toLocaleString('uz-UZ')} UZS`;
    if (usd !== 0 || forceUsd) {
      const usdSign = usd < 0 ? '-' : prefix;
      const usdText = `${usdSign}$${Math.abs(usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${uzsText} / ${usdText}`;
    }
    return uzsText;
  };

  const hasUsdCash = expectedCashUsd > 0 || actualCashUsd > 0;

  let diffText = '0 UZS (Tafovut yo‘q — Kassa to‘liq)';
  if (!isDiscrepancyZero) {
    const parts = [];
    if (dUzs !== 0) {
      parts.push(`${dUzs > 0 ? '+' : ''}${Math.round(dUzs).toLocaleString('uz-UZ')} UZS`);
    }
    if (dUsd !== 0) {
      parts.push(`${dUsd > 0 ? '+$' : '-$'}${Math.abs(dUsd).toFixed(2)}`);
    }
    const isKamomad = dUzs < 0 || dUsd < 0;
    diffText = `${parts.join(' / ')} (${isKamomad ? 'Kamomad' : 'Ortiqcha'})`;
  }

  const barcodeVal = `Z-${String(report.id || Date.now()).padStart(5, '0')}`;

  return (
    <div
      id={id}
      className={`thermal-receipt-paper ${className}`}
      style={{
        background: '#ffffff',
        color: '#000000',
        padding: is58mm ? '10px 10px 14px 10px' : '16px 16px 20px 16px',
        borderRadius: 4,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: is58mm ? 10.5 : 12,
        lineHeight: 1.3,
        width: '100%',
        maxWidth: is58mm ? 260 : 340,
        margin: '0 auto',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.2)',
        border: '1px solid #e5e7eb',
        textAlign: 'left',
        userSelect: 'text',
        boxSizing: 'border-box',
      }}
    >
      {/* Header: Logo & Store Info */}
      <div style={{ textAlign: 'center', marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <InventraLogo size={28} showBadge={false} textColor="#000000" />
        </div>
        <div
          style={{
            fontSize: is58mm ? 12 : 13,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#000000',
            marginTop: 2,
          }}
        >
          {store}
        </div>
        <div
          style={{
            fontSize: is58mm ? 10.5 : 11.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#000000',
            marginTop: 2,
          }}
        >
          *** Z - HISOBOT (SMENA) ***
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

      {/* Report Meta Details */}
      <div style={{ fontSize: is58mm ? 10 : 11, color: '#111111', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Hisobot:</span>
          <strong style={{ fontFamily: 'monospace', fontSize: is58mm ? 10.5 : 11.5 }}>#Z-{report.id}</strong>
        </div>
        {report.opened_at && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#444444' }}>Ochilgan:</span>
            <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatDate(report.opened_at)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Yopilgan:</span>
          <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatDate(report.closed_at || report.date)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Kassir:</span>
          <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{cashier}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Holat:</span>
          <strong>YOPILGAN</strong>
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

      {/* Section 1: Savdo Tushumlari */}
      <div style={{ fontSize: is58mm ? 10 : 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
        SAVDO TUSHUMLARI
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, fontSize: is58mm ? 10 : 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>• Naqd:</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(cashSalesUzs, cashSalesUsd)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>• Karta:</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(cardSalesUzs, cardSalesUsd)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>• Nasiya:</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(debtSalesUzs, debtSalesUsd)}</strong>
        </div>
        <div
          style={{
            borderTop: '1px dotted #666666',
            marginTop: 3,
            paddingTop: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: is58mm ? 11 : 12,
            fontWeight: 800,
          }}
        >
          <span>JAMI SAVDO:</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(totalSalesUzs, totalSalesUsd)}</span>
        </div>
      </div>

      {/* Section 2: Qo'shimcha Kirimlar (agar mavjud bo'lsa) */}
      {(extraIncomeUzs > 0 || extraIncomeUsd > 0 || (report.incomes && report.incomes.length > 0)) && (
        <>
          <div style={{ borderTop: '1px dashed #000000', margin: '6px 0 5px' }} />
          <div style={{ fontSize: is58mm ? 10 : 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>
            QO‘SHIMCHA KIRIMLAR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: is58mm ? 10 : 11 }}>
            {report.incomes && report.incomes.length > 0 ? (
              report.incomes.map((inc) => (
                <div key={inc.id || inc.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ color: '#444444' }}>• {inc.source}{inc.note ? ` (${inc.note})` : ''}:</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>+{formatMoney(inc.amount, inc.currency)}</strong>
                </div>
              ))
            ) : null}
            <div
              style={{
                borderTop: '1px dotted #666666',
                marginTop: 2,
                paddingTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontWeight: 700,
              }}
            >
              <span>Jami Kirim:</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(extraIncomeUzs, extraIncomeUsd, { prefix: '+' })}</span>
            </div>
          </div>
        </>
      )}

      {/* Section 3: Chiqimlar (agar mavjud bo'lsa) */}
      {(expensesUzs > 0 || expensesUsd > 0 || (report.expenses && report.expenses.length > 0)) && (
        <>
          <div style={{ borderTop: '1px dashed #000000', margin: '6px 0 5px' }} />
          <div style={{ fontSize: is58mm ? 10 : 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>
            KASSADAN CHIQIMLAR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: is58mm ? 10 : 11 }}>
            {report.expenses && report.expenses.length > 0 ? (
              report.expenses.map((exp) => (
                <div key={exp.id || exp.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ color: '#444444' }}>• {exp.category}{exp.note ? ` (${exp.note})` : ''}:</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>-{formatMoney(exp.amount, exp.currency)}</strong>
                </div>
              ))
            ) : null}
            <div
              style={{
                borderTop: '1px dotted #666666',
                marginTop: 2,
                paddingTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontWeight: 700,
              }}
            >
              <span>Jami Chiqim:</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(expensesUzs, expensesUsd, { prefix: '-' })}</span>
            </div>
          </div>
        </>
      )}

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '6px 0 5px' }} />

      {/* Section 4: Kassa Balansi va Sanoq */}
      <div style={{ fontSize: is58mm ? 10 : 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>
        KASSA BALANSI VA SANOQ
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, fontSize: is58mm ? 10 : 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Kutilgan naqd:</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(expectedCashUzs, expectedCashUsd, { forceUsd: hasUsdCash })}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#444444' }}>Haqiqiy naqd:</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDual(actualCashUzs, actualCashUsd, { forceUsd: hasUsdCash })}</strong>
        </div>
        <div
          style={{
            borderTop: '1px dotted #666666',
            marginTop: 3,
            paddingTop: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: is58mm ? 11 : 12,
            fontWeight: 800,
          }}
        >
          <span>TAFOVUT:</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{diffText}</span>
        </div>

        {((dUzs !== 0) || (dUsd !== 0)) && report.discrepancy_reason && (
          <div style={{ marginTop: 4, padding: '4px 6px', border: '1px solid #000000', fontSize: 9.5 }}>
            <strong>Farq sababi:</strong> {report.discrepancy_reason}
          </div>
        )}

        {report.staff_notes && (
          <div style={{ marginTop: 2, fontSize: 9.5, color: '#333333' }}>
            <strong>Xodim eslatmasi:</strong> {report.staff_notes}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '8px 0 6px' }} />

      {/* Barcode & Footer */}
      <ReceiptBarcode value={barcodeVal} width={is58mm ? 140 : 180} />

      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9.5, color: '#333333', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>SMENA MUVAFFAQIYATLI YOPILDI</div>
        <div>Inventra POS tizimi • Z-Hisobot</div>
        <div style={{ marginTop: 2, fontSize: 8.5, color: '#666666' }}>www.inventra.uz</div>
      </div>
    </div>
  );
}
