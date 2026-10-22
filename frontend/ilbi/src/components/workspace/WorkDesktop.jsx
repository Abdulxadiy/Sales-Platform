import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Package,
  ArrowUpRight,
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ShoppingBag,
  Award,
  Store,
  BookOpen,
} from 'lucide-react';
import RecoveryNotice, { RetryButton } from '../common/RecoveryNotice';
import CompactSalesChart from './CompactSalesChart';
import Reminders from './Reminders';
import { workspaceApi } from '../../api/workspace';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { canUse } from '../../utils/workspace';

export default function WorkDesktop({ data, loading, period, setPeriod }) {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { isOwner } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!activeTenant?.id) return;
    const controller = new AbortController();
    workspaceApi
      .overview(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setSnapshot({ tenantId: activeTenant.id, ...response });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSnapshot({ tenantId: activeTenant.id, error: error.message });
      });
    return () => controller.abort();
  }, [activeTenant?.id, retry]);

  const overview = snapshot?.tenantId === activeTenant?.id ? snapshot : null;
  const kpi = data?.kpi || data || {};
  const store = data?.store_overview || kpi;

  const costUZS = kpi.total_cost_uzs !== undefined
    ? Number(kpi.total_cost_uzs)
    : Math.max(0, Number(kpi.total_sales_uzs || kpi.total_revenue_uzs || 0) - Number(kpi.net_profit_uzs || 0));
  const costUSD = kpi.total_cost_usd !== undefined
    ? Number(kpi.total_cost_usd)
    : Math.max(0, Number(kpi.total_sales_usd || kpi.total_revenue_usd || 0) - Number(kpi.net_profit_usd || 0));

  const formatUZS = (val) => Number(val || 0).toLocaleString('uz-UZ') + ' UZS';
  const formatUSD = (val) => '$' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const money = (val) => Number(val || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 2 });

  const periods = [
    { key: 'today', label: 'Bugun' },
    { key: 'yesterday', label: 'Kecha' },
    { key: 'this_week', label: '7 kun' },
    { key: 'this_month', label: 'Shu oy' },
    { key: 'this_year', label: 'Shu yil' },
  ];

  const paymentMethodsList = useMemo(() => {
    if (data?.payment_methods_list) return data.payment_methods_list;
    if (!data?.payment_methods) return [];
    if (Array.isArray(data.payment_methods)) return data.payment_methods;
    return Object.entries(data.payment_methods).map(([key, val]) => ({
      method: key.toUpperCase(),
      count: val.count || 0,
      total_uzs: val.amount_uzs || val.total_uzs || 0,
      total_usd: val.amount_usd || val.total_usd || 0,
    }));
  }, [data]);

  return (
    <div className="work-desktop">
      {/* 1. Header with Period Pill Buttons */}
      <div className="work-desktop-heading" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Ish stoli</h1>
          <p>Bugungi savdo, moliyaviy tahlillar va muhim vazifalar bir joyda</p>
        </div>

        <div
          style={{
            display: 'flex',
            background: 'var(--bg-chip)',
            padding: 4,
            borderRadius: 'var(--radius-sm, 8px)',
            border: '1px solid var(--border-subtle)',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {periods.map((p) => {
            const active = period === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs, 6px)',
                  border: 'none',
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--text-on-primary, #fff)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DO'KONNING UMUMIY HOLATI & BALANSI (Store Overview - All-Time) */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Do‘konning Umumiy Holati & Balansi
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Do‘kon kapitali, umumiy nasiyalar qarzi, ombor qiymati va barcha davrlardagi umumiy natijalar
          </p>
        </div>

        <div className="workspace-metrics-grid">
          {/* Nasiyalar Qarzi */}
          <div className="workspace-metric debt" onClick={() => navigate('/debts')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <BookOpen size={22} />
            </div>
            <div>
              <span>Jami Nasiyalar Qarzi</span>
              <strong>{loading && !data ? '…' : formatUZS(store.total_debt_uzs)}</strong>
              <small>{formatUSD(store.total_debt_usd)} · {store.debtors_count ? `${store.debtors_count} ta qarzdor` : 'Do‘kon haqi'}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Ombor Qoldig'i (Tannarx) */}
          <div className="workspace-metric" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <Package size={22} />
            </div>
            <div>
              <span>Ombor Qoldig‘i (Tannarx)</span>
              <strong>{loading && !data ? '…' : formatUZS(store.inventory_cost_value_uzs)}</strong>
              <small>{store.inventory_total_qty ? `${store.inventory_total_qty} dona tovar` : 'Mavjud tovarlar'}{store.inventory_variants_count ? ` (${store.inventory_variants_count} tur)` : ''}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Kutilayotgan Tushum */}
          <div className="workspace-metric" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <Store size={22} />
            </div>
            <div>
              <span>Kutilayotgan Tushum</span>
              <strong>{loading && !data ? '…' : formatUZS(store.inventory_retail_value_uzs)}</strong>
              <small>Ombordagi tovarlar sotuv bahosi</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Jami Jamg'arilgan Sof Foyda (All-Time) */}
          <div className="workspace-metric" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <Award size={22} />
            </div>
            <div>
              <span>Jami Sof Foyda (All-Time)</span>
              <strong>{loading && !data ? '…' : formatUZS(store.all_time_profit_uzs)}</strong>
              <small>{formatUSD(store.all_time_profit_usd)} · Jamg‘arilgan</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Umumiy Savdo Aylanmasi (All-Time) */}
          <div className="workspace-metric" onClick={() => navigate('/sales')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <TrendingUp size={22} />
            </div>
            <div>
              <span>Umumiy Aylanma (All-Time)</span>
              <strong>{loading && !data ? '…' : formatUZS(store.all_time_sales_uzs)}</strong>
              <small>{formatUSD(store.all_time_sales_usd)} · {store.all_time_sales_count ? `${store.all_time_sales_count} ta chek` : 'Barcha davrlar'}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>
        </div>
      </div>

      {/* 3. DAVRIY MOLIYAVIY TAHLIL (Selected Period KPIs) */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Davriy Moliyaviy Tahlil
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Tanlangan davr bo‘yicha tushum, berilgan nasiyalar, sof foyda va chiqimlar
          </p>
        </div>

        <div className="workspace-metrics-grid">
          {/* Haqiqiy Tushum */}
          <div className="workspace-metric" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <BarChart3 size={22} />
            </div>
            <div>
              <span>Haqiqiy Tushum</span>
              <strong>{loading && !data ? '…' : formatUZS(kpi.total_revenue_uzs)}</strong>
              <small>Naqd & Karta · {formatUSD(kpi.total_revenue_usd)}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Berilgan Nasiya */}
          <div className="workspace-metric debt" onClick={() => navigate('/debts')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <Wallet size={22} />
            </div>
            <div>
              <span>Berilgan Nasiya</span>
              <strong>{loading && !data ? '…' : formatUZS(kpi.debt_sales_uzs)}</strong>
              <small>{kpi.debt_sales_count ? `${kpi.debt_sales_count} ta nasiya cheki` : 'Ushbu davrda'} · {formatUSD(kpi.debt_sales_usd)}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Sof Foyda */}
          <div className="workspace-metric" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <DollarSign size={22} />
            </div>
            <div>
              <span>Sof Foyda</span>
              <strong>{loading && !data ? '…' : formatUZS(kpi.net_profit_uzs)}</strong>
              <small>Daromad marjasi · {formatUSD(kpi.net_profit_usd)}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Jami Chiqim */}
          <div className="workspace-metric debt" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <TrendingDown size={22} />
            </div>
            <div>
              <span>Jami Chiqim</span>
              <strong>{loading && !data ? '…' : formatUZS(costUZS)}</strong>
              <small>Tannarx & xarajatlar · {formatUSD(costUSD)}</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Jami Savdo / Cheklar */}
          <div className="workspace-metric" onClick={() => navigate('/sales')} role="button" tabIndex={0}>
            <div className="workspace-metric-icon">
              <ShoppingBag size={22} />
            </div>
            <div>
              <span>Jami Savdo / Cheklar</span>
              <strong>{loading && !data ? '…' : formatUZS(kpi.total_sales_uzs || kpi.total_revenue_uzs)}</strong>
              <small>{kpi.sales_count || 0} ta chek yopilgan</small>
            </div>
            <ArrowUpRight size={15} />
          </div>

          {/* Kam Qolgan Tovar */}
          {canUse(activeTenant, 'inventory.view_stock') && (
            <div className="workspace-metric" onClick={() => navigate('/inventory?workspace_action=low_stock')} role="button" tabIndex={0}>
              <div className="workspace-metric-icon">
                <Package size={22} />
              </div>
              <div>
                <span>Kam qolgan tovar</span>
                <strong>{overview?.low_stock_count == null ? '…' : `${overview.low_stock_count} ta`}</strong>
                <small>Qoldiq 5 birlik yoki kam</small>
              </div>
              <ArrowUpRight size={15} />
            </div>
          )}
        </div>
      </div>

      {overview?.error && (
        <RecoveryNotice
          title="Ish stoli ma’lumotlari ochilmadi"
          actions={<RetryButton onClick={() => setRetry((value) => value + 1)}>Qayta yuklash</RetryButton>}
        >
          {overview.error}
        </RecoveryNotice>
      )}

      {/* 4. Middle Grid: Savdo Dinamikasi & Eslatmalar */}
      <div className="workspace-middle-grid">
        <section className="workspace-card workspace-chart">
          <div className="workspace-card-heading">
            <h2>
              <BarChart3 size={18} />
              Savdo dinamikasi
            </h2>
          </div>
          <CompactSalesChart rows={data?.sales_chart || []} />
        </section>

        <Reminders compact />
      </div>

      {/* 5. To'lov Turlari Taqsimoti & Kassirlar Peshqadamligi Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* To'lov Turlari Taqsimoti */}
        <section className="workspace-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} />
              To‘lov Turlari Taqsimoti
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Naqd pul, bank kartasi va nasiya xaridlari
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paymentMethodsList && paymentMethodsList.length > 0 ? (
              paymentMethodsList.map((pm, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-chip)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CreditCard
                      size={16}
                      color={
                        pm.method === 'CASH'
                          ? 'var(--accent-emerald)'
                          : pm.method === 'CARD'
                          ? 'var(--primary)'
                          : pm.method === 'DEBT'
                          ? 'var(--accent-amber)'
                          : 'var(--accent-cyan)'
                      }
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {pm.method === 'CASH'
                          ? 'Naqd Pul'
                          : pm.method === 'CARD'
                          ? 'Bank Kartasi'
                          : pm.method === 'DEBT'
                          ? 'Nasiya (Berilgan Qarz)'
                          : pm.method === 'DEBT_COLLECTION'
                          ? 'Undirilgan Nasiya'
                          : pm.method}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {pm.count} ta {pm.method === 'DEBT' ? 'nasiya xaridi' : 'to‘lov'}
                        {pm.method === 'DEBT' && (
                          <span style={{ color: 'var(--accent-amber)', marginLeft: 4, fontWeight: 600 }}>
                            (tushum emas)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: pm.method === 'DEBT' ? 'var(--accent-amber)' : 'var(--text-primary)',
                      }}
                    >
                      {formatUZS(pm.total_uzs)}
                    </div>
                    {Number(pm.total_usd) > 0 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: pm.method === 'DEBT' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                          fontWeight: 600,
                        }}
                      >
                        + {formatUSD(pm.total_usd)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="workspace-empty">To‘lovlar tarixi mavjud emas.</p>
            )}
          </div>
        </section>

        {/* Kassirlar Peshqadamligi */}
        <section className="workspace-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} />
              Kassirlar Peshqadamligi
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Xodimlar bo‘yicha cheklar soni va umumiy savdo natijalari
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.cashiers_leaderboard && data.cashiers_leaderboard.length > 0 ? (
              data.cashiers_leaderboard.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-chip)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Award
                      size={18}
                      color={idx === 0 ? 'var(--accent-amber)' : idx === 1 ? '#94a3b8' : 'var(--chart-debt)'}
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.name || c.cashier_name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {c.sales_count || c.total_sales_count || 0} ta chek
                        {Number(c.debt_count || 0) > 0 && (
                          <span style={{ color: 'var(--accent-amber)', marginLeft: 6, fontWeight: 600 }}>
                            ({c.debt_count} ta nasiya)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatUZS(c.total_amount_uzs || c.total_revenue_uzs)}
                    </div>
                    {Number(c.total_amount_usd || 0) > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        + {formatUSD(c.total_amount_usd)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="workspace-empty">Xodimlar savdo ma’lumotlari mavjud emas.</p>
            )}
          </div>
        </section>
      </div>

      {/* 6. Eng Ko'p Sotilgan Tovar (Top-10) */}
      <section className="workspace-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} />
            Eng Ko‘p Sotilgan Tovar (Top-10)
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Tanlangan davrda eng xaridorgir mahsulotlar va ularning aylanmasi
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {data?.top_products && data.top_products.length > 0 ? (
            data.top_products.slice(0, 8).map((p, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-chip)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(var(--primary-rgb), 0.15)',
                      color: 'var(--primary)',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name || p.product_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {Number(p.quantity_sold || p.total_quantity || 0).toLocaleString()} dona
                      {Number(p.debt_quantity || 0) > 0 && (
                        <span style={{ color: 'var(--accent-amber)', marginLeft: 4, fontWeight: 600 }}>
                          ({Number(p.debt_quantity).toLocaleString()} nasiya)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {p.currency === 'USD'
                      ? formatUSD(p.revenue || p.total_revenue_usd)
                      : formatUZS(p.revenue || p.total_revenue_uzs)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="workspace-empty" style={{ gridColumn: '1 / -1' }}>Hali tovarlar sotilmagan.</p>
          )}
        </div>
      </section>

      {/* 7. So'nggi Savdolar Jadvali */}
      <section className="workspace-card">
        <div className="workspace-card-heading">
          <h2>
            <History size={18} />
            So‘nggi savdolar
          </h2>
          <button
            type="button"
            className="workspace-text-button"
            onClick={() => navigate(isOwner ? '/history' : '/sales')}
          >
            Barchasini ko‘rish <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="table-responsive">
          <table className="workspace-activity-table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Chek</th>
                <th>Mijoz</th>
                <th>Summa</th>
                <th>Holat</th>
                <th>Mas’ul</th>
              </tr>
            </thead>
            <tbody>
              {overview?.recent_sales?.map((row) => (
                <tr key={row.id}>
                  <td>
                    {new Date(row.created_at).toLocaleString('uz-UZ', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="workspace-text-button"
                      onClick={() => navigate(`/sales?workspace_id=${row.id}`)}
                    >
                      {row.receipt_number}
                    </button>
                  </td>
                  <td>{row.customer}</td>
                  <td>
                    {money(row.total_amount)} {row.currency}
                  </td>
                  <td>
                    <span className="workspace-status-chip">{row.status}</span>
                  </td>
                  <td>{row.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!overview?.recent_sales?.length && (
          <p className="workspace-empty">
            {overview
              ? 'Hozircha savdolar yo‘q yoki ularni ko‘rish ruxsati berilmagan.'
              : 'Yuklanmoqda…'}
          </p>
        )}
      </section>
    </div>
  );
}
