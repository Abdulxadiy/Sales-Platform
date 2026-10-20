import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ShoppingCart, CreditCard, Package, ArrowUpRight, History, RefreshCw } from 'lucide-react';
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
    workspaceApi.overview(controller.signal).then(response => {
      if (!controller.signal.aborted) setSnapshot({ tenantId: activeTenant.id, ...response });
    }).catch(error => {
      if (!controller.signal.aborted) setSnapshot({ tenantId: activeTenant.id, error: error.message });
    });
    return () => controller.abort();
  }, [activeTenant?.id, retry]);
  const overview = snapshot?.tenantId === activeTenant?.id ? snapshot : null;
  const kpi = data?.kpi || {};
  const store = data?.store_overview || kpi;
  const money = value => Number(value || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 2 });
  const metric = (title, value, subtitle, Icon, url, tone = '') => <button type="button" className={`workspace-metric ${tone}`} onClick={() => navigate(url)}>
    <div className="workspace-metric-icon"><Icon size={23} /></div><div><span>{title}</span><strong>{loading && !data ? '…' : value}</strong><small>{subtitle}</small></div><ArrowUpRight size={15} />
  </button>;
  return <div className="work-desktop">
    <div className="work-desktop-heading"><div><h1>Ish stoli</h1><p>Bugungi savdo va muhim vazifalar bir joyda</p></div>
      <select aria-label="Ish stoli davri" value={period} onChange={event => setPeriod(event.target.value)}>
        <option value="today">Bugun</option><option value="yesterday">Kecha</option><option value="week">Shu hafta</option><option value="month">Shu oy</option>
      </select></div>
    <div className="workspace-metrics-grid">
      {metric('Savdo tushumi', `${money(kpi.total_revenue_uzs)} UZS`, `${money(kpi.total_revenue_usd)} USD`, BarChart3, '/dashboard')}
      {metric('Sotuvlar', `${kpi.sales_count || 0} ta`, 'Tanlangan davrdagi cheklar', ShoppingCart, '/sales')}
      {metric('Jami nasiya', `${money(store.total_debt_uzs)} UZS`, `${money(store.total_debt_usd)} USD`, CreditCard, '/debts', 'debt')}
      {canUse(activeTenant, 'inventory.view_stock') && metric('Kam qolgan tovar', overview?.low_stock_count == null ? '…' : `${overview.low_stock_count} ta`, 'Qoldiq 5 birlik yoki undan kam', Package, '/inventory?workspace_action=low_stock')}
    </div>
    {overview?.error && <div className="workspace-error" role="alert">{overview.error}<button onClick={() => setRetry(value => value + 1)} type="button"><RefreshCw size={14} />Qayta yuklash</button></div>}
    <div className="workspace-middle-grid"><section className="workspace-card workspace-chart"><div className="workspace-card-heading"><h2><BarChart3 size={18} />Savdo dinamikasi</h2></div>
      <CompactSalesChart rows={data?.sales_chart || []} />
    </section><Reminders compact /></div>
    <section className="workspace-card"><div className="workspace-card-heading"><h2><History size={18} />So‘nggi savdolar</h2>
      <button type="button" className="workspace-text-button" onClick={() => navigate(isOwner ? '/history' : '/sales')}>Barchasini ko‘rish <ArrowUpRight size={15} /></button></div>
      <div className="table-responsive"><table className="workspace-activity-table"><thead><tr><th>Vaqt</th><th>Chek</th><th>Mijoz</th><th>Summa</th><th>Holat</th><th>Mas’ul</th></tr></thead>
        <tbody>{overview?.recent_sales?.map(row => <tr key={row.id}>
          <td>{new Date(row.created_at).toLocaleString('uz-UZ', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
          <td><button type="button" className="workspace-text-button" onClick={() => navigate(`/sales?workspace_id=${row.id}`)}>{row.receipt_number}</button></td>
          <td>{row.customer}</td><td>{money(row.total_amount)} {row.currency}</td><td><span className="workspace-status-chip">{row.status}</span></td><td>{row.cashier}</td>
        </tr>)}</tbody></table></div>
      {!overview?.recent_sales?.length && <p className="workspace-empty">{overview ? 'Hozircha savdolar yo‘q yoki ularni ko‘rish ruxsati berilmagan.' : 'Yuklanmoqda…'}</p>}
    </section>
  </div>;
}
