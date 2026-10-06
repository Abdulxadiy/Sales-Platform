import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Receipt,
  ArrowRightLeft,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { parseZReport } from './NotificationParser';

export default function FloatingNotificationToast({
  notification,
  onDismiss,
  onOpenDetails,
  duration = 5000,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const timerRef = useRef(null);

  const n = notification;
  const parsedZ = parseZReport(n.message || n.text);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    // Schedule exit animation 400ms before total duration
    const exitDelay = Math.max(0, remainingTimeRef.current - 400);

    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      timerRef.current = setTimeout(() => {
        onDismiss(n.id);
      }, 400);
    }, exitDelay);
  };

  const clearCurrentTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return () => clearCurrentTimer();
  }, []);

  const handleMouseEnter = () => {
    setIsPaused(true);
    clearCurrentTimer();
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimer();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => onDismiss(n.id), 300);
  };

  const handleClick = () => {
    if (onOpenDetails) {
      onOpenDetails(n);
    }
  };

  const getIcon = () => {
    if (parsedZ || n.type === 'daily_z_report') {
      return <Receipt size={18} color="var(--primary)" />;
    }
    if (n.type && n.type.includes('b2b')) {
      return <ArrowRightLeft size={18} color="var(--accent-cyan)" />;
    }
    if (n.type && n.type.includes('debt')) {
      return <AlertTriangle size={18} color="var(--accent-rose)" />;
    }
    return <Bell size={18} color="var(--primary)" />;
  };

  return (
    <div
      className={`notif-floating-toast ${isExiting ? 'exit' : 'enter'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="alert"
      style={{
        width: 390,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-hover)',
        borderRadius: 18,
        boxShadow:
          '0 20px 45px -10px rgba(0, 0, 0, 0.45), 0 0 20px rgba(245, 158, 11, 0.15)',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        pointerEvents: 'auto',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Content wrapper */}
      <div style={{ padding: '16px 18px' }}>
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getIcon()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--accent-emerald)',
                      display: 'inline-block',
                    }}
                  />
                  Yangi bildirishnoma
                </span>
              </div>
              <h4
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '2px 0 0',
                  lineHeight: 1.3,
                }}
              >
                {n.title || (parsedZ ? 'Kunlik Z-Hisobot' : 'Tizim xabarnomasi')}
              </h4>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            title="Yopish"
            aria-label="Yopish"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body preview */}
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {parsedZ ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>🏢 {parsedZ.shop}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {parsedZ.cash.actualUzs}
                </strong>
                <span
                  style={{
                    fontSize: 11,
                    color: parsedZ.tafovut.isZero
                      ? 'var(--accent-emerald)'
                      : 'var(--accent-rose)',
                    fontWeight: 600,
                  }}
                >
                  ({parsedZ.tafovut.isZero ? "Kassa to‘liq" : parsedZ.tafovut.text})
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                }}
              >
                <span>Savdo: {parsedZ.sales.cashUzs}</span>
                <span>•</span>
                <span>Chiqim: {parsedZ.expense.totalUzs}</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {(n.message || n.text || '').replace(/[*_`#]/g, '')}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Hozir keldi
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            <span>Batafsil ko‘rish</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* 5-second Countdown Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background: 'linear-gradient(90deg, var(--primary), var(--accent-emerald))',
          width: '100%',
          animation: `notifCountdownBar ${duration}ms linear forwards`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      />
    </div>
  );
}
