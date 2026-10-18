import IlbiLoader from '../components/common/IlbiLoader';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, KeyRound, Ban, ShieldCheck, RefreshCw } from 'lucide-react';
import { platformApi } from '../api/platform';
import Modal from '../components/common/Modal';
import IdentityRecoveryModal from '../components/common/IdentityRecoveryModal';
import { useToast } from '../context/ToastContext';
import '../components/platform/platform-admin.css';

const roles = { owner: 'Do‘kon egasi', staff: 'Xodim', platform_admin: 'Platforma admini' };
export default function PlatformAccounts() {
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get('search') || '');
  const [search, setSearch] = useState(input);
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ results: [], count: 0 });
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = JSON.stringify([search, role, active, page, reload]);
  const loading = loadedKey !== requestKey;
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState(null);
  const [detail, setDetail] = useState(null);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const toast = useToast();
  const refresh = () => setReload(value => value + 1);
  useEffect(() => { const timer = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [input]);
  useEffect(() => {
    let cancelled = false;
    platformApi.accounts({ search, role, active, page, page_size: 20 }).then(data => { if (!cancelled) { setResult(data); setError(''); } })
      .catch(err => { if (!cancelled) { setResult({ results: [], count: 0 }); setError(err.message); } }).finally(() => { if (!cancelled) setLoadedKey(requestKey); });
    return () => { cancelled = true; };
  }, [search, role, active, page, reload, requestKey]);
  async function changeStatus(event) {
    event.preventDefault(); setSaving(true); setActionError('');
    try {
      await platformApi.setAccountStatus(target.id, { blocked: target.is_active, reason, admin_password: password });
      setTarget(null); setPassword(''); refresh(); toast.success('Hisob holati yangilandi.');
    } catch (err) { setActionError(err.message); } finally { setSaving(false); }
  }
  return <div className="admin-page">
    <header className="glass-card admin-card admin-heading"><span className="admin-icon"><Users size={24} /></span><div style={{ flex: 1 }}><h2>Barcha hisoblar</h2><div className="admin-muted">Egalari, xodimlar va platforma hisoblari — bitta joyda.</div></div><button className="btn btn-secondary" disabled={loading} onClick={refresh}><RefreshCw size={16} />Yangilash</button></header>
    <section className="glass-card admin-card admin-form">
      <div className="admin-muted">Yangi do‘kon egasi <Link className="admin-link" to="/tenants">Do‘konlar</Link>, xodim esa <Link className="admin-link" to="/employees">Jamoa</Link> bo‘limidan qo‘shiladi.</div>
      <div className="admin-grid">
        <label className="admin-field">Hisobni qidirish<input className="input-field" type="search" value={input} onChange={event => setInput(event.target.value)} placeholder="Ism, login, telefon yoki email" /></label>
        <label className="admin-field">Hisob turi<select className="input-field" value={role} onChange={event => { setRole(event.target.value); setPage(1); }}><option value="">Barcha hisoblar</option>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="admin-field">Holati<select className="input-field" value={active} onChange={event => { setActive(event.target.value); setPage(1); }}><option value="">Barcha holatlar</option><option value="true">Faol</option><option value="false">Bloklangan</option></select></label>
      </div>
      {!loading && error && <div className="admin-error" role="alert">{error}</div>}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Hisob</th><th>Roli</th><th>Telegram / holat</th><th>Do‘konlar</th><th>Amallar</th></tr></thead><tbody>
        {(loading ? [] : result.results).map(account => <tr key={account.id}><td><strong>{account.name}</strong><div className="admin-muted">{account.phone_number}</div><div className="admin-muted">{account.email || account.username || '—'}</div></td><td>{roles[account.role]}</td><td><span className="admin-pill" style={{ color: account.is_active ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{account.is_active ? 'Faol' : 'Bloklangan'}</span><div className="admin-muted">Telegram: {account.telegram_linked ? 'ulangan' : 'ulanmagan'}</div></td><td><button className="btn btn-secondary" onClick={() => setDetail(account)}>{account.memberships.length} ta do‘kon</button></td><td><div className="admin-toolbar"><button className="btn btn-secondary" title="Login va Telegramni boshqarish" aria-label={`${account.name}: login va Telegram`} onClick={() => setIdentity(account.id)}><KeyRound size={16} /></button>{account.role !== 'platform_admin' && <button className="btn btn-secondary" aria-label={`${account.name}: hisob holati`} title={account.is_active ? 'Hisobni bloklash' : 'Blokdan chiqarish'} onClick={() => { setTarget(account); setPassword(''); setReason(''); setActionError(''); }}>{account.is_active ? <Ban size={16} /> : <ShieldCheck size={16} />}</button>}</div></td></tr>)}
        {(loading || !result.results.length) && <tr><td colSpan={5} className="admin-empty">{loading ? <IlbiLoader label="Hisoblar yuklanmoqda..." /> : error ? 'Ro‘yxatni yuklab bo‘lmadi.' : 'Hisob topilmadi.'}</td></tr>}
      </tbody></table></div>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}><span className="admin-muted">Jami {result.count} ta hisob · {page}-sahifa</span><div className="admin-toolbar"><button className="btn btn-secondary" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Oldingi</button><button className="btn btn-secondary" disabled={loading || page * 20 >= result.count} onClick={() => setPage(value => value + 1)}>Keyingi</button></div></div>
    </section>
    <IdentityRecoveryModal key={identity || 'closed'} userId={identity} onClose={() => setIdentity(null)} onSaved={() => { refresh(); toast.success('Login va Telegram yangilandi.'); }} />
    <Modal isOpen={Boolean(detail)} title="Hisobning do‘konlari" onClose={() => setDetail(null)}><div className="admin-form">{detail?.memberships.map(row => <div className="admin-note" key={row.id} style={{ justifyContent: 'space-between' }}><div><strong>{row.name}</strong><div className="admin-muted">{row.is_owner ? 'Do‘kon egasi' : 'Xodim'} · {row.is_active ? 'Faol' : 'Faol emas'}</div></div><Link className="admin-link" to={`/employees?tenant_id=${row.id}`}>Jamoani boshqarish →</Link></div>)}{detail && !detail.memberships.length && <div className="admin-muted">Hisob hali do‘konga biriktirilmagan.</div>}</div></Modal>
    <Modal isOpen={Boolean(target)} title={target?.is_active ? 'Hisobni bloklash' : 'Blokdan chiqarish'} onClose={() => { if (!saving) setTarget(null); }}><form className="admin-form" onSubmit={changeStatus}><div className="admin-note">{target?.name} · {target?.phone_number}<br />Hisobning barcha do‘konlaridagi kirishga ta’sir qiladi. Tarix va a’zoliklar saqlanadi.</div><label className="admin-field">Sababi<textarea className="input-field" required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><label className="admin-field">Administrator parolingiz<input className="input-field" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{actionError && <div role="alert" className="admin-error">{actionError}</div>}<div className="admin-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setTarget(null)}>Bekor qilish</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Tasdiqlash'}</button></div></form></Modal>
  </div>;
}
