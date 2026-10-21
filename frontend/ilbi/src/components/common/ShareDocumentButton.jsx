import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import Modal from './Modal';
import { saveSharedDocument, receiptShareURL } from '../../utils/documentShare';

export default function ShareDocumentButton({ elementId, title = 'ILBI Savdo Cheki', sales = [], format = 'receipt', paperWidth = '58mm', className = 'btn btn-secondary' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [links, setLinks] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const linkRef = useRef(null);
  const tokenKey = [...new Set((Array.isArray(sales) ? sales : [sales]).map(sale => sale?.public_token).filter(token => receiptShareURL(token)))].join(',');

  const openShare = () => {
    const tokens = format === 'receipt' ? tokenKey.split(',').filter(Boolean) : [];
    setMessage(''); setError(''); setChecking(false);
    setLinks(window.ilbiDesktop ? [] : tokens.map(token => receiptShareURL(token)));
    if (tokens.length && window.ilbiDesktop) {
      if (window.ilbiDesktop.receiptShareLinks) setChecking(true);
      else setMessage('Chek havolasi uchun ilovani yangilang. Hozir PDF nusxasini saqlashingiz mumkin.');
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !window.ilbiDesktop?.receiptShareLinks) return;
    const tokens = format === 'receipt' ? tokenKey.split(',').filter(Boolean) : [];
    if (!tokens.length) return;
    let active = true;
    window.ilbiDesktop.receiptShareLinks(tokens).then(result => {
      if (!active) return;
      setLinks(result.links);
      if (result.pending) setMessage('Ayrim cheklar hali serverga yuborilmagan. Sinxronlashdan keyin havola paydo bo‘ladi. Hozir PDF nusxasini saqlashingiz mumkin.');
    }).catch(() => {
      if (active) setMessage('Chek havolasini tekshirib bo‘lmadi. Internetga ulang yoki PDF nusxasini saqlang.');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [open, tokenKey, format]);

  const copyLink = async () => {
    setError(''); setMessage('');
    try {
      try { await navigator.clipboard.writeText(links.join('\n')); }
      catch {
        linkRef.current?.focus(); linkRef.current?.select();
        if (!document.execCommand('copy')) throw new Error('Havolani belgilang va Ctrl+C bilan nusxalang.');
      }
      setMessage('Chek havolasi nusxalandi.');
    } catch (failure) { setError(failure.message || 'Havolani nusxalab bo‘lmadi.'); }
  };

  const shareLink = async () => {
    setError('');
    try {
      await navigator.share(links.length === 1 ? { title, url: links[0] } : { title, text: links.join('\n') });
    } catch (failure) {
      if (failure.name !== 'AbortError') setError('Ulashish oynasini ochib bo‘lmadi. Havolani nusxalashingiz mumkin.');
    }
  };

  const savePDF = async () => {
    setError(''); setMessage('');
    setBusy(true);
    try {
      const result = await saveSharedDocument({ elementId, title, format, paperWidth });
      if (!result.canceled) setMessage(window.ilbiDesktop?.saveDocumentPDF ? 'PDF fayli saqlandi. Uni boshqa ilovaga biriktirib ulashing.' : 'PDF fayli yuklab olindi. Uni boshqa ilovaga biriktirib ulashing.');
    } catch (failure) { setError(failure.message || 'PDF faylini saqlab bo‘lmadi. Qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };

  return <>
    <button type="button" className={className} onClick={openShare}><Share2 size={16} /><span>Ulashish</span></button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title={format === 'invoice' ? 'Hujjatni ulashish' : 'Chekni ulashish'} maxWidth={490}>
      <div className="no-print" style={{ display: 'grid', gap: 14 }} aria-busy={busy || checking}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>PDF nusxasini saqlab, boshqa ilovaga biriktirib ulashing.</p>
        <button type="button" className="btn btn-primary" onClick={savePDF} disabled={busy}><Download size={16} />{busy ? 'PDF tayyorlanmoqda…' : window.ilbiDesktop?.saveDocumentPDF ? 'PDF faylini saqlash' : 'PDF faylini yuklab olish'}</button>
        {checking && <p role="status" style={{ fontSize: 13 }}>Chek havolasi tekshirilmoqda…</p>}
        {links.length > 0 && <>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>Chek havolasi<textarea ref={linkRef} className="input-field" readOnly value={links.join('\n')} rows={links.length > 1 ? 3 : 2} style={{ width: '100%', resize: 'vertical', overflowWrap: 'anywhere', fontSize: 12 }} /></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={copyLink}><Copy size={15} />Havolani nusxalash</button>
            {typeof navigator.share === 'function' && <button type="button" className="btn btn-secondary" onClick={shareLink}><Share2 size={15} />Ilova orqali ulashish</button>}
          </div>
        </>}
        {message && <p role="status" style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{message}</p>}
        {error && <p role="alert" style={{ fontSize: 13, color: 'var(--accent-rose)', margin: 0 }}>{error}</p>}
      </div>
    </Modal>
  </>;
}
