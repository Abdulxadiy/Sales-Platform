import React from 'react';

/**
 * Inventra Concept 2 — Precision Shelving & "I" Monogram Logo
 * Rich Amber Gold & Warm Obsidian Edition
 */
export default function InventraLogo({
  size = 36,
  showText = true,
  variant = 'horizontal', // 'horizontal' | 'vertical' | 'icon-only'
  showBadge = true,
  badgeText = 'PRO',
  className = '',
  style = {},
  iconOnly = false,
  textColor = 'var(--text-primary)',
}) {
  const isIconOnly = iconOnly || variant === 'icon-only' || !showText;
  const isVertical = variant === 'vertical';

  // Proportional sizing based on 140:186 aspect ratio
  const iconHeight = typeof size === 'number' ? size : 36;
  const iconWidth = Math.round(iconHeight * (140 / 186));

  return (
    <div
      className={`inventra-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexDirection: isVertical ? 'column' : 'row',
        gap: isVertical ? 10 : 12,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Precision Shelving & Monogram SVG Icon */}
      <svg
        width={iconWidth}
        height={iconHeight}
        viewBox="0 0 140 186"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          overflow: 'visible',
          filter: 'drop-shadow(0 2px 10px rgba(245, 158, 11, 0.28))',
          transition: 'transform 0.2s ease, filter 0.2s ease',
        }}
        className="inventra-logo-svg"
      >
        <defs>
          <linearGradient id="invAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="invAmberFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B45309" stopOpacity="0.08" />
          </linearGradient>

          <linearGradient id="invIGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="35%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        {/* TOP TIER MODULE */}
        <g className="tier-top">
          <polygon
            points="70,16 122,44 70,72 18,44"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
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
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
          <polygon
            points="122,44 122,55 70,83 70,72"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
        </g>

        {/* MIDDLE TIER MODULE */}
        <g className="tier-mid">
          <polygon
            points="70,62 122,90 70,118 18,90"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
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
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
          <polygon
            points="122,90 122,101 70,129 70,118"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
        </g>

        {/* BOTTOM TIER MODULE */}
        <g className="tier-bot">
          <polygon
            points="70,108 122,136 70,164 18,136"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
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
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
          <polygon
            points="122,136 122,147 70,175 70,164"
            fill="url(#invAmberFill)"
            stroke="url(#invAmberGrad)"
            strokeWidth="2.8"
          />
        </g>

        {/* DIAGONAL "I" MONOGRAM PILLAR */}
        <g className="monogram-i">
          <polygon
            points="78,22 93,22 66,158 51,158"
            fill="url(#invIGrad)"
            stroke="#F59E0B"
            strokeWidth="1.2"
            style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }}
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

      {/* Styled Brand Wordmark */}
      {!isIconOnly && (
        <div
          className="brand-text"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            textAlign: isVertical ? 'center' : 'left',
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', 'Outfit', sans-serif",
              fontSize: Math.round(iconHeight * 0.58),
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: textColor,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            INVENTRA
          </span>
          {showBadge && (
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: Math.max(10, Math.round(iconHeight * 0.28)),
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '2px 6px',
                borderRadius: 5,
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                lineHeight: 1.2,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
