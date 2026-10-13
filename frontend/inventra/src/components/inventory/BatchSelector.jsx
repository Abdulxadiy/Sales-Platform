import { useEffect, useState } from 'react';
import { inventoryApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function BatchSelector({ variantId, value, onChange, allowEmpty = false }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!variantId) return;
    let live = true;
    setLoading(true);
    inventoryApi.getBatches({ product_variant_id: variantId, include_empty: allowEmpty }).then(data => {
      if (live) setRows(data);
    }).catch(error => { if (live) toast.error(error.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [variantId, allowEmpty, toast]);
  if (!variantId) return null;
  return <label>Partiya (ixtiyoriy)
    <select className="form-input" value={value} disabled={loading} onChange={event => onChange(event.target.value)}>
      <option value="">{loading ? 'Yuklanmoqda…' : allowEmpty ? 'Yangi, muddati noma’lum partiya' : 'Avval muddati ertaroq tugaydigan partiya'}</option>
      {rows.map(row => <option key={row.id} value={row.id}>{row.batch_code || `Partiya #${row.id}`} · {row.expires_on || 'Sana yo‘q'} · {row.quantity} {row.unit}</option>)}
    </select>
  </label>;
}
