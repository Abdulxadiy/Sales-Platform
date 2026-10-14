import React from 'react';
import InventraLogo from './InventraLogo';

export default function AppLoadingScreen({ message = 'Xavfsiz sessiya tekshirilmoqda...' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main, #0d1117)',
        color: 'var(--text-primary, #f3f4f6)',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
          animation: 'pulseGlow 3s ease-in-out infinite alternate',
        }}
      />

      {/* Center Card */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: '32px 28px',
          borderRadius: 20,
          background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo with pulsing ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: 68,
              height: 68,
              borderRadius: '50%',
              border: '2px solid rgba(245, 158, 11, 0.25)',
              borderTopColor: 'var(--primary, #f59e0b)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ padding: 12 }}>
            <InventraLogo size={34} iconOnly={true} showBadge={false} />
          </div>
        </div>

        {/* Brand and Loading Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
              INVENTRA
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                letterSpacing: '0.08em',
              }}
            >
              PRO
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary, #9ca3af)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--primary, #f59e0b)',
                boxShadow: '0 0 8px var(--primary, #f59e0b)',
                animation: 'pulseDot 1.4s infinite ease-in-out',
              }}
            />
            <span>{message}</span>
          </div>
        </div>

        {/* Subtle Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 3,
            borderRadius: 999,
            background: 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
            overflow: 'hidden',
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: '45%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--primary, #f59e0b), var(--accent-emerald, #10b981), transparent)',
              borderRadius: 999,
              animation: 'indeterminateProgress 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes indeterminateProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 0.9; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
