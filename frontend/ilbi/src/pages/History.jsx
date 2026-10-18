import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon, ArrowDownLeft, ArrowUpRight, ArrowRight, Check, ChevronRight,
  Clock3, FileText, Layers3, Package, Printer, Receipt, RefreshCw, Search, Settings2, Users, Wallet, X,
} from 'lucide-react';
import { auditApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../context/TenantContext';
import { useDebouncedValue, usePaginatedList } from '../hooks/usePaginatedList';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import RemoteTenantSelect from '../components/common/RemoteTenantSelect';
import ReceiptSlip, { printReceiptSlip } from '../components/common/ReceiptSlip';
import InvoiceA4Modal from '../components/common/InvoiceA4Modal';
import './History.css';

const categories = [
  { id: 'all', label: 'Barcha amallar', icon: Layers3, tone: 'neutral' },
  { id: 'sales', label: 'Sotuvlar', icon: Receipt, tone: 'green' },
  { id: 'inventory', label: 'Ombor', icon: Package, tone: 'blue' },
  { id: 'catalog', label: 'Katalog', icon: FileText, tone: 'purple' },
  { id: 'finance', label: 'Kassa va qarz', icon: Wallet, tone: 'amber' },
  { id: 'team', label: 'Jamoa', icon: Users, tone: 'blue' },
  { id: 'settings', label: 'Sozlamalar', icon: Settings2, tone: 'neutral' },
];
const categoryFor = value => categories.find(item => item.id === value) || categories[0];
const number = value => Number(value).toLocaleString('uz-UZ', { maximumFractionDigits: 3 });
const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date(value));
const timeLabel = value => new Date(value).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
const fullDate = value => new Date(value).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'long', timeStyle: 'short' });
function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function dateRange(preset, from, to) {
  const today = dateKey(Date.now());
  if (preset === 'today') return { date_from: today, date_to: today };
  if (preset === 'yesterday') return { date_from: shiftDay(today, -1), date_to: shiftDay(today, -1) };
  if (preset === 'week') return { date_from: shiftDay(today, -6), date_to: today };
  if (preset === 'month') return { date_from: `${today.slice(0, 7)}-01`, date_to: today };
  return preset === 'custom' ? { date_from: from, date_to: to } : {};
}
function dayLabel(day) {
  const today = dateKey(Date.now());
  if (day === today) return 'Bugun';
  if (day === shiftDay(today, -1)) return 'Kecha';
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

const fieldLabels = {
  name: 'Nomi', product: 'Tovar', category: 'Kategoriya', parent: 'Asosiy kategoriya', kod: 'Kategoriya kodi',
  unit: 'O‘lchov birligi', code: 'Tovar kodi', barcode: 'Shtrix-kod', is_active: 'Faolligi', currency: 'Valyuta',
  price_partner: 'Hamkor narxi', price_min: 'Minimal narx', price_recommended: 'Sotuv narxi',
  mxik: 'MXIK', package_code: 'Qadoq kodi', image: 'Asosiy rasm', image_count: 'Rasmlar soni',
  fields: 'O‘zgartirilgan sozlamalar', quantity: 'Miqdor', type: 'Harakat turi', direction: 'Yo‘nalish',
  note: 'Izoh', reason: 'Sabab', usd_rate: 'Ichki dollar kursi', auto_usd_rate: 'CBU avtomatik kursi',
  description: 'Tavsif', address: 'Manzil', first_name: 'Ism', last_name: 'Familiya', position: 'Lavozim',
  receipt_phone: 'Chekdagi telefon', receipt_footer: 'Chek izohi', receipt_header: 'Chek sarlavhasi',
  notify_on_sale: 'Sotuv bildirishnomasi', notify_on_debt: 'Qarz bildirishnomasi', permissions: 'Ruxsatlar',
};
function fieldLabel(key) {
  if (key.startsWith('variant_')) return `Variant · ${fieldLabel(key.slice(8))}`;
  return fieldLabels[key] || key.replaceAll('_', ' ');
}
function displayValue(value, key = '') {
  if (/password|token|secret|chat_id|telegram_group_id/.test(key)) return 'Yangilandi';
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ha' : 'Yo‘q';
  if (key === 'image' || key === 'variant_image') return 'Rasm mavjud';
  if (Array.isArray(value)) return value.map(item => key === 'fields' ? fieldLabel(String(item)) : displayValue(item)).join(', ');
  if (typeof value === 'object') return Object.entries(value).map(([field, item]) => `${fieldLabel(field)}: ${displayValue(item, field)}`).join(' · ');
  return String(value);
}

function HistoryDetail({ event, data, loading, error, onRetry }) {
  const [paperWidth, setPaperWidth] = useState('58mm');
  const [invoice, setInvoice] = useState(false);
  if (loading) return <div className="history-detail-state"><RefreshCw size={24} className="history-spin" />Tafsilotlar yuklanmoqda…</div>;
  if (error) return <div className="history-detail-state" role="alert"><p>{error.message || 'Tafsilotlarni yuklab bo‘lmadi.'}</p><button className="btn btn-secondary" onClick={onRetry}>Qayta urinish</button></div>;
  if (!data) return null;
  const details = data.details || {};
  const changes = Object.entries(details.changes || {});
  return <div className="history-detail">
    <div className="history-detail-summary">
      <div><span>BAJARGAN SHAXS</span><strong>{event.actor_name}</strong></div>
      <div><span>SANA VA VAQT</span><strong>{fullDate(event.created_at)}</strong></div>
      <div><span>DO‘KON</span><strong>{event.tenant_name}</strong></div>
      <div><span>HUJJAT</span><strong>{event.reference}</strong></div>
    </div>
    {data.sale ? <>
      <div className="history-receipt-tools no-print">
        <div className="history-paper-options" aria-label="Chek o‘lchami">
          {['58mm', '80mm'].map(width => <button key={width} className={paperWidth === width ? 'is-active' : ''} onClick={() => setPaperWidth(width)}>{width.replace('mm', ' mm')}</button>)}
        </div>
        <div className="history-receipt-actions">
          <button className="btn btn-secondary" onClick={() => setInvoice(true)}><FileText size={15} />A4 ko‘rinish</button>
          <button className="btn btn-primary" onClick={() => printReceiptSlip('history-receipt', 'ILBI Savdo Cheki', paperWidth)}><Printer size={15} />Chop etish</button>
        </div>
      </div>
      <div className="history-receipt"><ReceiptSlip id="history-receipt" sales={[data.sale]} paperWidth={paperWidth} /></div>
      <InvoiceA4Modal isOpen={invoice} onClose={() => setInvoice(false)} sale={data.sale} />
    </> : <>
      {event.subtitle && <div className="history-detail-object"><span className={`history-event-icon tone-${categoryFor(event.category).tone}`}><Package size={21} /></span><div><small>{categoryFor(event.category).label}</small><h3>{event.subtitle}</h3></div></div>}
      {(details.fields || []).length > 0 && <dl className="history-fields">{details.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}
      {Object.keys(details.snapshot || {}).length > 0 && <section className="history-detail-section"><h4>Amal vaqtidagi ma’lumotlar</h4><dl className="history-fields">{Object.entries(details.snapshot).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{displayValue(value, key)}</dd></div>)}</dl></section>}
      {changes.length > 0 && <section className="history-detail-section"><h4>Nimalar o‘zgardi?</h4><div className="history-changes">{changes.map(([key, value]) => <div className="history-change" key={key}><strong>{fieldLabel(key)}</strong>{value && typeof value === 'object' && ('old' in value || 'new' in value) ? <div className="history-change-values"><span>{displayValue(value.old, key)}</span><ArrowRight size={15} /><b>{displayValue(value.new, key)}</b></div> : <p>{displayValue(value, key)}</p>}</div>)}</div></section>}
      {details.note && <section className="history-note"><FileText size={17} /><div><strong>Izoh</strong><p>{details.note}</p></div></section>}
      {!details.note && changes.length === 0 && (details.fields || []).length === 0 && Object.keys(details.snapshot || {}).length === 0 && <p className="history-detail-state">{event.subtitle || 'Amal qayd etilgan.'}</p>}
    </>}
  </div>;
}

export default function History() {
  const { isAdmin } = useAuth();
  const { activeTenant } = useTenant();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [selection, setSelection] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const query = useDebouncedValue(search.trim());
  const scope = isAdmin ? `admin:${tenantId}` : String(activeTenant?.id || '');
  const list = usePaginatedList(auditApi.getHistory, {
    category, search: query, ...dateRange(period, from, to), ...(isAdmin && tenantId ? { tenant_id: tenantId } : {}),
  }, { tenantId: scope, enabled: isAdmin || Boolean(activeTenant?.id) });
  const refresh = list.refresh;
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  const event = selection?.scope === scope ? selection.event : null;
  const detailKey = event ? `${scope}:${event.id}:${detailRevision}` : null;
  useEffect(() => {
    if (!detailKey || !event) return;
    const controller = new AbortController();
    auditApi.getHistoryDetail(event.source, event.object_id, isAdmin && tenantId ? { tenant_id: tenantId } : {}, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setDetail({ key: detailKey, data }); })
      .catch(error => { if (!controller.signal.aborted) setDetail({ key: detailKey, error }); });
    return () => controller.abort();
  }, [detailKey, event, isAdmin, tenantId]);
  const groups = [];
  for (const item of list.items) {
    const day = dateKey(item.created_at);
    if (groups.at(-1)?.day !== day) groups.push({ day, events: [] });
    groups.at(-1).events.push(item);
  }
  const hasFilters = category !== 'all' || search || period !== 'all';
  const clearFilters = () => { setCategory('all'); setSearch(''); setPeriod('all'); setFrom(''); setTo(''); };
  return <div className="history-page">
    <section className="glass-card history-hero">
      <div className="history-hero-content"><div className="history-eyebrow"><span /><span>DO‘KON FAOLIYATI</span></div><h2>Har bir harakat — bir joyda.</h2><p>Sotuvdan tovar kirimigacha. Kim, qachon va nima qilganini qulay kuzating.</p><div className="history-hero-caption"><Clock3 size={14} />Eng yangi amallar birinchi ko‘rsatiladi</div></div>
      <div className="history-hero-stat"><span className="history-hero-symbol"><HistoryIcon size={29} /></span><strong>{list.loading ? '—' : number(list.total)}</strong><span>{hasFilters ? 'tanlovga mos amal' : 'jami qayd etilgan amal'}</span></div>
    </section>

    <section className="glass-card history-filter-card" aria-label="Tarix filtrlari">
      <div className="history-filter-top"><div className="history-search"><Search size={18} /><input aria-label="Tarixdan qidirish" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tovar, chek yoki xodimni qidiring…" />{search && <button aria-label="Qidiruvni tozalash" onClick={() => setSearch('')}><X size={15} /></button>}</div>
        <select aria-label="Tarix davri" value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Barcha vaqt</option><option value="today">Bugun</option><option value="yesterday">Kecha</option><option value="week">Oxirgi 7 kun</option><option value="month">Shu oy</option><option value="custom">Sanani tanlash</option></select>
        <button className="btn btn-secondary history-refresh" onClick={refresh} disabled={list.loading} aria-label="Tarixni yangilash"><RefreshCw size={16} className={list.loading ? 'history-spin' : ''} /><span>Yangilash</span></button>
      </div>
      {(isAdmin || period === 'custom') && <div className="history-extra-filters">{isAdmin && <RemoteTenantSelect allowAll value={tenantId} onChange={setTenantId} />}{period === 'custom' && <><label>Boshlanish<input aria-label="Boshlanish sanasi" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label><label>Tugash<input aria-label="Tugash sanasi" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label></>}</div>}
      <div className="history-categories" aria-label="Amal turi">{categories.map(({ id, label, icon: Icon }) => <button key={id} className={category === id ? 'is-active' : ''} aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={15} />{label}</button>)}</div>
    </section>

    <section className="history-feed" aria-label="Amallar ro‘yxati" aria-busy={list.loading}>
      <div className="history-feed-heading"><h3>Faoliyat lentasi</h3><span>{hasFilters ? 'Saralangan natijalar' : 'Barcha yo‘nalishlar'}</span></div>
      {list.error ? <div className="glass-card history-empty" role="alert"><HistoryIcon size={32} /><h3>Tarixni yuklab bo‘lmadi</h3><p>{list.error.message}</p><button className="btn btn-secondary" onClick={refresh}>Qayta urinish</button></div>
      : list.loading ? <div className="history-skeleton" aria-label="Yuklanmoqda">{[0, 1, 2, 3].map(key => <div className="glass-card" key={key}><span /><div><i /><i /></div></div>)}</div>
      : groups.length === 0 ? <div className="glass-card history-empty"><span className="history-empty-icon"><HistoryIcon size={32} /></span><h3>{hasFilters ? 'Mos amallar topilmadi' : 'Tarix shu yerdan boshlanadi'}</h3><p>{hasFilters ? 'Boshqa so‘z yoki davr bilan qidirib ko‘ring.' : 'Sotuvlar, tovar kirimlari va yangi o‘zgarishlar shu yerda ko‘rinadi.'}</p>{hasFilters && <button className="btn btn-secondary" onClick={clearFilters}>Filtrlarni tozalash</button>}</div>
      : groups.map(group => <div className="history-day" key={group.day}><div className="history-day-heading"><span className="history-day-dot" /><h4>{dayLabel(group.day)}</h4><span>{new Date(`${group.day}T12:00:00Z`).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div><div className="history-day-events">{group.events.map(item => {
        const meta = categoryFor(item.category);
        const Icon = item.source === 'stock' ? item.direction === 'in' ? ArrowDownLeft : ArrowUpRight : meta.icon;
        return <button key={item.id} className="glass-card history-event" onClick={() => setSelection({ scope, event: item })} aria-label={`${item.title}: ${item.subtitle || item.reference}`}>
          <span className={`history-event-icon tone-${meta.tone}`}><Icon size={20} /></span>
          <span className="history-event-main"><span className="history-event-title">{item.title}<span className={`history-type-badge tone-${meta.tone}`}>{meta.label}</span></span><span className="history-event-description">{item.subtitle || item.reference}</span><span className="history-event-byline"><span className="history-avatar">{item.actor_name.slice(0, 1)}</span>{item.actor_name}<span>·</span>{timeLabel(item.created_at)}{isAdmin && <><span>·</span>{item.tenant_name}</>}</span></span>
          <span className="history-event-right">{item.amount !== null ? <strong>{number(item.amount)} <small>{item.currency}</small></strong> : item.quantity !== null ? <strong className={item.direction === 'in' ? 'history-incoming' : ''}>{item.direction === 'in' ? '+' : '−'}{number(item.quantity)} <small>{item.unit}</small></strong> : <span className="history-recorded"><Check size={13} />Qayd etildi</span>}<span className="history-reference">{item.reference}</span></span><ChevronRight size={17} className="history-event-chevron" />
        </button>;
      })}</div></div>)}
      {!list.error && !list.loading && <Pagination currentPage={list.page} totalItems={list.total} onPageChange={list.setPage} />}
    </section>
    <Modal isOpen={Boolean(event)} onClose={() => setSelection(null)} title={event?.title || 'Amal tafsilotlari'} maxWidth={820}>
      {event && <HistoryDetail key={`${scope}:${event.id}`} event={event} data={detail?.key === detailKey ? detail.data : null} loading={detail?.key !== detailKey} error={detail?.key === detailKey ? detail.error : null} onRetry={() => setDetailRevision(value => value + 1)} />}
    </Modal>
  </div>;
}
