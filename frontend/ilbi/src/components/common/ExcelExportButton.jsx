import IlbiLoader from './IlbiLoader';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { request } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { downloadFile } from '../../utils/downloadFile';
import { useAuth } from '../../hooks/useAuth';

export default function ExcelExportButton({
  endpoint, ids, params, filename, disabled = false,
  label = 'Excelga yuklash', title = 'Joriy filtrlarga mos barcha qatorlarni Excelga yuklash',
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { isOwner } = useAuth();
  const download = async () => {
    if (!isOwner || busy) return;
    setBusy(true);
    try {
      const query = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, value);
      });
      const blob = await request(`${endpoint}${query.size ? `?${query}` : ''}`, {
        method: ids ? 'POST' : 'GET', body: ids ? { ids } : undefined, responseType: 'blob',
      });
      downloadFile(blob, filename);
    } catch (error) { toast.error(error.message || 'Excel faylni yuklab bo‘lmadi.'); }
    finally { setBusy(false); }
  };
  if (!isOwner) return null;
  return <button type="button" className="btn btn-secondary" disabled={disabled || busy} onClick={download}
    aria-busy={busy} title={title}>
    {busy ? <IlbiLoader size={24} inline decorative /> : <Download size={16} />} {busy ? 'Yuklanmoqda…' : label}
  </button>;
}
