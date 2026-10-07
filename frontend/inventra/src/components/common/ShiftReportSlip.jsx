import React from 'react';
import InventraLogo from './InventraLogo';
import { ReceiptBarcode } from './ReceiptSlip';
import { useAuth } from '../../context/AuthContext';

/**
 * Authentic 80mm Thermal Z-Report Slip Component (Smena / Kassa Z-Hisoboti)
 */
export default function ShiftReportSlip({
  report = null,
  id = 'printable-z-report',
  className = '',
}) {
  const { user } = useAuth();

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

  const cashSales = Number(report.total_sale_cash_uzs || 0);
  const cardSales = Number(report.total_sale_card_uzs || 0);
  const debtSales = Number(report.total_sale_debt_uzs || 0);
  const totalSales = cashSales + cardSales + debtSales;

  const extraIncome = Number(report.total_extra_income_uzs || 0);
  const expenses = Number(report.total_expenses_uzs || 0);

  const expectedCashUzs = Number(report.expected_cash_uzs || 0);
  const expectedCashUsd = Number(report.expected_cash_usd || 0);

  const actualCashUzs = Number(report.actual_cash_uzs || 0);
  const actualCashUsd = Number(report.actual_cash_usd || 0);

  const dUzs = Number(report.discrepancy_uzs || 0);
  const dUsd = Number(report.discrepancy_usd || 0);
  const isDiscrepancyZero = dUzs === 0 && dUsd === 0;

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
      {/* Header: Logo & Store Info */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
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
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#000000',
            marginTop: 3,
          }}
        >
          *** Z - HISOBOT (KASSA SMENASI) ***
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }} />

      {/* Report Meta Details */}
      <div style={{ fontSize: 11, color: '#111111', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Hisobot raqami:</span>
          <strong style={{ fontFamily: 'monospace' }}>#Z-{report.id}</strong>
        </div>
        {report.opened_at && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Smena ochilgan:</span>
            <span>{formatDate(report.opened_at)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Smena yopilgan:</span>
          <span>{formatDate(report.closed_at || report.date)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Kassir (Mas’ul):</span>
          <strong>{cashier}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Smena holati:</span>
          <strong>YOPILGAN (Z-Report)</strong>
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }} />

      {/* Section 1: Savdo Tushumlari */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
        SAVDO TUSHUMLARI (TO‘LOV TURLARI)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• Naqd savdo:</span>
          <strong>{formatMoney(cashSales)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• Bank kartasi:</span>
          <strong>{formatMoney(cardSales)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• Nasiya (Qarz):</span>
          <strong>{formatMoney(debtSales)}</strong>
        </div>
        <div
          style={{
            borderTop: '1px dotted #666666',
            marginTop: 3,
            paddingTop: 3,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>JAMI SAVDO:</span>
          <span>{formatMoney(totalSales)}</span>
        </div>
      </div>

      {/* Section 2: Qo'shimcha Kirimlar (agar mavjud bo'lsa) */}
      {(extraIncome > 0 || (report.incomes && report.incomes.length > 0)) && (
        <>
          <div style={{ borderTop: '1px dashed #000000', margin: '8px 0 6px' }} />
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
            QO‘SHIMCHA KIRIMLAR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
            {report.incomes && report.incomes.length > 0 ? (
              report.incomes.map((inc) => (
                <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• {inc.source}{inc.note ? ` (${inc.note})` : ''}:</span>
                  <strong>+{formatMoney(inc.amount, inc.currency)}</strong>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Jami kirim:</span>
                <strong>+{formatMoney(extraIncome)}</strong>
              </div>
            )}
            <div
              style={{
                borderTop: '1px dotted #666666',
                marginTop: 2,
                paddingTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
              }}
            >
              <span>Jami Kirim:</span>
              <span>+{formatMoney(extraIncome)}</span>
            </div>
          </div>
        </>
      )}

      {/* Section 3: Chiqimlar (agar mavjud bo'lsa) */}
      {(expenses > 0 || (report.expenses && report.expenses.length > 0)) && (
        <>
          <div style={{ borderTop: '1px dashed #000000', margin: '8px 0 6px' }} />
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
            KASSADAN CHIQIMLAR (XARAJATLAR)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
            {report.expenses && report.expenses.length > 0 ? (
              report.expenses.map((exp) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• {exp.category}{exp.note ? ` (${exp.note})` : ''}:</span>
                  <strong>-{formatMoney(exp.amount, exp.currency)}</strong>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Jami chiqim:</span>
                <strong>-{formatMoney(expenses)}</strong>
              </div>
            )}
            <div
              style={{
                borderTop: '1px dotted #666666',
                marginTop: 2,
                paddingTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
              }}
            >
              <span>Jami Chiqim:</span>
              <span>-{formatMoney(expenses)}</span>
            </div>
          </div>
        </>
      )}

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '8px 0 6px' }} />

      {/* Section 4: Kassa Balansi va Sanoq */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
        KASSA BALANSI VA HAQIQIY SANOQ
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Kutilgan naqd pul:</span>
          <strong>
            {formatMoney(expectedCashUzs)}
            {expectedCashUsd > 0 && ` / $${expectedCashUsd.toFixed(2)}`}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Haqiqiy sanalgan:</span>
          <strong>
            {formatMoney(actualCashUzs)}
            {actualCashUsd > 0 && ` / $${actualCashUsd.toFixed(2)}`}
          </strong>
        </div>
        <div
          style={{
            borderTop: '1px dotted #666666',
            marginTop: 3,
            paddingTop: 3,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>TAFOVUT (FARQ):</span>
          <span>{diffText}</span>
        </div>

        {((dUzs !== 0) || (dUsd !== 0)) && report.discrepancy_reason && (
          <div style={{ marginTop: 4, padding: '4px 6px', border: '1px solid #000000', fontSize: 10 }}>
            <strong>Farq sababi:</strong> {report.discrepancy_reason}
          </div>
        )}

        {report.staff_notes && (
          <div style={{ marginTop: 2, fontSize: 10, color: '#333333' }}>
            <strong>Xodim eslatmasi:</strong> {report.staff_notes}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000000', margin: '10px 0 8px' }} />

      {/* Barcode & Footer */}
      <ReceiptBarcode value={barcodeVal} />

      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#333333' }}>
        <div style={{ fontWeight: 700 }}>SMENA MUVAFFAQIYATLI YOPILDI</div>
        <div>Inventra POS tizimi • Z-Hisobot</div>
        <div style={{ marginTop: 2, fontSize: 9, color: '#666666' }}>www.inventra.uz</div>
      </div>
    </div>
  );
}
