import { useEffect, useState } from 'react';
import { tenantApi } from '../../api/client';
import { useDebouncedValue, usePaginatedList } from '../../hooks/usePaginatedList';
import CustomSelect from './CustomSelect';
import Pagination from './Pagination';

export default function RemoteTenantSelect({ value, onChange, autoSelect = false, allowAll = false, ...props }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const query = useDebouncedValue(search.trim());
  const list = usePaginatedList(tenantApi.getTenants, { search: query, compact: true });
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    const controller = new AbortController();
    tenantApi.getTenants({ id: value, compact: true, page: 1, page_size: 1 }, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setSelected(data.results[0] || null);
    }).catch(() => {});
    return () => controller.abort();
  }, [value]);
  const firstId = list.items[0]?.id;
  useEffect(() => { if (autoSelect && !value && firstId) onChange(firstId); }, [autoSelect, value, firstId, onChange]);
  const rows = [...list.items];
  if (selected && !rows.some(row => row.id === selected.id)) rows.unshift(selected);
  return <div style={{minWidth:220}}>
    <input className="input-field" aria-label="Do‘konni bazadan qidirish" placeholder="Do‘kon nomi yoki ID..."
      value={search} onChange={event => setSearch(event.target.value)} />
    <CustomSelect {...props} value={value} onChange={onChange} options={[
      ...(allowAll ? [{value:'', label:'Barcha do‘konlar'}] : []),
      ...rows.map(row => ({value:row.id, label:`${row.name} (#${row.id})`})),
    ]} />
    {list.error && <small role="alert">{list.error.message}</small>}
    {list.loading && <small>Yuklanmoqda...</small>}
    <Pagination compact currentPage={list.page} totalItems={list.total} onPageChange={list.setPage} />
  </div>;
}
