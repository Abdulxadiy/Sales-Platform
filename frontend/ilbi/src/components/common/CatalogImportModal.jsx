import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import Modal from './Modal';
import Pagination from './Pagination';
import { catalogApi } from '../../api/client';
import { downloadFile } from '../../utils/downloadFile';
import { useToast } from '../../context/ToastContext';

const FIELD_NAMES = {
  name: 'Mahsulot',
  category: 'Kategoriya',
  variant_name: 'Variant',
  barcode: 'Shtrix-kod',
  price_recommended: 'Sotuv narxi',
  price_min: 'Minimal narx',
  price_partner: 'Hamkor narxi',
  quantity: 'Miqdor',
  cost_price: 'Tannarx',
  currency: 'Valyuta',
  unit: 'Birlik',
  expires_on: 'Yaroqlilik sanasi',
  batch_code: 'Partiya',
};

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function CatalogImportModal({ onClose, onSuccess }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  const errors = job?.rows.filter((row) => Object.keys(row.errors).length) || [];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (
        droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.csv')
      ) {
        setFile(droppedFile);
        setJob(null);
      } else {
        toast.error('Faqat .xlsx yoki .csv formatdagi fayllar qabul qilinadi.');
      }
    }
  };

  const preview = async () => {
    if (!file || busy) return;
    setBusy(true);
    setJob(null);
    setPage(1);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await catalogApi.previewImport(body);
      setJob(res);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!job || errors.length || busy) return;
    setBusy(true);
    try {
      const result = await catalogApi.commitImport(job.id);
      toast.success(`${result.created_count} ta mahsulot muvaffaqiyatli yuklandi.`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const template = async () => {
    try {
      downloadFile(await catalogApi.getImportTemplate(), 'ilbi-import-shablon.xlsx');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Excel / CSV fayldan mahsulot yuklash"
      maxWidth={980}
    >
      <div className="import-modal-container">
        {/* Instruction and Steps Card */}
        <div className="import-guide-card">
          <div className="import-steps-row">
            <div className="import-step-item">
              <span className="import-step-num">1</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2 }}>
                  Shablonni to‘ldiring
                </strong>
                <span>Tayyor namunaviy Excel faylini yuklab oling va tovarlaringizni kiriting.</span>
              </div>
            </div>

            <div className="import-step-item">
              <span className="import-step-num">2</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2 }}>
                  Faylni yuklang
                </strong>
                <span>To‘ldirilgan faylni maydonga tashlang va tekshirish tugmasini bosing.</span>
              </div>
            </div>

            <div className="import-step-item">
              <span className="import-step-num">3</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2 }}>
                  Tasdiqlash & Saqlash
                </strong>
                <span>Xatolar yo‘qligiga ishonch hosil qiling va bazaga saqlang.</span>
              </div>
            </div>
          </div>

          <div className="import-tags-row">
            <span className="import-tag-badge">
              <FileSpreadsheet size={13} color="var(--primary)" /> Format: .xlsx / .csv (UTF-8)
            </span>
            <span className="import-tag-badge">
              <AlertCircle size={13} color="var(--accent-amber)" /> Majburiy: mahsulot, kategoriya, sotuv_narxi
            </span>
            <span className="import-tag-badge">
              <Sparkles size={13} color="var(--accent-emerald)" /> Maksimal: 1 000 qator, 8 MB
            </span>
          </div>
        </div>

        {/* Upload Zone / Dropzone */}
        <input
          ref={fileInputRef}
          aria-label="Import fayli"
          type="file"
          accept=".xlsx,.csv"
          style={{ display: 'none' }}
          disabled={busy}
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setJob(null);
          }}
        />

        {!file ? (
          <div
            className={`import-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="import-dropzone-icon">
              <UploadCloud size={28} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                Excel yoki CSV faylni bu yerga tashlang
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                yoki kompyuterdan tanlash uchun bosing (.xlsx, .csv)
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--accent-emerald)',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileSpreadsheet size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--accent-emerald)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Tayyor
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Hajmi: {formatFileSize(file.size)}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setJob(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                flexShrink: 0,
              }}
              title="Faylni bekor qilish"
            >
              <X size={14} />
              <span>O‘chirish</span>
            </button>
          </div>
        )}

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={template}
            disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '9px 15px' }}
          >
            <Download size={15} />
            <span>Excel Shablonini Yuklab Olish</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={preview}
            disabled={!file || busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '9px 18px', fontWeight: 700 }}
          >
            {busy ? (
              <span>Kutilmoqda…</span>
            ) : (
              <>
                <Search size={15} />
                <span>Qatorlarni Tekshirish</span>
              </>
            )}
          </button>
        </div>

        {/* Job Review Table & Commit */}
        {job && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            <div className="import-summary-bar">
              <div className="import-metrics">
                <span className="import-metric-chip total">
                  <FileCheck size={14} />
                  <span>Jami: {job.rows.length} qator</span>
                </span>
                <span className="import-metric-chip success">
                  <CheckCircle2 size={14} />
                  <span>{job.rows.length - errors.length} ta xatosiz</span>
                </span>
                {errors.length > 0 && (
                  <span className="import-metric-chip error">
                    <AlertCircle size={14} />
                    <span>{errors.length} ta xato</span>
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12.5, fontWeight: 600, color: errors.length ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {errors.length
                  ? 'Fayldagi xatoliklarni to‘g‘rilab, qayta yuklang.'
                  : 'Barcha qatorlar to‘g‘ri. Saqlashga tayyor!'}
              </div>
            </div>

            <div
              style={{
                overflowX: 'auto',
                maxHeight: 380,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
              }}
            >
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['#', 'Mahsulot / Variant', 'Kategoriya', 'Narx', 'Miqdor', 'Holat'].map((label) => (
                      <th key={label} style={{ whiteSpace: 'nowrap' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {job.rows.slice((page - 1) * 50, page * 50).map((row) => {
                    const rowErrors = Object.entries(row.errors);
                    const hasError = rowErrors.length > 0;
                    return (
                      <tr
                        key={row.row_number}
                        style={{
                          background: hasError ? 'rgba(244, 63, 94, 0.05)' : undefined,
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{row.row_number}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {row.data.name} / {row.data.variant_name || 'Standart'}
                          </div>
                          {row.data.barcode && (
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
                              {row.data.barcode}
                            </div>
                          )}
                          <details style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                            <summary style={{ cursor: 'pointer', outline: 'none' }}>Barcha maydonlar</summary>
                            <div
                              style={{
                                marginTop: 6,
                                padding: 8,
                                borderRadius: 6,
                                background: 'var(--bg-input)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 4,
                              }}
                            >
                              {Object.entries(row.data).map(([field, value]) => (
                                <div key={field}>
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    {FIELD_NAMES[field] || field}:
                                  </span>{' '}
                                  <strong style={{ color: 'var(--text-primary)' }}>{String(value)}</strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11.5,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'var(--bg-chip)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {row.data.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {Number(row.data.price_recommended).toLocaleString()} {row.data.currency || 'UZS'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {row.data.quantity || 0} {row.data.unit || 'dona'}
                        </td>
                        <td>
                          {hasError ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {rowErrors.map(([field, message]) => (
                                <span
                                  key={field}
                                  style={{
                                    fontSize: 11.5,
                                    color: 'var(--accent-rose)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <AlertCircle size={12} />
                                  <strong>{FIELD_NAMES[field] || field}:</strong> {message}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: 'var(--accent-emerald)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Tayyor
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {job.rows.length > 50 && (
              <Pagination
                currentPage={page}
                totalItems={job.rows.length}
                pageSize={50}
                onPageChange={setPage}
              />
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              disabled={busy || errors.length > 0}
              onClick={commit}
            >
              <Check size={18} />
              <span>
                {errors.length > 0
                  ? `Xatoliklar mavjud (${errors.length} ta) — saqlab bo‘lmaydi`
                  : `Tasdiqlash va Bazaga Saqlash (${job.rows.length} ta tovar)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
