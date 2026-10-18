import { useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import Pagination from '../common/Pagination';
import CustomSelect from '../common/CustomSelect';

const STATUSES = { all: 'Barcha partiyalar', expired: 'Muddati o‘tgan', soon: '30 kun ichida tugaydi', valid: 'Muddati yetarli', unknown: 'Muddati kiritilmagan' };
export default function StockBatchesPanel() {
  const toast = useToast();
  const { activeTenant } = useTenant();
  const canViewSupplier = activeTenant?.is_owner || activeTenant?.permissions?.includes('inventory.view_supplier');

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    let live = true;
    inventoryApi.getBatches().then(data => { if (live) setBatches(data); })
      .catch(error => { if (live) toast.error(error.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [toast]);
  const filtered = useMemo(() => batches.filter(batch => {
    if (status !== 'all' && batch.expiry_status !== status) return false;
    const term = search.toLowerCase();
    const nameMatch = `${batch.product_name} ${batch.variant_name} ${batch.batch_code}`.toLowerCase().includes(term);
    const supplierMatch = canViewSupplier && (batch.supplier || '').toLowerCase().includes(term);
    return nameMatch || supplierMatch;
  }), [batches, search, status, canViewSupplier]);
  const showCost = batches.some(batch => Object.hasOwn(batch, 'cost_price'));
  const expired = batches.filter(batch => batch.expiry_status === 'expired').length;
  const soon = batches.filter(batch => batch.expiry_status === 'soon').length;

  const tableHeaders = [
    'Mahsulot',
    'Partiya',
    ...(canViewSupplier ? ['Ta’minotchi'] : []),
    'Kirim sanasi',
    'Yaroqlilik sanasi',
    'Qoldiq',
    ...(showCost ? ['Tannarx'] : []),
    'Holat',
  ];

  return <div style={{ padding: 20 }}>
    <p role="status">Muddati o‘tgan: <strong>{expired}</strong> partiya. 30 kun ichida tugaydi: <strong>{soon}</strong> partiya.</p>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avval muddati ertaroq tugaydigan partiya sotiladi. Muddati o‘tgan tovar uchun kassada ogohlantirish chiqadi. Qoldig‘i 0 bo‘lgan partiyalar ko‘rsatilmaydi.</p>
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
      <input className="form-input" style={{ marginTop: 0 }} aria-label="Partiya qidirish" placeholder={canViewSupplier ? "Mahsulot, partiya raqami yoki ta’minotchi…" : "Mahsulot yoki partiya raqami…"} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <div style={{ minWidth: 200, flexShrink: 0 }}>
        <CustomSelect
          value={status}
          onChange={val => { setStatus(val); setPage(1); }}
          options={Object.entries(STATUSES).map(([key, label]) => ({ value: key, label }))}
          size="md"
        />
      </div>
    </div>
    {loading ? <p>Yuklanmoqda…</p> : <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
      <thead><tr>{tableHeaders.map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{filtered.slice((page - 1) * 25, page * 25).map(batch => <tr key={batch.id}>
        <td>{batch.product_name} / {batch.variant_name}</td>
        <td>{batch.batch_code || '—'}</td>
        {canViewSupplier && (
          <td>
            {batch.supplier ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(var(--primary-rgb), 0.1)',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: 12,
              }}>
                <Truck size={12} />
                {batch.supplier}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </td>
        )}
        <td>{batch.received_on}</td>
        <td>{batch.expires_on || '—'}</td>
        <td>{Number(batch.quantity).toLocaleString()} {batch.unit}</td>
        {showCost && <td>{batch.cost_price ?? '—'} {batch.currency}</td>}
        <td style={{ color: batch.expiry_status === 'expired' ? 'var(--accent-rose)' : batch.expiry_status === 'soon' ? 'var(--accent-amber)' : undefined }}>{STATUSES[batch.expiry_status]}</td>
      </tr>)}</tbody>
    </table>{!filtered.length && <p>Partiyalar topilmadi.</p>}</div>}
    <Pagination currentPage={page} totalItems={filtered.length} pageSize={25} onPageChange={setPage} />
  </div>;
}
