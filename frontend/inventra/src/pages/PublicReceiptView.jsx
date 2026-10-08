import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Printer,
  Download,
  CheckCircle,
  Share2,
  Calendar,
  User,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Store,
} from 'lucide-react';
import { salesApi } from '../api/client';
import { ReceiptBarcode } from '../components/common/ReceiptSlip';
import InventraLogo from '../components/common/InventraLogo';

export default function PublicReceiptView() {
  const { receiptNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!receiptNumber) {
      setError('Chek raqami ko‘rsatilmadi');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    salesApi
      .getPublicReceipt(receiptNumber)
      .then((data) => {
        setReceipt(data);
      })
      .catch((err) => {
        setError(err.message || 'Chek ma’lumotlarini yuklab bo‘lmadi yoki chek topilmadi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [receiptNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (val, cur = 'UZS') => {
    const num = Number(val || 0);
    if (cur === 'USD') {
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return Math.round(num).toLocaleString('uz-UZ') + ' UZS';
  };

  const formatQty = (qty, unit) => {
    const n = Number(qty || 0);
    const unitStr = unit || 'dona';
    return (Number.isInteger(n) ? n : n.toFixed(2)) + ' ' + unitStr;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, color: '#94a3b8' }}>Elektron chek yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', padding: 20 }}>
        <div style={{ maxWidth: 460, width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>Chek Topilmadi</h2>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 24 }}>
            {error || 'Kiritilgan raqam bo‘yicha tizimda elektron chek mavjud emas yoki muddati o‘tgan.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#ffffff', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCcw size={16} />
            <span>Qayta urinish</span>
          </button>
        </div>
      </div>
    );
  }

  const cur = receipt.currency || 'UZS';
  const items = receipt.items || [];
  const isDebt = receipt.payment_type === 'debt';
  const isVoided = receipt.status === 'voided';

  return (
    <div className="public-receipt-page" style={{ minHeight: '100vh', background: '#0f172a', padding: '24px 16px 48px', color: '#0f172a', fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" }}>
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .public-receipt-page {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .public-receipt-container {
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            max-width: 100% !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: auto;
            margin: 8mm;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top action bar (No-print) */}
      <div className="no-print" style={{ maxWidth: 520, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Rasmiy E-Chek Tizimi</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopyLink}
            title="Chek havolasini nusxalash"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Share2 size={15} />
            <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
          </button>

          <button
            onClick={handlePrint}
            title="PDF formatida saqlash yoki chop etish"
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Download size={15} />
            <span>PDF yuklab olish</span>
          </button>
        </div>
      </div>

      {/* Main Official Receipt Card */}
      <div
        className="public-receipt-container"
        style={{
          maxWidth: 520,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Card Header */}
        <div style={{ padding: '24px 28px 20px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', borderBottom: '1px dashed #e2e8f0', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <InventraLogo size={36} showBadge={false} textColor="#0f172a" />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px', color: '#0f172a' }}>
            {receipt.store_name || 'INVENTRA SAVDO MARKAZI'}
          </h1>
          {receipt.branch_name && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 2 }}>
              Filial: {receipt.branch_name}
            </div>
          )}
          {(receipt.branch_address || receipt.branch_phone) && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              {[receipt.branch_address, receipt.branch_phone && `Tel: ${receipt.branch_phone}`].filter(Boolean).join(' • ')}
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: '#f1f5f9', fontSize: 12, color: '#475569', fontWeight: 600 }}>
            <ShieldCheck size={14} color="#22c55e" />
            <span>Rasmiy Elektron Savdo Cheki (E-Chek)</span>
          </div>

          {/* Status Badge */}
          <div style={{ marginTop: 14 }}>
            {isVoided ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: 13, border: '1px solid #fecaca' }}>
                <AlertTriangle size={15} />
                <span>Bekor qilingan</span>
              </span>
            ) : isDebt ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#fffbeb', color: '#b45309', fontWeight: 700, fontSize: 13, border: '1px solid #fde68a' }}>
                <CreditCard size={15} />
                <span>Nasiya (Qarz) ga berilgan</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: 13, border: '1px solid #bbf7d0' }}>
                <CheckCircle size={15} />
                <span>To‘langan (Muvaffaqiyatli)</span>
              </span>
            )}
          </div>
        </div>

        {/* Receipt Meta Grid */}
        <div style={{ padding: '20px 28px', background: '#ffffff', borderBottom: '1px dashed #e2e8f0', fontSize: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 2 }}>Chek raqami</span>
              <strong style={{ fontFamily: 'monospace', fontSize: 14, color: '#0f172a' }}>#{receipt.receipt_number}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 2 }}>Sana va vaqt</span>
              <strong style={{ color: '#0f172a' }}>{formatDate(receipt.created_at)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 2 }}>Kassir</span>
              <strong style={{ color: '#0f172a' }}>{receipt.sold_by_name || 'Kassir'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 2 }}>To‘lov usuli</span>
              <strong style={{ color: '#0f172a' }}>{receipt.payment_type_display || receipt.payment_type}</strong>
            </div>
            {receipt.counterparty_name && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 2 }}>Mijoz / Qarz oluvchi</span>
                <strong style={{ color: '#0f172a', fontSize: 14 }}>{receipt.counterparty_name}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Breakdown */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '2px solid #0f172a', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
            <span>TOVAR NOMI</span>
            <span style={{ textAlign: 'right' }}>SUMMASI</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {items.map((it, idx) => {
              const name = it.product_name || `Tovar #${idx + 1}`;
              const variantName =
                it.product_variant_name && it.product_variant_name.toLowerCase() !== 'standart'
                  ? ` (${it.product_variant_name})`
                  : '';
              const qty = Number(it.quantity || 1);
              const unitPrice = Number(it.unit_price || 0);
              const lineTotal = Number(it.total_price || (unitPrice * qty) || 0);

              return (
                <div key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 3 }}>
                    {idx + 1}. {name}{variantName}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                    <span>
                      {formatQty(qty, it.unit)} × {formatMoney(unitPrice, cur)}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: 13 }}>
                      {formatMoney(lineTotal, cur)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '2px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
              JAMI TO‘LOV:
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
              {formatMoney(receipt.total_amount, cur)}
            </span>
          </div>
        </div>

        {/* Digital Verification & Barcode */}
        <div style={{ padding: '20px 28px', background: '#f8fafc', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
          <ReceiptBarcode value={receipt.receipt_number} />

          <div style={{ marginTop: 14, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>XARIDINGIZ UCHUN TASHAKKUR!</div>
            <div>Ushbu elektron chek Inventra platformasida rasmiy ro‘yxatga olingan.</div>
            <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 10 }}>ID: {receipt.receipt_number} • www.inventra.uz</div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile (No-print) */}
      <div className="no-print" style={{ maxWidth: 520, margin: '20px auto 0', textAlign: 'center' }}>
        <button
          onClick={handlePrint}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            border: 'none',
            background: '#3b82f6',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
          }}
        >
          <Printer size={18} />
          <span>Chekni PDF Saqlash / Chop etish</span>
        </button>
      </div>
    </div>
  );
}
