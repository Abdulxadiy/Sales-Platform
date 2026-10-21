import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Check, CloudOff, RefreshCw, X } from 'lucide-react';
import { getRefreshToken, getAccessToken, parseJwt, setTokens } from '../../api/client';
import { useTenant } from '../../context/TenantContext';
import { desktopRequest } from './desktopApi';
import './sync.css';

export default function SyncCenter() {
  const { activeTenant } = useTenant();
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const rows = useRef(new Map());
  const positions = useRef(new Map());
  const desktop = Boolean(window.ilbiDesktop);
  const cloudSession = !parseJwt(getAccessToken())?.desktop_device;

  useEffect(() => {
    if (!desktop) return undefined;
    let stopped = false;
    let timer;
    async function poll() {
      try {
        const status = await desktopRequest('status');
        const next = status.enrolled && !cloudSession ? await desktopRequest('queue') : { ...status, operations: [] };
        if (!stopped) setState(next);
      } catch (failure) { if (!stopped) setError(failure.message); }
      if (!stopped) timer = setTimeout(poll, open ? 500 : 3000);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [desktop, open, cloudSession]);

  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const order = state?.operations?.map(row => row.id).join(',') || '';
  useLayoutEffect(() => {
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
  }, [order]);

  if (!desktop) return null;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const operations = state?.operations || [];
  const active = operations.find(row => row.status === 'active');
  const nextPriority = operations.find(row => row.status === 'waiting' && (row.priority || operations.some(parent => parent.priority && parent.dependencies.includes(row.id))));
  const label = !state ? 'Sinxronlash holati' : !state.enrolled ? 'Offline tayyorlash' : cloudSession ? 'Hisobni kassaga ulash'
    : active ? 'Sinxronlanmoqda' : operations.some(row => row.status === 'error' || row.status === 'blocked') ? 'Tekshirish kerak'
      : !state.online ? 'Offline' : operations.length ? `Kutilmoqda: ${operations.length}` : 'Sinxronlangan';
  async function action(path, id) {
    setError('');
    try { await desktopRequest(path, { id }); setState(await desktopRequest('queue')); }
    catch (failure) { setError(failure.message); }
  }
  async function prepare(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const tokens = await desktopRequest(state?.enrolled ? 'actor' : 'enroll', {
        pin, tenant_id: activeTenant?.id, refresh: getRefreshToken(),
      });
      setTokens(tokens.access, tokens.refresh, true);
      window.location.reload();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <>
    <button ref={trigger} className="sync-status" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      {active ? <RefreshCw size={15} className="sync-arrows" /> : state?.online ? <Check size={15} /> : <CloudOff size={15} />}
      <span>{label}</span>{operations.length > 0 && <b>{operations.length}</b>}
    </button>
    <dialog ref={dialog} className="sync-dialog" aria-labelledby="sync-title" onCancel={event => { event.preventDefault(); close(); }} onClose={close}>
      <div className="sync-heading"><div><h2 id="sync-title">Sinxronlash markazi</h2><p>{state?.online ? 'Serverga ulanish bor' : 'Ishlaringiz shu do‘kon kompyuterida saqlanadi'}</p></div>
        <button className="sync-icon-button" onClick={close} aria-label="Yopish"><X size={20} /></button></div>
      {error && <p role="alert" className="sync-error">{error}</p>}
      {!state?.enrolled || cloudSession ? <form onSubmit={prepare} className="sync-setup">
        <p>{state?.enrolled ? 'Hisobingizni ushbu do‘kon kassalariga ulang. Keyingi safar internet bo‘lmasa ham offline parol bilan kirasiz.' : 'Do‘kon egasi internet orqali bir marta bazani shu kompyuterga yuklaydi. Boshqa kassalar unga mahalliy tarmoq orqali ulanadi.'}</p>
        <label>Offline parol<input type="password" minLength={8} required value={pin} onChange={event => setPin(event.target.value)} autoComplete="new-password" /></label>
        <button className="btn btn-primary" disabled={busy || !activeTenant?.id}>{busy ? 'Tayyorlanmoqda…' : 'Offline ishlashni tayyorlash'}</button>
      </form> : <>
        <div className="sync-summary"><span>{operations.length} ta operatsiya</span><span>{state.last_sync ? `Oxirgi: ${new Date(state.last_sync).toLocaleString('uz-UZ')}` : 'Dastlabki sinxronlash'}</span></div>
        {state.error && <p className="sync-notice">{state.error}</p>}
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
    </dialog>
  </>;
}
