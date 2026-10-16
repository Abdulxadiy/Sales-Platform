import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, Headphones, ShieldCheck, RefreshCw, Sliders, FileClock } from 'lucide-react';
import { platformApi } from '../api/platform';
import '../components/platform/platform-admin.css';

export default function PlatformDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    platformApi.overview().then(value => { if (!cancelled) { setData(value); setError(''); } }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [refresh]);
  const cards = [
    { icon: Users, title: 'Hisoblar', count: data?.counts.accounts, note: `${data?.counts.blocked_accounts || 0} ta bloklangan`, to: '/accounts' },
    { icon: Store, title: 'Do‘konlar', count: data?.counts.tenants, note: `${data?.counts.active_tenants || 0} ta faol`, to: '/tenants' },
    { icon: Headphones, title: 'Kutayotgan murojaatlar', count: data?.counts.support_waiting, note: `${data?.counts.support_active || 0} ta muloqot davom etmoqda`, to: '/support' },
    { icon: ShieldCheck, title: 'Sotuvchi tekshiruvi', count: data?.counts.seller_pending, note: 'Ko‘rib chiqilishi kerak', to: '/seller-profiles/review' },
  ];
  return <div className="admin-page">
    <header className="glass-card admin-card admin-heading"><span className="admin-icon"><ShieldCheck size={24} /></span><div style={{ flex: 1 }}><h2>Platforma boshqaruvi</h2><div className="admin-muted">Hisoblar, do‘konlar va yordam markazining umumiy holati.</div></div><button className="btn btn-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Yangilash</button></header>
    {error && <div className="admin-error" role="alert">{error}</div>}
    <div className="admin-grid">{cards.map(({ icon: Icon, title, count, note, to }) => <Link to={to} key={title} className="glass-card admin-card admin-stat"><div className="admin-heading"><Icon size={18} color="var(--primary)" /><span>{title}</span></div><strong>{count ?? '—'}</strong><span className="admin-muted">{note}</span></Link>)}</div>
    <section className="glass-card admin-card admin-form"><h3 style={{ margin: 0, fontSize: 16 }}>Tezkor amallar</h3><div className="admin-toolbar"><Link className="btn btn-secondary" to="/accounts"><Users size={16} />Hisob va kirishni boshqarish</Link><Link className="btn btn-secondary" to="/services"><Sliders size={16} />Bildirishnoma sozlamalari</Link><Link className="btn btn-secondary" to="/audit"><FileClock size={16} />Audit jurnali</Link></div><div className="admin-muted">Telegram bot: {data ? data.telegram_configured ? 'sozlangan' : 'sozlanmagan — server sozlamasini tekshiring' : 'tekshirilmoqda...'}</div></section>
    <section className="glass-card admin-card admin-form"><div className="admin-heading"><h3>So‘nggi amallar</h3><Link className="admin-link" to="/audit" style={{ marginLeft: 'auto' }}>Barcha yozuvlar →</Link></div>{data?.activity.map(row => <div key={row.id} className="admin-note" style={{ justifyContent: 'space-between' }}><div><strong>{row.action}</strong><div className="admin-muted">{row.actor} · {row.description}</div></div><span className="admin-muted" style={{ flexShrink: 0 }}>{new Date(row.created_at).toLocaleDateString('uz-UZ')}</span></div>)}{data && !data.activity.length && <div className="admin-empty">Hali audit yozuvi yo‘q.</div>}</section>
  </div>;
}
