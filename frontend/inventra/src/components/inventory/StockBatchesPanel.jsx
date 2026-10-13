import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Pagination from '../common/Pagination';

const STATUSES = { all: 'Barcha partiyalar', expired: 'Muddati o‘tgan', soon: '30 kun ichida tugaydi', valid: 'Muddati yetarli', unknown: 'Muddati kiritilmagan' };
export default function StockBatchesPanel() {
  const toast = useToast();
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
  const filtered = useMemo(() => batches.filter(batch => (status === 'all' || batch.expiry_status === status)
    && `${batch.product_name} ${batch.variant_name} ${batch.batch_code}`.toLowerCase().includes(search.toLowerCase())), [batches, search, status]);
  const showCost = batches.some(batch => Object.hasOwn(batch, 'cost_price'));
  const expired = batches.filter(batch => batch.expiry_status === 'expired').length;
  const soon = batches.filter(batch => batch.expiry_status === 'soon').length;
  return <div style={{ padding: 20 }}>
    <p role="status">Muddati o‘tgan: <strong>{expired}</strong> partiya. 30 kun ichida tugaydi: <strong>{soon}</strong> partiya.</p>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avval muddati ertaroq tugaydigan partiya sotiladi. Muddati o‘tgan tovar uchun kassada ogohlantirish chiqadi. Qoldig‘i 0 bo‘lgan partiyalar ko‘rsatilmaydi.</p>
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <input className="form-input" aria-label="Partiya qidirish" placeholder="Mahsulot yoki partiya raqami…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <select className="form-input" aria-label="Yaroqlilik holati" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>{Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>
    {loading ? <p>Yuklanmoqda…</p> : <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
      <thead><tr>{['Mahsulot', 'Partiya', 'Kirim sanasi', 'Yaroqlilik sanasi', 'Qoldiq', ...(showCost ? ['Tannarx'] : []), 'Holat'].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{filtered.slice((page - 1) * 25, page * 25).map(batch => <tr key={batch.id}>
        <td>{batch.product_name} / {batch.variant_name}</td><td>{batch.batch_code || '—'}</td><td>{batch.received_on}</td><td>{batch.expires_on || '—'}</td>
        <td>{Number(batch.quantity).toLocaleString()} {batch.unit}</td>{showCost && <td>{batch.cost_price ?? '—'} {batch.currency}</td>}
        <td style={{ color: batch.expiry_status === 'expired' ? 'var(--accent-rose)' : batch.expiry_status === 'soon' ? 'var(--accent-amber)' : undefined }}>{STATUSES[batch.expiry_status]}</td>
      </tr>)}</tbody>
    </table>{!filtered.length && <p>Partiyalar topilmadi.</p>}</div>}
    <Pagination currentPage={page} totalItems={filtered.length} pageSize={25} onPageChange={setPage} />
  </div>;
}
