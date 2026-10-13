import { useState } from 'react';
import Modal from './Modal';
import Pagination from './Pagination';
import { catalogApi } from '../../api/client';
import { downloadFile } from '../../utils/downloadFile';
import { useToast } from '../../context/ToastContext';

const FIELD_NAMES = { name: 'Mahsulot', category: 'Kategoriya', variant_name: 'Variant', barcode: 'Shtrix-kod',
  price_recommended: 'Sotuv narxi', price_min: 'Minimal narx', price_partner: 'Hamkor narxi',
  quantity: 'Miqdor', cost_price: 'Tannarx', currency: 'Valyuta', unit: 'Birlik', expires_on: 'Yaroqlilik sanasi', batch_code: 'Partiya' };

export default function CatalogImportModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const errors = job?.rows.filter(row => Object.keys(row.errors).length) || [];
  const preview = async () => {
    if (!file || busy) return;
    setBusy(true); setJob(null); setPage(1);
    try {
      const body = new FormData(); body.append('file', file);
      setJob(await catalogApi.previewImport(body));
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const commit = async () => {
    if (!job || errors.length || busy) return;
    setBusy(true);
    try {
      const result = await catalogApi.commitImport(job.id);
      toast.success(`${result.created_count} ta variant yuklandi.`);
      onSuccess(); onClose();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const template = async () => {
    try { downloadFile(await catalogApi.getImportTemplate(), 'inventra-import-shablon.xlsx'); }
    catch (error) { toast.error(error.message); }
  };
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Excel / CSV fayldan mahsulot yuklash" maxWidth={1000}>
    <p>Shablonni to‘ldiring, faylni tanlang va qatorlarni tekshiring. Tasdiqlashdan keyin mahsulotlar va kiritilgan boshlang‘ich qoldiq saqlanadi.</p>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Majburiy ustunlar: mahsulot, kategoriya, sotuv_narxi. Ko‘pi bilan 1 000 qator, 8 MB. CSV — UTF-8; sana — YYYY-MM-DD. Shtrix-kod ustunini matn formatida saqlang. Mavjud variant yoki takror shtrix-kod xato sifatida ko‘rsatiladi.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <button className="btn btn-secondary" onClick={template} disabled={busy}>Shablonni yuklash</button>
      <input aria-label="Import fayli" type="file" accept=".xlsx,.csv" disabled={busy} onChange={event => {
        setFile(event.target.files?.[0] || null); setJob(null);
      }} />
      <button className="btn btn-primary" onClick={preview} disabled={!file || busy}>{busy ? 'Kutilmoqda…' : 'Qatorlarni tekshirish'}</button>
    </div>
    {job && <>
      <p role="status">Jami: {job.rows.length} qator. Xatoli: {errors.length}. {errors.length ? 'Xatolarni faylda tuzatib, qayta yuklang.' : 'Tasdiqlashga tayyor.'}</p>
      <div style={{ overflowX: 'auto', maxHeight: 400 }}><table className="data-table" style={{ width: '100%' }}>
        <thead><tr>{['Qator', 'Mahsulot / variant', 'Kategoriya', 'Narx', 'Miqdor', 'Holat'].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{job.rows.slice((page - 1) * 50, page * 50).map(row => <tr key={row.row_number}>
          <td>{row.row_number}</td><td>{row.data.name} / {row.data.variant_name || 'Standart'}<br />{row.data.barcode}
            <details><summary>Barcha ustunlar</summary>{Object.entries(row.data).map(([field, value]) => <div key={field}><strong>{FIELD_NAMES[field] || field}:</strong> {value}</div>)}</details>
          </td>
          <td>{row.data.category}</td><td>{row.data.price_recommended} {row.data.currency || 'UZS'}</td><td>{row.data.quantity || 0}</td>
          <td style={{ color: Object.keys(row.errors).length ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {Object.entries(row.errors).map(([field, message]) => <div key={field}>{FIELD_NAMES[field] || field}: {message}</div>)}
            {!Object.keys(row.errors).length && 'Tayyor'}
          </td>
        </tr>)}</tbody>
      </table></div>
      {job.rows.length > 50 && <Pagination currentPage={page} totalItems={job.rows.length} pageSize={50} onPageChange={setPage} />}
      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || errors.length > 0} onClick={commit}>Tasdiqlash va saqlash ({job.rows.length})</button>
    </>}
  </Modal>;
}
