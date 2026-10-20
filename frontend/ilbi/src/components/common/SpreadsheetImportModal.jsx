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
import { downloadFile } from '../../utils/downloadFile';
import { useToast } from '../../context/ToastContext';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SpreadsheetImportModal({ onClose, onSuccess, api, title, templateFilename,
  fieldNames, columns, entityLabel, requiredFields, prepareHint, note, canDownloadTemplate = true }) {
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

  const selectFile = (selected) => {
    if (busy) return;
    setJob(null);
    setPage(1);
    if (selected && (!/\.(xlsx|csv)$/i.test(selected.name) || selected.size > 8 * 1024 * 1024)) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.error('8 MB gacha bo‘lgan .xlsx yoki .csv faylni tanlang.');
      return;
    }
    setFile(selected || null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const preview = async () => {
    if (!file || busy) return;
    setBusy(true);
    setJob(null);
    setPage(1);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.previewImport(body);
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
      const result = await api.commitImport(job.id);
      toast.success(`${result.created_count} ta ${entityLabel} muvaffaqiyatli yuklandi.`);
      onSuccess();
      onClose();
    } catch (error) {
      if (Array.isArray(error.data?.rows)) setJob({ ...job, rows: error.data.rows });
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const template = async () => {
    if (!canDownloadTemplate) return;
    try {
      downloadFile(await api.getImportTemplate(), templateFilename);
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
      title={title}
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
                  {canDownloadTemplate ? 'Shablonni to‘ldiring' : 'Faylni tayyorlang'}
                </strong>
                <span>{canDownloadTemplate
                  ? prepareHint
                  : 'Ma’lumotlarni Excel yoki CSV fayliga kiriting.'}</span>
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
              <AlertCircle size={13} color="var(--accent-amber)" /> Majburiy: {requiredFields}
            </span>
            <span className="import-tag-badge">
              <Sparkles size={13} color="var(--accent-emerald)" /> Maksimal: 1 000 qator, 8 MB
            </span>
          </div>
        </div>

        {note && <p className="import-info-note">{note}</p>}

        {/* Upload Zone / Dropzone */}
        <input
          ref={fileInputRef}
          aria-label="Import fayli"
          type="file"
          accept=".xlsx,.csv"
          style={{ display: 'none' }}
          disabled={busy}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
          }}
        />

        {!file ? (
          <div
            className={`import-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            aria-label="Import faylini tanlash"
            aria-disabled={busy}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!busy) fileInputRef.current?.click();
              }
            }}
            onClick={() => { if (!busy) fileInputRef.current?.click(); }}
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
                  background: 'rgba(var(--success-rgb), 0.15)',
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
                      background: 'rgba(var(--success-rgb), 0.12)',
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
          {canDownloadTemplate && <button
            type="button"
            className="btn btn-secondary"
            onClick={template}
            disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '9px 15px' }}
          >
            <Download size={15} />
            <span>Excel Shablonini Yuklab Olish</span>
          </button>}

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
                    {['#', ...columns.map((column) => column.label), 'Holat'].map((label) => (
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
                          background: hasError ? 'rgba(var(--danger-rgb), 0.05)' : undefined,
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{row.row_number}</td>
                        {columns.map((column, index) => (
                          <td key={column.label}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{column.render(row.data)}</div>
                            {index === 0 && <details style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                              <summary style={{ cursor: 'pointer' }}>Barcha maydonlar</summary>
                              <div className="import-row-details">
                                {Object.entries(row.data).map(([field, value]) => (
                                  <div key={field}>{fieldNames[field] || field}: <strong>{String(value)}</strong></div>
                                ))}
                              </div>
                            </details>}
                          </td>
                        ))}
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
                                  <strong>{fieldNames[field] || field}:</strong> {message}
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
                  : `Tasdiqlash va Bazaga Saqlash (${job.rows.length} ta ${entityLabel})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
