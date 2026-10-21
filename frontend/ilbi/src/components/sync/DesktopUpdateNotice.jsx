import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import './DesktopUpdateNotice.css';

export default function DesktopUpdateNotice() {
  const bridge = window.ilbiDesktop;
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!bridge?.getUpdateStatus) return;
    let alive = true;
    const receive = value => { if (alive) { setStatus(value); if (value.phase === 'available') setDismissed(false); } };
    const unsubscribe = bridge.onUpdateStatus(receive);
    bridge.getUpdateStatus().then(receive).catch(() => {});
    const online = () => { bridge.checkForUpdates().catch(() => {}); };
    window.addEventListener('online', online);
    return () => { alive = false; unsubscribe(); window.removeEventListener('online', online); };
  }, [bridge]);
  if (!bridge?.getUpdateStatus || !status || dismissed || !['available', 'downloading', 'verifying', 'preparing', 'installing', 'updated', 'error'].includes(status.phase)) return null;
  // A background connectivity error should not interrupt a store with no known update.
  if (status.phase === 'error' && !status.bytes) return null;
  const busy = ['downloading', 'verifying', 'preparing', 'installing'].includes(status.phase);
  const action = () => bridge.updateApp().catch(error => setStatus(previous => ({ ...previous, phase: 'error', message: error.message })));
  return <aside className="desktop-update-notice" aria-label="ILBI yangilanishi">
    <div className="desktop-update-heading">{status.phase === 'updated' ? <CheckCircle2 size={20} /> : busy ? <RefreshCw size={20} className="desktop-update-spinner" /> : <Download size={20} />}<strong>{status.phase === 'updated' ? 'ILBI yangilandi' : 'ILBI yangilanishi'}</strong>
      {!busy && <button type="button" className="desktop-update-close" aria-label="Yangilanish xabarini yopish" onClick={() => setDismissed(true)}><X size={17} /></button>}</div>
    <p role="status" aria-live="polite">{status.message}</p>
    {busy && <progress aria-label="Yangilanish yuklanishi" max="100" value={status.progress ?? undefined} />}
    {busy && status.progress !== null && <small>{status.progress}%</small>}
    {!busy && status.phase !== 'updated' && <><small>Ochiq shakllarni saqlang. Yuklashdan keyin ILBI qisqa yopilib, o‘zi qayta ochiladi.</small><button className="btn btn-primary" type="button" onClick={action}><Download size={16} />{status.phase === 'error' ? 'Qayta urinish' : 'Yuklab olish va yangilash'}</button></>}
  </aside>;
}
