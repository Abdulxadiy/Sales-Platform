import React from 'react';
import {
  Receipt,
  ArrowRightLeft,
  AlertTriangle,
  Bell,
  Check,
  Clock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { parseZReport, formatMarkdownLine } from './NotificationParser';
import InventraLogo from '../common/InventraLogo';
import { useNavigate } from 'react-router-dom';

export default function NotificationCard({ notification, onMarkRead, onDelete }) {
  const navigate = useNavigate();
  const n = notification;
  const parsedZ = parseZReport(n.message || n.text);

  const getNotifIcon = () => {
    if (parsedZ || n.type === 'daily_z_report') {
      return <Receipt size={16} color="var(--primary)" />;
    }
    if (n.type && n.type.includes('b2b')) {
      return <ArrowRightLeft size={16} color="var(--accent-cyan)" />;
    }
    if (n.type && n.type.includes('debt')) {
      return <AlertTriangle size={16} color="var(--accent-rose)" />;
    }
    return <Bell size={16} color="var(--primary)" />;
  };

  const handleLinkClick = () => {
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div
      className={`notif-card ${n.is_read ? 'read' : 'unread'}`}
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: n.is_read ? 'var(--bg-card)' : 'var(--bg-surface)',
        border: `1px solid ${
          n.is_read ? 'var(--border-subtle)' : 'var(--border-hover)'
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: n.is_read ? 'var(--bg-chip)' : 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getNotifIcon()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {n.title || (parsedZ ? 'Kunlik Z-Hisobot' : 'Tizim xabarnomasi')}
              </span>
              {!n.is_read && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'var(--primary)',
                    color: 'var(--text-on-primary)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Yangi
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 1,
              }}
            >
              <Clock size={11} />
              <span>
                {n.created_at
                  ? new Date(n.created_at).toLocaleString('uz-UZ', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {n.link && (
            <button
              onClick={handleLinkClick}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
              title="Sahifaga o‘tish"
            >
              <ExternalLink size={12} />
              <span>Ochish</span>
            </button>
          )}

          {!n.is_read && (
            <button
              onClick={() => onMarkRead(n.id)}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--primary)',
              }}
              title="O‘qildi deb belgilash"
            >
              <Check size={13} />
              <span>O‘qildi</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(n.id)}
              className="btn btn-secondary"
              style={{
                padding: '4px 8px',
                fontSize: 11,
                color: 'var(--accent-rose, #ef4444)',
              }}
              title="O‘chirish"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Body: Minimalist Fiscal Receipt vs General Text */}
      {parsedZ ? (
        <MinimalZReportReceipt parsed={parsedZ} notificationTitle={n.title} />
      ) : (
        <MinimalGeneralMarkdownView text={n.message || n.text} />
      )}
    </div>
  );
}

/**
 * Minimalist, authentic fiscal receipt layout matching the Shifts section receipt
 */
function MinimalZReportReceipt({ parsed, notificationTitle }) {
  const isZeroDiff = parsed.tafovut.isZero;

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-card)',
        border: '1px dashed var(--border-card)',
        fontSize: 13,
      }}
    >
      {/* Header with INVENTRA logo */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px dashed var(--border-subtle)',
          paddingBottom: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <InventraLogo size={26} showBadge={true} badgeText="POS" />
        </div>
        <h4
          style={{
            margin: '0 0 4px 0',
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: '0.03em',
            color: 'var(--text-primary)',
          }}
        >
          Z-HISOBOT (KASSA SMENASI)
        </h4>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {notificationTitle || 'Hisobot'} • Do‘kon:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{parsed.shop}</strong>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
          Yopilgan: {parsed.datetime} • Kassir:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{parsed.seller}</strong>
        </div>
      </div>

      {/* Receipt breakdown rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Naqd Savdo:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {parsed.sales.cashUzs}
            {parsed.sales.cashUsd && parsed.sales.cashUsd !== '$0.00' && ` / ${parsed.sales.cashUsd}`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Karta Savdo:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {parsed.sales.cardUzs}
            {parsed.sales.cardUsd && parsed.sales.cardUsd !== '$0.00' && ` / ${parsed.sales.cardUsd}`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Nasiya Savdo:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {parsed.sales.debtUzs}
            {parsed.sales.debtUsd && parsed.sales.debtUsd !== '$0.00' && ` / ${parsed.sales.debtUsd}`}
          </span>
        </div>

        {/* Extra Income */}
        {parsed.income && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--accent-emerald)' }}>Qo‘shimcha Kirim:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                +{parsed.income.totalUzs}
                {parsed.income.totalUsd && parsed.income.totalUsd !== '$0.00' && ` / +${parsed.income.totalUsd}`}
              </span>
            </div>
            {parsed.income.items.length > 0 && (
              <div
                style={{
                  paddingLeft: 10,
                  borderLeft: '2px solid var(--accent-emerald)',
                  marginTop: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {parsed.income.items.map((inc, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      • {inc.name}
                      {inc.note ? ` (${inc.note})` : ''}:
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {inc.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expenses */}
        {parsed.expense && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--accent-rose)' }}>Kassadan Chiqimlar:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>
                {parsed.expense.totalUzs}
                {parsed.expense.totalUsd && parsed.expense.totalUsd !== '$0.00' && ` / ${parsed.expense.totalUsd}`}
              </span>
            </div>
            {parsed.expense.items.length > 0 && (
              <div
                style={{
                  paddingLeft: 10,
                  borderLeft: '2px solid var(--accent-rose)',
                  marginTop: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {parsed.expense.items.map((exp, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      • {exp.name}
                      {exp.note ? ` (${exp.note})` : ''}:
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>
                      {exp.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Totals Section */}
        <div
          style={{
            borderTop: '1px dashed var(--border-subtle)',
            paddingTop: 9,
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Kutilgan Naqd Pul:
          </span>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {parsed.cash.expectedUzs}
            {parsed.cash.expectedUsd &&
              parsed.cash.expectedUsd !== '$0.00' &&
              ` / ${parsed.cash.expectedUsd}`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            Haqiqiy Sanalgan:
          </span>
          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
            {parsed.cash.actualUzs}
            {((parsed.cash.actualUsd && parsed.cash.actualUsd !== '$0.00') || (parsed.cash.expectedUsd && parsed.cash.expectedUsd !== '$0.00')) &&
              ` / ${parsed.cash.actualUsd || '$0.00'}`}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
            Tafovut (Farq):
          </span>
          <span
            style={{
              fontWeight: 800,
              color: isZeroDiff ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            }}
          >
            {parsed.tafovut.text}
          </span>
        </div>

        {/* Difference Reason */}
        {parsed.cash.diffReason && (
          <div
            style={{
              marginTop: 6,
              padding: '8px 10px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--accent-rose)',
              lineHeight: 1.4,
            }}
          >
            <strong>Farq sababi:</strong> {parsed.cash.diffReason}
          </div>
        )}

        {/* Staff Notes */}
        {parsed.staffNotes && (
          <div
            style={{
              marginTop: 4,
              padding: '6px 10px',
              background: 'var(--bg-chip)',
              borderRadius: 4,
              fontSize: 11.5,
              color: 'var(--text-muted)',
            }}
          >
            <strong>Xodim izohi:</strong> {parsed.staffNotes}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Universal minimal markdown renderer
 */
function MinimalGeneralMarkdownView({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--text-secondary)',
      }}
    >
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} style={{ height: 2 }} />;
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const contentStr = isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed;
        const tokens = formatMarkdownLine(contentStr);

        return (
          <div
            key={lIdx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: isBullet ? 6 : 0,
              paddingLeft: isBullet ? 4 : 0,
            }}
          >
            {isBullet && (
              <span
                style={{
                  color: 'var(--primary)',
                  fontWeight: 700,
                  marginTop: -1,
                }}
              >
                •
              </span>
            )}
            <div style={{ flex: 1 }}>
              {tokens.map((tok) => {
                if (tok.type === 'bold') {
                  return (
                    <strong
                      key={tok.key}
                      style={{ color: 'var(--text-primary)', fontWeight: 700 }}
                    >
                      {tok.content}
                    </strong>
                  );
                }
                if (tok.type === 'code') {
                  return (
                    <span
                      key={tok.key}
                      style={{
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'var(--bg-chip)',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: 'var(--primary)',
                      }}
                    >
                      {tok.content}
                    </span>
                  );
                }
                if (tok.type === 'italic') {
                  return (
                    <em key={tok.key} style={{ fontStyle: 'italic', opacity: 0.9 }}>
                      {tok.content}
                    </em>
                  );
                }
                return <span key={tok.key}>{tok.content}</span>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
