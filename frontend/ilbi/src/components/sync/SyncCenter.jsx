import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Cloud, CloudOff, RefreshCw, X } from 'lucide-react';
import { getRefreshToken, getAccessToken, getAuthenticationGeneration, parseJwt, setTokens } from '../../api/client';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import CustomSelect from '../common/CustomSelect';
import { desktopRequest } from './desktopApi';
import './sync.css';
import DesktopSecurityPanel from './DesktopSecurityPanel';

export default function SyncCenter() {
  const { activeTenant, tenants, selectTenant, loadingTenants } = useTenant();
  const { isAdmin } = useAuth();
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [verifyAccount, setVerifyAccount] = useState(false);
  const [setupProgress, setSetupProgress] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const rows = useRef(new Map());
  const positions = useRef(new Map());
  const desktop = Boolean(window.ilbiDesktop);
  const cloudSession = !parseJwt(getAccessToken())?.desktop_device;
  const enrollment = !state?.enrolled;
  const ownedTenants = tenants.filter(tenant => tenant.is_owner);
  const selectedTenant = activeTenant?.is_owner ? activeTenant : ownedTenants.length === 1 ? ownedTenants[0] : null;
  const setupBlocked = !state ? 'Kassa holati tekshirilmoqda…' : !enrollment ? ''
    : isAdmin ? 'Offline bazani tayyorlash uchun do‘kon egasi hisobidan kiring. Platforma administratori hisobi bilan do‘kon ulanmaydi.'
      : loadingTenants ? 'Do‘konlaringiz yuklanmoqda…'
        : !ownedTenants.length ? 'Avval do‘kon egasi hisobidan kiring. Offline bazani do‘kon egasi tayyorlaydi.'
          : !selectedTenant ? 'Offline ishlash uchun quyidan do‘konni tanlang.' : '';

  useEffect(() => {
    return window.ilbiDesktop?.onOpenSecurity?.(()=>setOpen(true));
  }, []);

  useEffect(() => {
    if (!desktop) return undefined;
    let stopped = false;
    let timer;
    async function poll() {
      try {
        const status = await desktopRequest('status');
        const next = status.enrolled && !cloudSession ? await desktopRequest('queue') : { ...status, operations: [] };
        next.lease_warning = Boolean(next.lease_until && next.lease_until*1000-Date.now()<86400000);
        if (!stopped) setState(next);
      } catch (failure) { if (!stopped) setError(failure.message); }
      if (!stopped) timer = setTimeout(poll, open ? 500 : 3000);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [desktop, open, cloudSession]);

  useLayoutEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [open]);

  const order = state?.operations?.map(row => row.id).join(',') || '';
  useLayoutEffect(() => {
    if (!open) { positions.current = new Map(); return; }
    const next = new Map();
    for (const [id, node] of rows.current) {
      const top = node.getBoundingClientRect().top;
      const previous = positions.current.get(id);
      next.set(id, top);
      if (previous !== undefined && previous !== top && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        node.animate([{ transform: `translateY(${previous - top}px)`, zIndex: 2 }, { transform: 'translateY(0)', zIndex: 1 }],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
    positions.current = next;
  }, [order, open]);

  if (!desktop) return null;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const operations = state?.operations || [];
  const active = operations.find(row => row.status === 'active');
  const nextPriority = operations.find(row => row.status === 'waiting' && (row.promoted || row.priority || operations.some(parent => parent.priority && parent.dependencies.includes(row.id))));
  const onlineMode = !state?.enrolled || cloudSession;
  const label = !state ? 'Sinxronlash holati' : onlineMode ? 'Online rejim'
    : active ? 'Sinxronlanmoqda' : operations.some(row => row.status === 'error' || row.status === 'blocked') ? 'Tekshirish kerak'
      : !state.online ? 'Offline' : operations.length ? `Kutilmoqda: ${operations.length}` : 'Sinxronlangan';
  async function action(path, id) {
    setError('');
    try { await desktopRequest(path, { id }); setState(await desktopRequest('queue')); }
    catch (failure) { setError(failure.message); }
  }
  async function prepare(event) {
    event.preventDefault();
    if (setupBlocked) { setError(setupBlocked); return; }
    setBusy(true); setError('');
    const generation = getAuthenticationGeneration();
    try {
      if (verifyAccount) {
        if (!confirmationPassword) throw Error('Odatiy hisob parolingizni kiriting.');
        await desktopRequest('session',{password:confirmationPassword,refresh:getRefreshToken()});
        setConfirmationPassword(''); setVerifyAccount(false);
      }
      let tokens = await desktopRequest(state?.enrolled ? 'actor' : 'enroll', {
        tenant_id: enrollment ? selectedTenant?.id : undefined, refresh: getRefreshToken(),
      });
      if (tokens.job_token) {
        const jobToken=tokens.job_token;
        for (;;) {
          if (getAuthenticationGeneration()!==generation) throw Error('Hisob o‘zgargan. Tayyorlash holatini o‘sha hisobda tekshiring.');
          const progress=await desktopRequest('setup-status',{job_token:jobToken});
          setSetupProgress(progress);
          if (progress.stage==='error') throw Error(progress.message);
          if (progress.stage==='ready') {tokens=progress.tokens;break;}
          await new Promise(resolve=>setTimeout(resolve,500));
        }
      }
      if(getAuthenticationGeneration()!==generation)return;
      setTokens(tokens.access, tokens.refresh, true);
      window.location.reload();
    } catch (failure) { if(failure.code==='account_verification_required')setVerifyAccount(true); setError(failure.message); }
    finally { setBusy(false); }
  }

  return <>
    <button ref={trigger} className="sync-status" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      {onlineMode ? <Cloud size={15} /> : active ? <RefreshCw size={15} className="sync-arrows" /> : state?.online ? <Check size={15} /> : <CloudOff size={15} />}
      <span className="sync-status-label">{label}{state && !state.enrolled && <small>Internetsiz ishlamaydi</small>}</span>{operations.length > 0 && <b>{operations.length}</b>}
      {state?.lease_warning&&<small>Ruxsat muddati yaqin</small>}
    </button>
    <dialog ref={dialog} className="sync-dialog" aria-labelledby="sync-title" onCancel={event => { event.preventDefault(); close(); }} onClose={close}>
      <div className="sync-heading"><div><h2 id="sync-title">Sinxronlash markazi</h2><p>{onlineMode ? 'Internet orqali ishlash rejimi. Offline rejim ixtiyoriy.' : state?.online ? 'Serverga ulanish bor' : 'Ishlaringiz shu do‘kon kompyuterida saqlanadi'}</p></div>
        <button className="sync-icon-button" onClick={close} aria-label="Yopish"><X size={20} /></button></div>
      {error && <p role="alert" className="sync-error">{error}</p>}
      {!state?.enrolled || cloudSession ? <form onSubmit={prepare} className="sync-setup">
        {state && !state.enrolled && <p className="sync-notice" role="note">Offline rejim sozlanmagan. Internet uzilsa, ilovada ishlay olmaysiz. Internetsiz ham ishlash uchun offline rejimni internet borida tayyorlang.</p>}
        <p>{state?.enrolled ? 'Hisobingizni ushbu do‘kon kassalariga ulang. Keyin odatiy login va parolingiz bilan internet borida ham, yo‘g‘ida ham ishlaysiz.' : 'Do‘konni tanlang va tayyorlashni boshlang. Ma’lumotlar shu kompyuterga yuklanadi. Bitta kompyuter uchun boshqa ulanish kerak emas.'}</p>
        {enrollment && !isAdmin && ownedTenants.length > 0 && <label>Offline ishlaydigan do‘kon
          <CustomSelect aria-label="Offline ishlaydigan do‘kon" name="offline-tenant" fullWidth value={selectedTenant?.id ?? ''} options={ownedTenants.map(tenant => ({ value: tenant.id, label: tenant.name }))}
            placeholder="Do‘konni tanlang" disabled={busy} onChange={id => { selectTenant(ownedTenants.find(tenant => String(tenant.id) === String(id))); setError(''); }} />
        </label>}
        {setupBlocked && <p className="sync-setup-hint" id="offline-setup-reason" role="status">{setupBlocked}</p>}
        <small className="sync-setup-hint">Alohida offline parol yaratilmaydi. Odatiy hisobingiz ishlatiladi; ichki himoya kalitlarini dastur o‘zi yaratadi.</small>
        {verifyAccount && <label>Hisobingizni qayta tasdiqlang<input name="account-confirmation-password" type="password" required value={confirmationPassword} onChange={event=>setConfirmationPassword(event.target.value)} autoComplete="off" disabled={busy}/><small>Bu hozirgi hisob parolingiz. Yangi parol o‘rnatilmaydi.</small></label>}
        {setupProgress && <div className="sync-setup-progress" role="status"><RefreshCw size={20} className={busy?'sync-arrows':''}/><strong>{setupProgress.message}</strong>{setupProgress.files_total>0&&<small>Rasmlar: {setupProgress.files_done} / {setupProgress.files_total}</small>}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy || Boolean(setupBlocked)} aria-describedby={setupBlocked ? 'offline-setup-reason' : undefined}>{busy ? 'Tayyorlanmoqda…' : state?.enrolled ? 'Hisobni kassaga ulash' : 'Internetsiz ishlashni yoqish'}</button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={close}>Hozircha internet orqali ishlayman</button>
      </form> : <>
        <div className="sync-summary"><span>{operations.length} ta operatsiya</span><span>{state.last_sync ? `Oxirgi: ${new Date(state.last_sync).toLocaleString('uz-UZ')}` : 'Dastlabki sinxronlash'}</span></div>
        {state.error && <p className="sync-notice">{state.error}</p>}
        {(state.error || operations.some(row => row.status === 'error')) && <p className="sync-footnote"><a href="/login">Serverga qayta kirish</a> — qurilmani ulagan owner hisobi bilan ruxsatni yangilash mumkin.</p>}
        <ol className="sync-queue" aria-label="Sinxronlash navbati">
          {operations.map(row => {
            const running = row.status === 'active';
            const priority = row.id === nextPriority?.id;
            const failed = row.status === 'error' || row.status === 'blocked';
            return <li key={row.id} ref={node => { if (node) rows.current.set(row.id, node); else rows.current.delete(row.id); }}
              className={`sync-row ${running ? 'is-active' : ''} ${priority ? 'is-next' : ''}`} data-operation-id={row.id}>
              <div className="sync-row-icon">{running ? <RefreshCw size={20} className="sync-arrows" /> : priority ? <RefreshCw size={18} className="sync-arrows" /> : <span>{row.sequence}</span>}</div>
              <div className="sync-row-body"><strong>{row.title}</strong><small>{running ? state.stage === 'confirming' ? 'Server tasdig‘i kutilmoqda…' : 'Yuborilmoqda…' : failed ? row.error || 'Bog‘liq operatsiyani tekshirish kerak' : priority ? 'Keyingi bajariladi' : 'Kutilmoqda…'}</small>
                {running && <div className={`sync-progress ${state.stage === 'confirming' || state.progress === null ? 'is-indeterminate' : ''}`}
                  role="progressbar" aria-label="Serverga yuborish" aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={state.stage === 'confirming' || state.progress === null ? undefined : state.progress}>
                  <span style={{ width: `${state.progress ?? 35}%` }} /></div>}
              </div>
              {running && <span className="sync-percent">{state.stage === 'confirming' ? 'Tasdiq…' : state.progress === null ? '…' : `${state.progress}%`}</span>}
              {!running && <button className="sync-priority-button" disabled={row.status === 'blocked'} onClick={() => action(failed ? 'retry' : 'priority', row.id)}>
                {failed ? 'Qayta urinish' : row.priority ? 'Ustuvor navbatda' : <><ArrowUp size={14} />Darhol sinxronlash</>}
              </button>}
            </li>;
          })}
        </ol>
        {!operations.length && <div className="sync-empty"><Check size={32} /><strong>Barcha operatsiyalar yuborilgan</strong><p>Yangi ishlaringiz shu yerda ko‘rinadi.</p></div>}
        <p className="sync-footnote">“Darhol” tanlangan ishni zarur bog‘liqliklari bilan oldinga oladi. Davom etayotgan yuborish tugagach boshlanadi.</p>
      </>}
      {state?.enrolled&&!cloudSession&&<DesktopSecurityPanel visible={open}/>}
      <a className="sync-guide-link" href="/desktop-guide" onClick={event => {
        if (!window.ilbiDesktop?.openGuide) return;
        event.preventDefault(); void window.ilbiDesktop.openGuide().catch(failure => setError(failure.message));
      }}>Ilovani sozlash — rasmli qo‘llanma</a>
    </dialog>
  </>;
}
