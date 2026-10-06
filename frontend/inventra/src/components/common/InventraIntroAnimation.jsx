import React, { useState, useEffect } from 'react';

/**
 * Inventra Intro Animation
 * - Stage 1: Single unified large block in the center (no text)
 * - Stage 2: Shrinks and smoothly splits into 3 stacked modular tiers + diagonal "I" beam lights up
 * - Stage 3: Shifts left and futuristic "INVENTRA" typography emerges on the right
 * - Stage 4: Completes and smoothly unveils the login view
 */
export default function InventraIntroAnimation({ onComplete, isDark = true }) {
  // animationStage: 'unified' -> 'splitting' -> 'revealing-text' -> 'fading-out' -> 'done'
  const [stage, setStage] = useState('unified');

  useEffect(() => {
    // 1. Initial pause on unified block
    const timer1 = setTimeout(() => {
      setStage('splitting');
    }, 700);

    // 2. Reveal wordmark
    const timer2 = setTimeout(() => {
      setStage('revealing-text');
    }, 1800);

    // 3. Fade out overlay
    const timer3 = setTimeout(() => {
      setStage('fading-out');
    }, 3300);

    // 4. Complete
    const timer4 = setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
    }, 3900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  const isSplittingOrLater = stage === 'splitting' || stage === 'revealing-text' || stage === 'fading-out';
  const isRevealingTextOrLater = stage === 'revealing-text' || stage === 'fading-out';
  const isFadingOut = stage === 'fading-out';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: isDark
          ? 'radial-gradient(circle at center, #171410 0%, #0C0A09 70%, #060504 100%)'
          : 'radial-gradient(circle at center, #FFFFFF 0%, #F5F4F0 70%, #EAE8E2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Ambient Pulsing Warm Amber Glow */}
      <div
        style={{
          position: 'absolute',
          width: isSplittingOrLater ? 560 : 420,
          height: isSplittingOrLater ? 560 : 420,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.01) 50%, transparent 70%)',
          filter: 'blur(80px)',
          transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
        }}
      />

      {/* Center Stage Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Modular SVG Icon */}
        <div
          style={{
            transform: isSplittingOrLater ? 'scale(1)' : 'scale(1.5)',
            transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.45))',
          }}
        >
          <svg
            width={isSplittingOrLater ? 140 : 160}
            height={isSplittingOrLater ? 186 : 212}
            viewBox="0 0 140 186"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              overflow: 'visible',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <defs>
              <linearGradient id="introAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="45%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              <linearGradient id="introAmberFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#B45309" stopOpacity="0.1" />
              </linearGradient>

              <linearGradient id="introIGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>

            {/* TOP TIER MODULE */}
            <g
              style={{
                transform: isSplittingOrLater ? 'translateY(0px)' : 'translateY(46px)',
                transition: 'transform 0.95s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <polygon
                points="70,16 122,44 70,72 18,44"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <polygon
                points="70,26 108,46 70,66 32,46"
                fill="#F59E0B"
                fillOpacity="0.12"
                stroke="#FBBF24"
                strokeWidth="1.6"
              />
              <polygon
                points="18,44 18,55 70,83 70,72"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
              <polygon
                points="122,44 122,55 70,83 70,72"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
            </g>

            {/* MIDDLE TIER MODULE */}
            <g
              style={{
                transform: 'translateY(0px)',
                transition: 'transform 0.95s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <polygon
                points="70,62 122,90 70,118 18,90"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <polygon
                points="70,72 108,92 70,112 32,92"
                fill="#F59E0B"
                fillOpacity="0.12"
                stroke="#FBBF24"
                strokeWidth="1.6"
              />
              <polygon
                points="18,90 18,101 70,129 70,118"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
              <polygon
                points="122,90 122,101 70,129 70,118"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
            </g>

            {/* BOTTOM TIER MODULE */}
            <g
              style={{
                transform: isSplittingOrLater ? 'translateY(0px)' : 'translateY(-46px)',
                transition: 'transform 0.95s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <polygon
                points="70,108 122,136 70,164 18,136"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <polygon
                points="70,118 108,138 70,158 32,138"
                fill="#F59E0B"
                fillOpacity="0.12"
                stroke="#FBBF24"
                strokeWidth="1.6"
              />
              <polygon
                points="18,136 18,147 70,175 70,164"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
              <polygon
                points="122,136 122,147 70,175 70,164"
                fill="url(#introAmberFill)"
                stroke="url(#introAmberGrad)"
                strokeWidth="2.8"
              />
            </g>

            {/* DIAGONAL "I" MONOGRAM PILLAR */}
            <g
              style={{
                opacity: isSplittingOrLater ? 1 : 0,
                transition: 'opacity 0.6s ease 0.4s',
              }}
            >
              <polygon
                points="78,22 93,22 66,158 51,158"
                fill="url(#introIGrad)"
                stroke="#F59E0B"
                strokeWidth="1.2"
                style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' }}
              />
              <line
                x1="85"
                y1="26"
                x2="58"
                y2="154"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Emerging Futuristic Wordmark on the Right */}
        <div
          style={{
            opacity: isRevealingTextOrLater ? 1 : 0,
            transform: isRevealingTextOrLater ? 'translateX(0px)' : 'translateX(35px)',
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            paddingLeft: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontFamily: "'Space Grotesk', 'Outfit', sans-serif",
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: '0.18em',
                margin: 0,
                color: isDark ? '#FAF6F0' : '#0B0909',
                textShadow: isDark ? '0 0 20px rgba(245, 158, 11, 0.35)' : 'none',
              }}
            >
              INVENTRA
            </h1>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '4px 10px',
                borderRadius: 6,
                background: '#F59E0B',
                color: '#0C0A09',
                boxShadow: isDark ? '0 0 16px rgba(245, 158, 11, 0.5)' : '0 2px 10px rgba(245, 158, 11, 0.35)',
              }}
            >
              PRO
            </span>
          </div>

          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: isDark ? '#B5AD9F' : '#57534E',
              margin: '6px 0 0 2px',
              fontWeight: 600,
            }}
          >
            Savdo & POS Platformasi
          </p>
        </div>
      </div>

      {/* Skip Button (Bottom Right) */}
      <button
        onClick={() => {
          setStage('done');
          if (onComplete) onComplete();
        }}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          padding: '8px 16px',
          borderRadius: 12,
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          border: isDark ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(11, 9, 9, 0.14)',
          color: isDark ? '#B5AD9F' : '#44403C',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
          zIndex: 20,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = isDark ? '#FAF6F0' : '#0B0909';
          e.currentTarget.style.borderColor = '#F59E0B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = isDark ? '#B5AD9F' : '#44403C';
          e.currentTarget.style.borderColor = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(11, 9, 9, 0.14)';
        }}
      >
        O‘tkazib yuborish ➔
      </button>
    </div>
  );
}
