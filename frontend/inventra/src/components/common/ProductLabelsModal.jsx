import { useMemo, useState } from 'react';
import Modal from './Modal';
import { catalogApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { labelDocument, printLabelDocument } from '../../utils/productLabels';

export default function ProductLabelsModal({ variant: initialVariant, canGenerate, onClose, onChanged }) {
  const toast = useToast();
  const [variant, setVariant] = useState(initialVariant);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState({ format: 'a4', width: 50, height: 30, copies: 1, showName: true, showPrice: true });
  const update = (field, value) => setOptions(prev => ({ ...prev, [field]: value }));
  const preview = useMemo(() => {
    if (!variant.barcode) return { html: '', error: 'Bu mahsulotga hali shtrix-kod berilmagan.' };
    try { return { html: labelDocument(variant, { ...options, copies: 1 }), error: '' }; }
    catch (error) { return { html: '', error: error.message }; }
  }, [variant, options]);
  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try { setVariant(await catalogApi.generateBarcode(variant.id)); onChanged(); }
    catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const print = () => {
    try { printLabelDocument(labelDocument(variant, options)); }
    catch (error) { toast.error(error.message); }
  };
  return <Modal isOpen onClose={onClose} title="Shtrix-kod va narx yorlig‘i" maxWidth={650}>
    <p>{variant.product_name || variant.name}</p>
    {!variant.barcode && (canGenerate ? <button className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? 'Kutilmoqda…' : 'Shtrix-kod yaratish'}</button> : <p>Shtrix-kod yaratish uchun mahsulotni tahrirlash ruxsati kerak.</p>)}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '16px 0' }}>
      <label>Qog‘oz <select className="form-input" value={options.format} onChange={e => update('format', e.target.value)}>
        <option value="a4">A4 — bir nechta yorliq</option><option value="label">Yorliq printeri</option>
      </select></label>
      <label>Eni (mm)<input className="form-input" type="number" min="30" max="190" value={options.width} onChange={e => update('width', e.target.value)} style={{ width: 100 }} /></label>
      <label>Bo‘yi (mm)<input className="form-input" type="number" min="20" max="100" value={options.height} onChange={e => update('height', e.target.value)} style={{ width: 100 }} /></label>
      <label>Nusxa<input className="form-input" type="number" min="1" max="200" value={options.copies} onChange={e => update('copies', e.target.value)} style={{ width: 100 }} /></label>
    </div>
    <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
      <label><input type="checkbox" checked={options.showName} onChange={e => update('showName', e.target.checked)} /> Mahsulot nomi</label>
      <label><input type="checkbox" checked={options.showPrice} onChange={e => update('showPrice', e.target.checked)} /> Sotuv narxi</label>
    </div>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Faqat shtrix-kod uchun ikkala belgilashni o‘chiring. Chop etishda masshtabni 100% tanlang va brauzerning sahifa sarlavhasi hamda pastki yozuvlarini o‘chiring. Uzun shtrix-kod uchun kengroq yorliq tanlang.</p>
    {preview.error ? <p role="alert">{preview.error}</p> : <iframe title="Yorliq namunasi" sandbox="" srcDoc={preview.html} style={{ width: '100%', height: 160, border: '1px solid var(--border-subtle)', background: 'white' }} />}
    <button className="btn btn-primary" disabled={busy || !!preview.error} onClick={print} style={{ marginTop: 16 }}>Chop etish</button>
  </Modal>;
}
