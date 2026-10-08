import React from 'react';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  CheckCheck,
  TrendingUp,
  CreditCard,
  Banknote,
  Clock,
  User,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import InventraLogo from './InventraLogo';
import { useAuth } from '../../context/AuthContext';

/**
 * Modern, clean, notification-inspired Z-Report UI component.
 * Displays rich summary cards, payment distribution, itemized incomes/expenses,
 * and discrepancy alerts before printing.
 */
export default function ZReportModernView({
  report = null,
  onPrint = null,
  onClose = null,
  activeView = 'modern',
  onToggleView = null,
}) {
  const { user } = useAuth();

  if (!report) return null;

  const store = report?.tenant_name || user?.tenant_name || user?.tenant?.name || 'Inventra Savdo Markazi';
  const cashier = report?.closed_by_name || report?.user_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Admin');

  const formatUzs = (val) => `${Math.round(Number(val || 0)).toLocaleString('uz-UZ')} UZS`;
  const formatUsd = (val) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
  const isZeroDiff = dUzs === 0 && dUsd === 0;

  const hasUsdActivity =
    cashSalesUsd > 0 ||
    cardSalesUsd > 0 ||
    debtSalesUsd > 0 ||
    extraIncomeUsd > 0 ||
    expensesUsd > 0 ||
    expectedCashUsd > 0 ||
    actualCashUsd > 0 ||
    dUsd !== 0;

  const formatDualLine = (uzsVal, usdVal, { prefix = '', forceUsd = false } = {}) => {
    const uzs = Number(uzsVal || 0);
    const usd = Number(usdVal || 0);
    const uzsText = `${prefix}${formatUzs(uzs)}`;
    if (usd !== 0 || forceUsd) {
      const usdSign = usd < 0 ? '-' : prefix;
      const usdText = `${usdSign}${formatUsd(Math.abs(usd))}`;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{uzsText}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{usdText}</span>
        </span>
      );
    }
    return <span>{uzsText}</span>;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--text-primary)',
        fontSize: 13,
      }}
    >
      {/* Top Banner & Metadata */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InventraLogo size={28} showBadge={true} badgeText="POS" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Z-HISOBOT (KASSA SMENASI)
                </h3>
                <span
                  style={{
                    background: 'var(--bg-chip)',
                    color: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  #Z-{report.id}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Building size={13} />
                <span>{store}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} />
            <span>YOPILGAN (Z-Report)</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            paddingTop: 10,
            borderTop: '1px dashed var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="var(--text-muted)" />
            <span>Yopilgan:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {formatDate(report.closed_at || report.date)}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={13} color="var(--text-muted)" />
            <span>Kassir (Mas’ul):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{cashier}</strong>
          </div>
        </div>
      </div>

      {/* 3 KPI Cards: Kassa Balansi, Haqiqiy sanoq, Tafovut */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        }}
      >
        {/* Card 1: Kutilgan Naqd Pul */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11.5 }}>
            <Wallet size={13} />
            <span>Kutilgan Naqd Pul</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatUzs(expectedCashUzs)}
          </div>
          {hasUsdActivity && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {formatUsd(expectedCashUsd)}
            </div>
          )}
        </div>

        {/* Card 2: Haqiqiy Sanalgan */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: 11.5 }}>
            <CheckCheck size={13} />
            <span>Haqiqiy Sanalgan</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
            {formatUzs(actualCashUzs)}
          </div>
          {hasUsdActivity && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
              {formatUsd(actualCashUsd)}
            </div>
          )}
        </div>

        {/* Card 3: Tafovut */}
        <div
          style={{
            background: isZeroDiff
              ? 'rgba(16, 185, 129, 0.05)'
              : 'rgba(239, 68, 68, 0.06)',
            border: `1px solid ${
              isZeroDiff ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'
            }`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isZeroDiff ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            {isZeroDiff ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>Tafovut (Farq)</span>
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: isZeroDiff ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            }}
          >
            {isZeroDiff ? (
              '0 UZS'
            ) : (
              <span>
                {dUzs !== 0 && `${dUzs > 0 ? '+' : ''}${formatUzs(dUzs)}`}
                {dUzs !== 0 && dUsd !== 0 && ' / '}
                {dUsd !== 0 && `${dUsd > 0 ? '+' : ''}${formatUsd(dUsd)}`}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isZeroDiff ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            }}
          >
            {isZeroDiff ? "Kassa to'liq" : (dUzs < 0 || dUsd < 0 ? 'Kamomad aniqlandi' : 'Ortiqcha pul')}
          </div>
        </div>
      </div>

      {/* Tafovut Sababi Alert (agar mavjud bo'lsa) */}
      {!isZeroDiff && report.discrepancy_reason && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--accent-rose)',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Farq sababi:</strong> {report.discrepancy_reason}
          </div>
        </div>
      )}

      {/* Section 1: Savdo Tushumlari */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 10,
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
            <TrendingUp size={15} color="var(--primary)" />
            <span>SAVDO TUSHUMLARI (TO‘LOV TURLARI)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Banknote size={13} />
              <span>Naqd savdo:</span>
            </span>
            <strong>{formatDualLine(cashSalesUzs, cashSalesUsd, { forceUsd: hasUsdActivity })}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={13} />
              <span>Bank kartasi:</span>
            </span>
            <strong>{formatDualLine(cardSalesUzs, cardSalesUsd, { forceUsd: hasUsdActivity && cardSalesUsd > 0 })}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileText size={13} />
              <span>Nasiya (Qarz):</span>
            </span>
            <strong>{formatDualLine(debtSalesUzs, debtSalesUsd, { forceUsd: hasUsdActivity && debtSalesUsd > 0 })}</strong>
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: '1px dashed var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13.5,
              fontWeight: 800,
            }}
          >
            <span>JAMI SAVDO:</span>
            <span style={{ color: 'var(--primary)' }}>
              {formatDualLine(totalSalesUzs, totalSalesUsd, { forceUsd: hasUsdActivity })}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Qo'shimcha Kirimlar (agar mavjud bo'lsa) */}
      {(extraIncomeUzs > 0 || extraIncomeUsd > 0 || (report.incomes && report.incomes.length > 0)) && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--accent-emerald)' }}>
              <ArrowDownLeft size={15} />
              <span>QO‘SHIMCHA KIRIMLAR</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {formatDualLine(extraIncomeUzs, extraIncomeUsd, { prefix: '+', forceUsd: extraIncomeUsd > 0 })}
            </span>
          </div>

          {report.incomes && report.incomes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {report.incomes.map((inc) => (
                <div
                  key={inc.id || inc.source}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'var(--bg-chip)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    • <strong>{inc.source}</strong>
                    {inc.note ? ` (${inc.note})` : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{inc.currency === 'USD' ? formatUsd(inc.amount) : formatUzs(inc.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Chiqimlar (agar mavjud bo'lsa) */}
      {(expensesUzs > 0 || expensesUsd > 0 || (report.expenses && report.expenses.length > 0)) && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--accent-rose)' }}>
              <ArrowUpRight size={15} />
              <span>KASSADAN CHIQIMLAR (XARAJATLAR)</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>
              {formatDualLine(expensesUzs, expensesUsd, { prefix: '-', forceUsd: expensesUsd > 0 })}
            </span>
          </div>

          {report.expenses && report.expenses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {report.expenses.map((exp) => (
                <div
                  key={exp.id || exp.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'var(--bg-chip)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    • <strong>{exp.category}</strong>
                    {exp.note ? ` (${exp.note})` : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>
                    -{exp.currency === 'USD' ? formatUsd(exp.amount) : formatUzs(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Notes (agar mavjud bo'lsa) */}
      {report.staff_notes && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Xodim izohi:</strong> {report.staff_notes}
        </div>
      )}

      {/* Action Footer */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginTop: 6,
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onToggleView && (
            <button
              type="button"
              onClick={() => onToggleView(activeView === 'modern' ? 'slip' : 'modern')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {activeView === 'modern' ? "🧾 Kassa cheki ko'rinishi" : "📊 Hisobot ko'rinishi"}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Yopish
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary)',
                color: 'var(--primary-foreground, #ffffff)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Printer size={16} />
              <span>Chop etish</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
