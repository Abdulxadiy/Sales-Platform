import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Eye } from 'lucide-react';
import { auditApi } from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export default function Audit() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewLog, setViewLog] = useState(null);

  const loadLogs = useCallback(async (action = '') => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs({ action: action || undefined });
      const list = res.results || res;
      setLogs(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Audit jurnali yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(selectedAction);
  }, [selectedAction, loadLogs]);


  const actionLabels = {
    PRICE_CHANGE: 'Narx O‘zgarishi',
    EMPLOYEE_HIRE: 'Xodim Qabul Qilindi',
    EMPLOYEE_FIRE: 'Xodim Bo‘shatildi',
    OWNER_TRANSFER: 'Egalik O‘tkazildi',
    VOID_SALE: 'Chek Bekor Qilindi',
    STOCK_ADJUSTMENT: 'Ombor Tuzatildi',
    CASH_DISCREPANCY: 'Kassa Tafovuti',
    PASSWORD_RESET: 'Parol Yangilandi',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <ShieldCheck size={26} color="var(--primary)" />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            O‘zgarmas (Append-Only) Audit Tizimi
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Ushbu jurnaldagi barcha yozuvlar qat’iy himoyalangan bo‘lib, ularni o‘chirib yoki tahrirlab bo‘lmaydi.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setSelectedAction('')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: selectedAction === '' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            background: selectedAction === '' ? 'var(--primary)' : 'var(--bg-card)',
            color: selectedAction === '' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Barcha Amallar
        </button>
        {Object.entries(actionLabels).map(([key, label]) => {
          const active = selectedAction === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedAction(key)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: active ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: active ? 'var(--primary)' : 'var(--bg-card)',
                color: active ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Amal</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Bajargan Shaxs</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Tafsilot / Tavsif</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>IP Manzil</th>
                <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Sana & Vaqt</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>O‘zgarish</th>
              </tr>
            </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '4px 9px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                      }}
                    >
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.actor_name || log.actor?.username || `Foydalanuvchi #${log.actor || 'Tizim'}`}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                    {log.description || `${log.target_model || ''} #${log.target_id || ''}`}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(log.created_at).toLocaleString('uz-UZ')}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {log.changes && Object.keys(log.changes).length > 0 ? (
                      <button
                        onClick={() => setViewLog(log)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-card)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Eye size={13} />
                        <span>Diff ko‘rish</span>
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Audit yozuvlari mavjud emas</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Changes Diff Modal */}
      <Modal isOpen={Boolean(viewLog)} onClose={() => setViewLog(null)} title="Amal O‘zgarishlari Tafsiloti">
        {viewLog && (
          <div>
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>Amal:</strong> {actionLabels[viewLog.action] || viewLog.action} | <strong>Bajargan:</strong> {viewLog.actor_name || 'Foydalanuvchi'}
            </div>
            <pre
              style={{
                background: 'var(--bg-card)',
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--primary)',
                fontSize: 13,
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: 300,
              }}
            >
              {JSON.stringify(viewLog.changes, null, 2)}
            </pre>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button
                onClick={() => setViewLog(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yopish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
