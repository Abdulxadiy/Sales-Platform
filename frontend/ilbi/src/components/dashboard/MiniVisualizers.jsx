import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Fritsch-Carlson Monotonic Cubic Spline for mini sparkline.
 */
function getMonotoneMiniSpline(points) {
  const n = points.length;
  if (!points || n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (n === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const deltas = [];
  const dxs = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  const m = new Array(n);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / deltas[i];
      const beta = m[i + 1] / deltas[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        m[i] = tau * alpha * deltas[i];
        m[i + 1] = tau * beta * deltas[i];
      }
    }
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = dxs[i];
    const cp1x = points[i].x + dx / 3;
    const cp1y = points[i].y + (m[i] * dx) / 3;
    const cp2x = points[i + 1].x - dx / 3;
    const cp2y = points[i + 1].y - (m[i + 1] * dx) / 3;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }

  return d;
}

/**
 * MiniEqualizer: Refined theme-adaptive equalizer bars.
 */
export function MiniEqualizer({
  data = [],
  activeColor = '#10b981',
  highlightColor = '#fbbf24',
  barCount = 28,
  title = 'Sotuvlar Faolligi',
  value = '95.4%',
}) {
  const bars = useMemo(() => {
    if (data && data.length > 0) {
      const maxVal = Math.max(1, ...data.map((d) => d.count || d.sales_count || d.val || 1));
      return Array.from({ length: barCount }, (_, i) => {
        const item = data[i % data.length];
        const val = item ? (item.count || item.sales_count || item.val || 1) : 1;
        const normalized = Math.min(100, Math.max(15, Math.round((val / maxVal) * 100)));
        const isHighlight = i === Math.floor(barCount * 0.38) || i === Math.floor(barCount * 0.42);
        return { height: normalized, isHighlight };
      });
    }

    const pattern = [
      40, 55, 75, 80, 85, 90, 70, 60, 45, 85, 95, 100, 75, 80, 85, 90, 88, 72,
      65, 80, 85, 92, 95, 90, 85, 80, 45, 30,
    ];
    return Array.from({ length: barCount }, (_, i) => {
      const h = pattern[i % pattern.length];
      const isHighlight = i === 6 || i === 7;
      return { height: h, isHighlight };
    });
  }, [data, barCount]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          {value}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {/* Drop marker indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingRight: 6,
            marginBottom: 2,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '5px solid var(--text-muted)',
            }}
          />
        </div>

        {/* Vertical Equalizer bars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 3,
            height: 36,
            width: '100%',
          }}
        >
          {bars.map((bar, i) => {
            const isInactive = i >= bars.length - 4;
            const bg = isInactive
              ? 'var(--border-subtle)'
              : bar.isHighlight
              ? highlightColor
              : activeColor;

            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${bar.height}%`,
                  backgroundColor: bg,
                  borderRadius: 2,
                  transition: 'height 300ms ease, background-color 300ms ease',
                  boxShadow: bar.isHighlight
                    ? `0 0 6px ${highlightColor}60`
                    : !isInactive
                    ? `0 0 4px ${activeColor}30`
                    : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * MiniGauge: Horizontal segmented gradient progress gauge with theme-adaptive marker.
 */
export function MiniGauge({
  title = 'Bitimlar Samaradorligi',
  value = '98.5%',
  percent = 98.5,
}) {
  const markerPos = Math.max(5, Math.min(95, percent));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          {value}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {/* Top Marker Triangle */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 8,
            marginBottom: 2,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${markerPos}%`,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '6px solid var(--text-primary)',
              transition: 'left 400ms ease',
            }}
          />
        </div>

        {/* Multi-segment Gradient Bar */}
        <div
          style={{
            display: 'flex',
            gap: 3,
            height: 7,
            width: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--bg-chip)',
            padding: 1,
          }}
        >
          <div style={{ flex: 1, background: '#f59e0b', borderRadius: '3px 0 0 3px' }} />
          <div style={{ flex: 1.2, background: '#eab308' }} />
          <div style={{ flex: 1.5, background: '#84cc16' }} />
          <div style={{ flex: 2, background: '#10b981' }} />
          <div style={{ flex: 0.8, background: 'var(--border-subtle)', borderRadius: '0 3px 3px 0' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * MiniSparkline: Monotone wave spline with pulsing beacon and theme-adaptive styling.
 */
export function MiniSparkline({
  title = 'Sotuvlar Qadami',
  value = '11 ta',
  trend = '+12.7%',
  isPositive = true,
  data = [12, 18, 15, 24, 20, 28, 25, 30, 28, 36, 34, 42, 40, 48, 50],
}) {
  const { pathData, areaPath, lastPoint } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pathData: '', areaPath: '', lastPoint: { x: 100, y: 20 } };
    }

    const min = Math.min(...data);
    const max = Math.max(...data, min + 1);
    const range = max - min;
    const width = 140;
    const height = 40;
    const padding = 4;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });

    if (points.length === 1) {
      return {
        pathData: `M 0 ${height / 2} L ${width} ${height / 2}`,
        areaPath: `M 0 ${height / 2} L ${width} ${height / 2} L ${width} ${height} L 0 ${height} Z`,
        lastPoint: { x: width - padding, y: height / 2 },
      };
    }

    const d = getMonotoneMiniSpline(points);
    const last = points[points.length - 1];
    const area = `${d} L ${last.x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return { pathData: d, areaPath: area, lastPoint: last };
  }, [data]);

  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const badgeColor = isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: badgeColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10, position: 'relative', width: '100%', height: 44 }}>
        <svg
          viewBox="0 0 140 44"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`sparkGrad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill={`url(#sparkGrad-${title.replace(/\s+/g, '')})`}
          />
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${strokeColor}60)` }}
          />
          {lastPoint && (
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="3.5"
              fill={strokeColor}
              stroke="var(--bg-card)"
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * InlineCardSparkline: Minimal micro sparkline embedded inside top KPI cards (Variant 3 Executive style).
 */
export function InlineCardSparkline({
  data = [12, 16, 14, 22, 19, 26, 32],
  color = '#6366f1',
  width = 86,
  height = 34,
}) {
  const { pathData, areaPath, lastPoint } = useMemo(() => {
    if (!data || data.length === 0) return { pathData: '', areaPath: '', lastPoint: null };
    const min = Math.min(...data);
    const max = Math.max(...data, min + 1);
    const range = max - min;
    const padding = 3;

    const points = data.map((val, idx) => {
      const x = padding + (idx / Math.max(1, data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });

    const d = getMonotoneMiniSpline(points);
    const last = points[points.length - 1];
    const area = `${d} L ${last.x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return { pathData: d, areaPath: area, lastPoint: last };
  }, [data, width, height]);

  if (!pathData) return null;

  const gradId = `inline-grad-${color.replace('#', '')}-${Math.round(width)}`;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'visible' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill={color}
            stroke="var(--bg-card)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  );
}
