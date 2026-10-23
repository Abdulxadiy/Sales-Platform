import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, Package, User, Receipt, ArrowRight, X, Loader2, SearchX } from 'lucide-react';
import Modal from '../common/Modal';
import { workspaceApi } from '../../api/workspace';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../hooks/useAuth';

const types = {
  product: [Package, 'Tovarlar', 'type-product'],
  customer: [User, 'Mijozlar', 'type-customer'],
  sale: [Receipt, 'Cheklar', 'type-sale']
};

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
  const isSearching = clean.length >= 2 && !current && !isAdmin && activeTenant;

  const pages = navItems.filter(item => !clean || item.label.toLocaleLowerCase().includes(clean.toLocaleLowerCase())).map(item => ({
    type: 'page', title: item.label, url: item.to, icon: item.icon,
  }));
  const rows = [...(current?.results || []), ...pages];

  useEffect(() => {
    document.getElementById(`workspace-result-${index}`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  function open(row) {
    const params = new URLSearchParams();
    if (row.search) params.set('workspace_search', row.search);
    if (row.id) params.set('workspace_id', row.id);
    navigate(`${row.url}${params.size ? '?' + params : ''}`);
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} title="Umumiy qidiruv" maxWidth={680}>
      <div className="workspace-search-input">
        <Search size={20} className="workspace-search-icon" />
        <input
          autoFocus
          aria-label="Tovar, mijoz yoki chek qidirish"
          placeholder="Tovar, shtrix-kod, mijoz yoki chek raqami…"
          role="combobox"
          aria-expanded="true"
          aria-controls="workspace-search-results"
          aria-activedescendant={rows[index] ? `workspace-result-${index}` : undefined}
          value={query}
          onChange={event => { setQuery(event.target.value); setIndex(0); }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setIndex(value => Math.max(0, Math.min(rows.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))));
            }
            if (event.key === 'Enter' && rows[index]) {
              event.preventDefault();
              open(rows[index]);
            }
          }}
        />
        <div className="workspace-search-actions">
          {isSearching && <Loader2 size={16} className="workspace-search-spinner" />}
          {query && (
            <button
              type="button"
              className="workspace-search-clear"
              title="Tozalash"
              aria-label="Qidiruvni tozalash"
              onClick={() => { setQuery(''); setIndex(0); }}
            >
              <X size={15} />
            </button>
          )}
          <kbd>Esc</kbd>
        </div>
      </div>

      {isSearching && (
        <p className="workspace-empty" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 size={15} className="workspace-search-spinner" />
          <span>Qidirilmoqda…</span>
        </p>
      )}
      {current?.error && <p className="workspace-error" role="alert">{current.error}</p>}

      <div className="workspace-search-results" id="workspace-search-results" role="listbox" aria-label="Qidiruv natijalari">
        {rows.map((row, rowIndex) => {
          const Icon = row.icon || types[row.type]?.[0] || ArrowUpRight;
          const category = types[row.type]?.[1] || 'Bo‘limlar';
          const typeClass = types[row.type]?.[2] || 'type-page';
          return (
            <button
              key={`${row.type}-${row.id || row.url}`}
              id={`workspace-result-${rowIndex}`}
              type="button"
              role="option"
              aria-selected={index === rowIndex}
              className={`workspace-search-item ${typeClass} ${index === rowIndex ? 'selected' : ''}`}
              onClick={() => open(row)}
              onMouseEnter={() => setIndex(rowIndex)}
            >
              <div className="workspace-search-item-icon">
                <Icon size={18} />
              </div>
              <div className="workspace-search-item-info">
                <strong>{row.title}</strong>
                <small>
                  <span className="workspace-search-category-badge">{category}</span>
                  {row.subtitle ? ` · ${row.subtitle}` : ''}
                </small>
              </div>
              <ArrowRight size={16} className="workspace-search-item-arrow" />
            </button>
          );
        })}
        {!rows.length && current && (
          <div className="workspace-search-empty-state">
            <div className="workspace-search-empty-icon">
              <SearchX size={24} />
            </div>
            <p className="workspace-search-empty-title">Hech narsa topilmadi</p>
            <p className="workspace-search-empty-desc">«{clean}» bo‘yicha hech qanday tovar, mijoz yoki chek topilmadi.</p>
          </div>
        )}
      </div>

      <div className="workspace-keyboard-hint">
        <span><kbd>↑</kbd> <kbd>↓</kbd> Tanlash</span>
        <span><kbd>Enter</kbd> Ochish</span>
        <span><kbd>Esc</kbd> Yopish</span>
      </div>
    </Modal>
  );
}
