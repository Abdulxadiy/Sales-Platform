import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, Package, User, Receipt, ArrowRight } from 'lucide-react';
import Modal from '../common/Modal';
import { workspaceApi } from '../../api/workspace';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../hooks/useAuth';

const types = { product: [Package, 'Tovarlar'], customer: [User, 'Mijozlar'], sale: [Receipt, 'Cheklar'] };

export default function WorkspaceSearch({ onClose, navItems }) {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [index, setIndex] = useState(0);
  const clean = query.trim();
  useEffect(() => {
    if (clean.length < 2 || !activeTenant?.id || isAdmin) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      workspaceApi.search(clean, controller.signal).then(data => {
        if (!controller.signal.aborted) setSnapshot({ query: clean, tenant: activeTenant.id, results: data.results });
      }).catch(error => {
        if (!controller.signal.aborted) setSnapshot({ query: clean, tenant: activeTenant.id, results: [], error: error.message });
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [clean, activeTenant?.id, isAdmin]);
  const current = snapshot?.query === clean && snapshot?.tenant === activeTenant?.id ? snapshot : null;
  const pages = navItems.filter(item => !clean || item.label.toLocaleLowerCase().includes(clean.toLocaleLowerCase())).map(item => ({
    type: 'page', title: item.label, url: item.to, icon: item.icon,
  }));
  const rows = [...(current?.results || []), ...pages];
  function open(row) {
    const params = new URLSearchParams();
    if (row.search) params.set('workspace_search', row.search);
    if (row.id) params.set('workspace_id', row.id);
    navigate(`${row.url}${params.size ? '?' + params : ''}`);
    onClose();
  }
  return <Modal isOpen onClose={onClose} title="Umumiy qidiruv" maxWidth={680}>
    <div className="workspace-search-input"><Search size={20} />
      <input autoFocus aria-label="Tovar, mijoz yoki chek qidirish" placeholder="Tovar, shtrix-kod, mijoz yoki chek raqami…"
        role="combobox" aria-expanded="true" aria-controls="workspace-search-results" aria-activedescendant={rows[index] ? `workspace-result-${index}` : undefined}
        value={query} onChange={event => { setQuery(event.target.value); setIndex(0); }} onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setIndex(value => Math.max(0, Math.min(rows.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' && rows[index]) { event.preventDefault(); open(rows[index]); }
        }} />
      <kbd>Esc</kbd></div>
    {clean.length >= 2 && !current && !isAdmin && activeTenant && <p className="workspace-empty" role="status">Qidirilmoqda…</p>}
    {current?.error && <p className="workspace-error" role="alert">{current.error}</p>}
    <div className="workspace-search-results" id="workspace-search-results" role="listbox" aria-label="Qidiruv natijalari">
      {rows.map((row, rowIndex) => {
        const Icon = row.icon || types[row.type]?.[0] || ArrowUpRight;
        const category = types[row.type]?.[1] || 'Bo‘limlar';
        return <button key={`${row.type}-${row.id || row.url}`} id={`workspace-result-${rowIndex}`} type="button" role="option"
          aria-selected={index === rowIndex} className={index === rowIndex ? 'selected' : ''} onClick={() => open(row)} onMouseEnter={() => setIndex(rowIndex)}>
          <Icon size={19} /><div><strong>{row.title}</strong><small>{category}{row.subtitle ? ` · ${row.subtitle}` : ''}</small></div><ArrowRight size={16} />
        </button>;
      })}
      {!rows.length && current && <p className="workspace-empty">Hech narsa topilmadi. Boshqa so‘z bilan qidiring.</p>}
    </div>
    <p className="workspace-keyboard-hint">↑ ↓ Tanlash <kbd>Enter</kbd> Ochish <kbd>Esc</kbd> Yopish</p>
  </Modal>;
}
