import React, { useId } from 'react';
import { glyphs, paths } from './ilbi/logo';

/** Static identity shared with the ILBI opening, without product badges. */
export default function IlbiLogo({
  size = 36,
  showText = true,
  variant = 'horizontal',
  className = '',
  style = {},
  iconOnly = false,
  textColor = 'var(--text-primary, #141820)',
  monochrome = false,
}) {
  const id = `ilbi-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const onlyIcon = iconOnly || variant === 'icon-only' || !showText;
  const vertical = variant === 'vertical';
  const height = typeof size === 'number' ? size : 36;
  const mono = monochrome || ['#000', '#000000', 'black'].includes(textColor);
  const wordHeight = Math.max(14, Math.round(height * (vertical ? 0.48 : 0.55)));
  const blue = mono ? 'currentColor' : `url(#${id}-blue)`;

  return (
    <span
      className={`ilbi-logo ${className}`}
      role="img" aria-label="ilbi.uz"
      style={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        flexDirection: vertical ? 'column' : 'row', gap: vertical ? 10 : 9,
        color: textColor, verticalAlign: 'middle', ...style,
      }}
    >
      {variant !== 'wordmark' && (
        <svg width={height} height={height} viewBox="0 0 280 280" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${id}-blue`} x1="90" y1="5" x2="165" y2="266" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0095ff" /><stop offset=".43" stopColor="#006bff" /><stop offset="1" stopColor="#0049ff" />
            </linearGradient>
            <clipPath id={`${id}-ribbon`}><path d={paths.ribbon} /></clipPath>
          </defs>
          <path d={paths.dot} fill="currentColor" />
          <path d={paths.stem} fill="currentColor" />
          <path d={paths.bowl} fill="currentColor" />
          <path d={paths.ribbon} fill={blue} />
          {!mono && <path d={paths.ribbonFace} fill="#006bff" clipPath={`url(#${id}-ribbon)`} />}
          <path d={paths.ribbonTurn} fill={mono ? 'currentColor' : '#0055ff'} />
        </svg>
      )}
      {!onlyIcon && (
        <svg width={Math.round(wordHeight * 272 / 75)} height={wordHeight} viewBox="0 0 272 75" aria-hidden="true" focusable="false">
          {glyphs.map(glyph => (
            <path
              key={glyph.name} d={glyph.d} transform={`translate(${glyph.x} 0)`}
              fillRule="evenodd" fill={glyph.blue && !mono ? '#006bff' : 'currentColor'}
            />
          ))}
        </svg>
      )}
    </span>
  );
}
