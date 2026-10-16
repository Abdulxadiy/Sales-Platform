import { useEffect, useState } from 'react';
import { catalogApi } from '../../api/client';
import { useTenant } from '../../context/TenantContext';
import { useDebouncedValue, usePaginatedList } from '../../hooks/usePaginatedList';
import CustomSelect from './CustomSelect';
import Pagination from './Pagination';

export default function RemoteVariantSelect({ value, onChange, onVariant, enabled = true, ...props }) {
  const { activeTenant } = useTenant();
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const query = useDebouncedValue(search.trim());
  const list = usePaginatedList(catalogApi.getVariants, { search: query },
    { tenantId: activeTenant?.id, enabled: enabled && focused });
  useEffect(() => {
    if (!enabled || !value) { setSelected(null); return; }
    const controller = new AbortController();
    catalogApi.getVariants({ ids: value }, { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) setSelected(rows[0] || null);
    }).catch(() => {});
    return () => controller.abort();
  }, [value, enabled, activeTenant?.id]);
  const options = [...list.items];
  if (selected && !options.some(item => item.id === selected.id)) options.unshift(selected);
  return <div onFocusCapture={() => setFocused(true)} style={{ minWidth: 0 }}>
    <CustomSelect
      {...props}
      value={value}
      disabled={!enabled}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Tovar nomi, kod yoki shtrix-kod..."
      searchLoading={list.loading}
      onChange={id => {
        const item = options.find(row => String(row.id) === String(id));
        setSelected(item || null);
        onVariant?.(item);
        onChange(id);
      }}
      options={options.map(item => ({
        value: item.id,
        label: `${item.product_name} / ${item.name} — ${item.stock_quantity} ${item.unit}`
      }))}
      footer={list.total > 20 ? <div style={{padding:'4px 6px'}}><Pagination compact currentPage={list.page} totalItems={list.total} onPageChange={list.setPage} /></div> : null}
    />
    {list.error && <small role="alert">{list.error.message}</small>}
  </div>;
}
