import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, FileSpreadsheet, Star, User } from 'lucide-react';
import Modal from '../common/Modal';
import Reminders from './Reminders';
import { calculateExpression, canUse } from '../../utils/workspace';
import { useTenant } from '../../context/TenantContext';
import { salesApi } from '../../api/client';

function CalculatorPanel() {
  const [expression, setExpression] = useState('');
  const [answer, setAnswer] = useState('');
  return <form className="workspace-form" onSubmit={event => {
    event.preventDefault();
    try { setAnswer(calculateExpression(expression).toLocaleString('uz-UZ', { maximumFractionDigits: 10 })); }
    catch (error) { setAnswer(error.message); }
  }}>
    <label>Hisob<input autoFocus aria-label="Hisoblash ifodasi" value={expression} onChange={event => setExpression(event.target.value)} maxLength={200} placeholder="125000 × 3 + 5000" /></label>
    <output className="workspace-calculator-answer" aria-live="polite">{answer || '0'}</output>
    <button type="submit" className="btn btn-primary"><Calculator size={16} /> Hisoblash</button>
    <small>+, −, ×, ÷ va qavslar bilan hisoblang. Kasr uchun nuqta yoki vergul ishlating.</small>
  </form>;
}

function DebtPicker({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      salesApi.getCounterparties({ search: query, page: 1, page_size: 10 }, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setSnapshot({ query, rows: data.results || data }); })
        .catch(error => { if (!controller.signal.aborted) setSnapshot({ query, error: error.message, rows: [] }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const current = snapshot?.query === query ? snapshot : null;
  return <div className="workspace-form">
    <label>Mijozni tanlang<input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Ism yoki telefon..." /></label>
    {current?.error && <p role="alert" className="workspace-error">{current.error}</p>}
    <div className="workspace-search-results">{current?.rows.map(row => <button key={row.id} type="button" onClick={() => {
      navigate(`/debts?workspace_action=debt_payment&workspace_id=${row.id}`); onClose();
    }}><User size={18} /><div><strong>{row.name}</strong><small>{row.phone_number}</small></div></button>)}</div>
    {!current && <p>Yuklanmoqda…</p>}{current && !current.rows.length && <p>Mijoz topilmadi.</p>}
  </div>;
}

export default function WorkspaceTools({ tool, onClose, navItems = [], favorites = [], setFavorites }) {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const titles = { calculator: 'Kalkulyator', favorites: 'Sevimli bo‘limlar', shortcuts: 'Klaviatura yordamchisi', imports: 'XLSX orqali yuklash', reminders: 'Eslatmalar', new_reminder: 'Eslatmalar', debt_payment: 'Qarz to‘lovini qabul qilish' };
  return <Modal isOpen onClose={onClose} title={titles[tool] || 'Tezkor yordamchilar'} maxWidth={tool.includes('reminder') ? 760 : 520}>
    {tool === 'calculator' && <CalculatorPanel />}
    {tool === 'debt_payment' && <DebtPicker onClose={onClose} />}
    {tool.includes('reminder') && <Reminders initiallyCreating={tool === 'new_reminder'} />}
    {tool === 'shortcuts' && <div className="workspace-shortcuts">
      <p><span>Umumiy qidiruv</span><kbd>Ctrl / ⌘ + K</kbd></p>
      <p><span>Natijani tanlash</span><kbd>↑ / ↓</kbd></p>
      <p><span>Tanlangan natijani ochish</span><kbd>Enter</kbd></p>
      <p><span>Ochiq oynani yopish</span><kbd>Esc</kbd></p>
    </div>}
    {tool === 'favorites' && <div className="workspace-form"><p>Tezkor qator uchun 6 tagacha bo‘lim tanlang.</p>
      {navItems.map(item => <label className="workspace-favorite-choice" key={item.to}>
        <input type="checkbox" checked={favorites.includes(item.to)} disabled={favorites.length >= 6 && !favorites.includes(item.to)}
          onChange={() => setFavorites(current => current.includes(item.to) ? current.filter(path => path !== item.to) : [...current, item.to].slice(0, 6))} />
        <Star size={16} />{item.label}</label>)}
    </div>}
    {tool === 'imports' && <div className="workspace-search-results">
      {canUse(activeTenant, 'catalog.add_product') && <button type="button" onClick={() => { navigate('/catalog?workspace_action=import'); onClose(); }}><FileSpreadsheet size={21} /><div><strong>Tovarlar importi</strong><small>Mahsulotlar va boshlang‘ich qoldiq</small></div></button>}
      {canUse(activeTenant, 'sales.manage_counterparty') && <button type="button" onClick={() => { navigate('/debts?workspace_action=import'); onClose(); }}><FileSpreadsheet size={21} /><div><strong>Mijozlar va nasiya importi</strong><small>Mijozlar, telefonlar, UZS / USD nasiya</small></div></button>}
    </div>}
  </Modal>;
}
