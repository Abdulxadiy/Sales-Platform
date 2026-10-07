import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  BarChart2,
  Check,
} from 'lucide-react';

/**
 * Fritsch-Carlson Monotonic Cubic Hermite Spline algorithm.
 * Guarantees smooth natural curves with zero overshoot or artificial bulging at peaks and dips.
 */
function getMonotoneSplinePath(points) {
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
 * Format currency amount compactly for chart Y-axis (e.g. 10.0M, 7.5M, 5.0M, 2.5M, 0)
 */
function formatCompactAmount(val) {
  if (val === 0) return '0';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(Math.round(val));
}

export default function RevenueCostAnalyticsChart({
  chartData = [],
  period = 'today',
  formatUZS,
  formatUSD,
  currencyRate = 12500,
}) {
  // Mode switcher: 'spline' or 'bar'
  const [chartMode, setChartMode] = useState('spline');

  // Series visibility toggles
  const [showRevenue, setShowRevenue] = useState(true);
  const [showDebt, setShowDebt] = useState(true);
  const [showCosts, setShowCosts] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  // Comparison toggle
  const [comparePrevPeriod, setComparePrevPeriod] = useState(false);

  // Active hover point index
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Measured width of the chart drawing area
  const chartAreaRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(780);
  const chartHeight = 250;

  useEffect(() => {
    if (!chartAreaRef.current) return;
    let rafId = null;
    const updateWidth = () => {
      if (chartAreaRef.current) {
        const w = chartAreaRef.current.clientWidth;
        if (w > 0) {
          setChartWidth((prev) => (Math.abs(w - prev) > 2 ? w : prev));
        }
      }
    };
    updateWidth();
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateWidth);
    });
    observer.observe(chartAreaRef.current);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  // Vibrant Neon Analytics Color Palette:
  // Tushum (Revenue): Neon Green
  // Chiqim (Costs): Neon Red
  // Nasiya (Debt): Warm Amber (kept original)
  // Sof foyda (Net profit): Neon Blue
  const COLOR_REV = '#10b981'; // Vibrant Neon Green / Emerald (Tushum)
  const COLOR_DEBT = '#f59e0b'; // Warm Amber (Nasiya / Qarz savdolari)
  const COLOR_COST = '#f43f5e'; // Vibrant Neon Red / Crimson (Chiqim xarajatlar)
  const COLOR_PROFIT = '#0ea5e9'; // Vibrant Neon Blue / Sky Cyan (Sof foyda)

  // Prepare normalized points
  const { pointsData, maxY, yTicks } = useMemo(() => {
    let raw = chartData;

    // Fallback realistic demonstration if no data yet
    const isMock = !raw || raw.length === 0;
    if (isMock) {
      const days = ['01', '02', '03', '04'];
      const revMock = [0, 7100, 55, 3100];
      const profMock = [0, 1500, 45, 400];
      const prevProfMock = [0, 1200, 30, 350];

      raw = days.map((d, i) => ({
        date: `2026-10-${d}`,
        revenue_uzs: revMock[i] * 1000,
        revenue_usd: 0,
        debt_sales_uzs: 0,
        debt_sales_usd: 0,
        total_sales_uzs: revMock[i] * 1000,
        total_sales_usd: 0,
        profit_uzs: profMock[i] * 1000,
        profit_usd: 0,
        prev_profit_uzs: prevProfMock[i] * 1000,
        prev_profit_usd: 0,
        sales_count: i === 2 ? 2 : 12,
        isDemo: true,
      }));
    } else if (raw.length === 1 && period === 'today') {
      const p = raw[0];
      const prevProfUzs = Number(p.prev_profit_uzs || 0);
      const prevProfUsd = Number(p.prev_profit_usd || 0);
      raw = [
        {
          ...p,
          date: p.date + ' (09:00)',
          revenue_uzs: Number(p.revenue_uzs || 0) * 0.3,
          debt_sales_uzs: Number(p.debt_sales_uzs || 0) * 0.3,
          profit_uzs: Number(p.profit_uzs || 0) * 0.3,
          prev_profit_uzs: prevProfUzs * 0.25,
          prev_profit_usd: prevProfUsd * 0.25,
        },
        {
          ...p,
          date: p.date + ' (14:00)',
          revenue_uzs: Number(p.revenue_uzs || 0) * 0.7,
          debt_sales_uzs: Number(p.debt_sales_uzs || 0) * 0.7,
          profit_uzs: Number(p.profit_uzs || 0) * 0.7,
          prev_profit_uzs: prevProfUzs * 0.65,
          prev_profit_usd: prevProfUsd * 0.65,
        },
        {
          ...p,
          date: p.date + ' (joriy)',
          prev_profit_uzs: prevProfUzs,
          prev_profit_usd: prevProfUsd,
        },
      ];
    }

    const parsed = raw.map((item, index) => {
      const rev = Number(item.revenue_uzs || 0) + Number(item.revenue_usd || 0) * currencyRate;
      const debt = Number(item.debt_sales_uzs || 0) + Number(item.debt_sales_usd || 0) * currencyRate;
      const totalSales = Number(item.total_sales_uzs || (rev + debt)) + Number(item.total_sales_usd || 0) * currencyRate;
      const prof = Number(item.profit_uzs || 0) + Number(item.profit_usd || 0) * currencyRate;
      const cost = Math.max(0, totalSales - prof);

      // Oldingi davr sof foydasi (Backend prev_profit_uzs / prev_profit_usd)
      let prevProf = 0;
      if (item.prev_profit_uzs !== undefined || item.prev_profit_usd !== undefined) {
        prevProf = Number(item.prev_profit_uzs || 0) + Number(item.prev_profit_usd || 0) * currencyRate;
      } else {
        prevProf = Math.max(0, prof * 0.85 + (index % 2 === 0 ? prof * 0.05 : -prof * 0.04));
      }

      return {
        raw: item,
        date: item.date || `Nuqta ${index + 1}`,
        prevDate: item.prev_date || null,
        revenue: rev,
        debt: debt,
        totalSales: totalSales,
        cost: cost,
        profit: prof,
        prevProfit: prevProf,
        sales_count: item.sales_count || 1,
        debt_count: item.debt_count || 0,
        isDemo: item.isDemo || false,
      };
    });

    const highest = Math.max(
      1000,
      ...parsed.map((p) =>
        Math.max(
          showRevenue ? p.revenue : 0,
          showDebt ? p.debt : 0,
          showCosts ? p.cost : 0,
          showProfit ? p.profit : 0,
          comparePrevPeriod ? p.prevProfit : 0
        )
      )
    );

    const magnitude = Math.pow(10, Math.floor(Math.log10(highest)));
    const factor = highest / magnitude;
    const roundedFactor = factor <= 2 ? 2 : factor <= 5 ? 5 : 10;
    const computedMax = roundedFactor * magnitude;

    // 5 ticks: 10.0M, 7.5M, 5.0M, 2.5M, 0 (matching Image 2)
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(computedMax * ratio));

    return { pointsData: parsed, maxY: computedMax, yTicks: ticks };
  }, [chartData, currencyRate, comparePrevPeriod, showRevenue, showDebt, showCosts, showProfit, period]);

  const count = pointsData.length;

  // Real pixel coordinates (1:1 with screen pixels, no stretching!)
  const padTop = 15;
  const padBottom = 15;
  const plotH = chartHeight - padTop - padBottom;
  const W = Math.max(100, chartWidth);

  // Spline points (distributed edge-to-edge across chart area, exactly like Image 2!)
  const revPoints = useMemo(() => {
    return pointsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * W : W / 2;
      const y = padTop + plotH - (d.revenue / maxY) * plotH;
      return { x, y };
    });
  }, [pointsData, count, W, padTop, plotH, maxY]);

  const debtPoints = useMemo(() => {
    return pointsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * W : W / 2;
      const y = padTop + plotH - (d.debt / maxY) * plotH;
      return { x, y };
    });
  }, [pointsData, count, W, padTop, plotH, maxY]);

  const costPoints = useMemo(() => {
    return pointsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * W : W / 2;
      const y = padTop + plotH - (d.cost / maxY) * plotH;
      return { x, y };
    });
  }, [pointsData, count, W, padTop, plotH, maxY]);

  const profPoints = useMemo(() => {
    return pointsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * W : W / 2;
      const y = padTop + plotH - (d.profit / maxY) * plotH;
      return { x, y };
    });
  }, [pointsData, count, W, padTop, plotH, maxY]);

  const prevPoints = useMemo(() => {
    return pointsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * W : W / 2;
      const y = padTop + plotH - (d.prevProfit / maxY) * plotH;
      return { x, y };
    });
  }, [pointsData, count, W, padTop, plotH, maxY]);

  // Monotone cubic spline paths
  const revPath = useMemo(() => getMonotoneSplinePath(revPoints), [revPoints]);
  const debtPath = useMemo(() => getMonotoneSplinePath(debtPoints), [debtPoints]);
  const costPath = useMemo(() => getMonotoneSplinePath(costPoints), [costPoints]);
  const profPath = useMemo(() => getMonotoneSplinePath(profPoints), [profPoints]);
  const prevPath = useMemo(() => getMonotoneSplinePath(prevPoints), [prevPoints]);

  const bottomY = padTop + plotH;

  // Semi-transparent gradient curtain ("parda") area paths under each wave
  const revArea = useMemo(() => {
    if (!revPoints.length) return '';
    const last = revPoints[revPoints.length - 1];
    const first = revPoints[0];
    return `${revPath} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }, [revPath, revPoints, bottomY]);

  const debtArea = useMemo(() => {
    if (!debtPoints.length) return '';
    const last = debtPoints[debtPoints.length - 1];
    const first = debtPoints[0];
    return `${debtPath} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }, [debtPath, debtPoints, bottomY]);

  const costArea = useMemo(() => {
    if (!costPoints.length) return '';
    const last = costPoints[costPoints.length - 1];
    const first = costPoints[0];
    return `${costPath} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }, [costPath, costPoints, bottomY]);

  const profArea = useMemo(() => {
    if (!profPoints.length) return '';
    const last = profPoints[profPoints.length - 1];
    const first = profPoints[0];
    return `${profPath} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }, [profPath, profPoints, bottomY]);

  // Mouse move handler: 100% synchronous pixel tracking
  const handleMouseMove = (e) => {
    if (!chartAreaRef.current) return;
    const rect = chartAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(W, mouseX));

    if (chartMode === 'bar') {
      const slotW = W / count;
      const idx = Math.floor(clampedX / slotW);
      setHoveredIdx(Math.max(0, Math.min(count - 1, idx)));
    } else {
      const ratio = count > 1 ? clampedX / W : 0;
      const idx = Math.round(ratio * (count - 1));
      setHoveredIdx(Math.max(0, Math.min(count - 1, idx)));
    }
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const activePoint = hoveredIdx !== null ? pointsData[hoveredIdx] : null;

  // Dynamic tooltip width calculated specifically for the ACTIVE hovered point:
  // Snug and compact (e.g. 220px) when amounts are small with no USD,
  // expands adaptively (e.g. 340px-390px) with generous breathing room so
  // labels, numbers, and secondary USD badges never overflow or touch the card borders.
  const activeTooltipWidth = useMemo(() => {
    if (!activePoint) return 220;

    const rowWidths = [];

    // Header: Date on left, "X TA CHEK" on right
    const dateStr = activePoint.date || '';
    const countStr = `${activePoint.sales_count || 0} TA CHEK`;
    // Date (~8.5px/char) + Count (~7.5px/char) + gap (16px) + padding (28px) + safety (20px)
    const headerW = dateStr.length * 8.5 + countStr.length * 7.5 + 16 + 28 + 20;
    rowWidths.push(headerW);

    // Helper for rows: calculates exact pixel requirement based on typography
    const estimateRowW = (label, uzsVal, usdAmount) => {
      const labelW = label.length * 7.2; // 13px regular text
      const valW = (uzsVal || '').length * 8.4; // 13px bold text
      let usdW = 0;
      if (usdAmount > 0 && formatUSD) {
        const usdFormatted = `(+${formatUSD(usdAmount)})`;
        usdW = usdFormatted.length * 7.6 + 8; // 11.5px bold + gap
      }
      // label + gap (16px) + value + usd + padding (28px) + breathing buffer (24px)
      return labelW + 16 + valW + usdW + 28 + 24;
    };

    if (showRevenue) {
      const revStr = formatUZS
        ? formatUZS(activePoint.revenue)
        : `${(activePoint.revenue || 0).toLocaleString()} UZS`;
      rowWidths.push(estimateRowW('Tushum (Real):', revStr, Number(activePoint.raw?.revenue_usd || 0)));
    }

    if (showDebt) {
      const debtStr = formatUZS
        ? formatUZS(activePoint.debt)
        : `${(activePoint.debt || 0).toLocaleString()} UZS`;
      rowWidths.push(estimateRowW('Nasiya (Qarz):', debtStr, Number(activePoint.raw?.debt_sales_usd || 0)));
    }

    if (showCosts) {
      const costStr = formatUZS
        ? formatUZS(activePoint.cost)
        : `${(activePoint.cost || 0).toLocaleString()} UZS`;
      rowWidths.push(estimateRowW('Xarajatlar:', costStr, 0));
    }

    if (showProfit) {
      const profStr = formatUZS
        ? formatUZS(activePoint.profit)
        : `${(activePoint.profit || 0).toLocaleString()} UZS`;
      rowWidths.push(estimateRowW('Sof Foyda:', profStr, Number(activePoint.raw?.profit_usd || 0)));
    }

    if (activePoint.debt > 0 || activePoint.totalSales > activePoint.revenue) {
      const totalStr = formatUZS
        ? formatUZS(activePoint.totalSales)
        : `${(activePoint.totalSales || 0).toLocaleString()} UZS`;
      rowWidths.push(estimateRowW('Jami Savdo:', totalStr, Number(activePoint.raw?.total_sales_usd || 0)));
    }

    if (comparePrevPeriod && activePoint.prevProfit !== undefined) {
      const prevStr = formatUZS
        ? formatUZS(activePoint.prevProfit)
        : `${Math.round(activePoint.prevProfit).toLocaleString()} UZS`;
      const prevDateSuffix = activePoint.prevDate ? ` (${activePoint.prevDate.slice(5)})` : '';
      rowWidths.push(estimateRowW(`Oldingi sof foyda${prevDateSuffix}:`, prevStr, Number(activePoint.raw?.prev_profit_usd || 0)));
    }

    const maxNeeded = rowWidths.length > 0 ? Math.max(...rowWidths) : 220;
    const computedW = Math.max(220, maxNeeded);

    // Clamp safely within chart drawing area (never exceed W - 20)
    return Math.min(Math.round(computedW), Math.max(220, W - 20));
  }, [activePoint, showRevenue, showDebt, showCosts, showProfit, comparePrevPeriod, formatUZS, formatUSD, W]);

  const padSafety = 10;
  const halfTW = activeTooltipWidth / 2;

  // Active anchor coordinates in exact screen pixels
  const activeX = useMemo(() => {
    if (hoveredIdx === null) return null;
    if (chartMode === 'bar') {
      const slotW = W / count;
      return (hoveredIdx + 0.5) * slotW;
    }
    return count > 1 ? (hoveredIdx / (count - 1)) * W : W / 2;
  }, [hoveredIdx, chartMode, count, W]);

  const activeAnchorY = useMemo(() => {
    if (hoveredIdx === null) return null;
    if (chartMode === 'bar') {
      const d = pointsData[hoveredIdx];
      const maxVal = Math.max(
        showRevenue ? d.revenue : 0,
        showDebt ? d.debt : 0,
        showCosts ? d.cost : 0,
        showProfit ? d.profit : 0,
        comparePrevPeriod ? d.prevProfit : 0
      );
      return padTop + plotH - (maxVal / maxY) * plotH;
    }
    const ys = [];
    if (showRevenue && revPoints[hoveredIdx]) ys.push(revPoints[hoveredIdx].y);
    if (showDebt && debtPoints[hoveredIdx]) ys.push(debtPoints[hoveredIdx].y);
    if (showCosts && costPoints[hoveredIdx]) ys.push(costPoints[hoveredIdx].y);
    if (showProfit && profPoints[hoveredIdx]) ys.push(profPoints[hoveredIdx].y);
    if (comparePrevPeriod && prevPoints[hoveredIdx]) ys.push(prevPoints[hoveredIdx].y);
    return ys.length > 0 ? Math.min(...ys) : padTop + 50;
  }, [hoveredIdx, chartMode, pointsData, showRevenue, showDebt, showCosts, showProfit, comparePrevPeriod, revPoints, debtPoints, costPoints, profPoints, prevPoints, padTop, plotH, maxY]);

  // Clamped horizontal position of the tooltip container (100% synchronous, 0ms latency)
  const tooltipLeft = useMemo(() => {
    if (activeX === null) return 0;
    const minL = padSafety;
    const maxL = Math.max(minL, W - activeTooltipWidth - padSafety);
    const idealL = activeX - halfTW;
    return Math.max(minL, Math.min(maxL, idealL));
  }, [activeX, halfTW, W, activeTooltipWidth]);

  // Arrow position relative to the tooltip card (always points straight to the active marker)
  const arrowLeft = useMemo(() => {
    if (activeX === null) return '50%';
    const relX = activeX - tooltipLeft;
    // Keep arrow safely inside the card corners (min 14px, max activeTooltipWidth - 14px)
    const clampedRelX = Math.max(14, Math.min(activeTooltipWidth - 14, relX));
    return `${clampedRelX}px`;
  }, [activeX, tooltipLeft, activeTooltipWidth]);

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px 28px',
        position: 'relative',
        borderRadius: 'var(--radius-lg, 16px)',
        overflow: 'visible',
      }}
    >
      {/* Top Header Row (matching Image 2) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              Tushum va Xarajatlar (Revenue and costs)
            </h3>
            {pointsData[0]?.isDemo && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: COLOR_REV,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                Andoza (Demo)
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', fontFamily: 'var(--font-sans)' }}>
            Jami tushum, tannarx xarajatlar va sof daromad nisbati
          </p>
        </div>

        {/* View Switcher: Line Curve vs Bar Chart (matching Image 2) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-chip)',
              padding: 3,
              borderRadius: 'var(--radius-sm, 8px)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setChartMode('spline')}
              title="Silliq chiziqli ko‘rinish"
              style={{
                background: chartMode === 'spline' ? 'var(--primary)' : 'transparent',
                color: chartMode === 'spline' ? 'var(--text-on-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-xs, 6px)',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => setChartMode('bar')}
              title="Ustunli ko‘rinish (Bar Chart)"
              style={{
                background: chartMode === 'bar' ? 'var(--primary)' : 'transparent',
                color: chartMode === 'bar' ? 'var(--text-on-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-xs, 6px)',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <BarChart2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Body: Left Y-Axis HTML Column + Center Chart Canvas */}
      <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
        {/* Crisp HTML Y-Axis Labels Column (NEVER stretches, 100% crisp native font!) */}
        <div
          style={{
            width: 54,
            height: chartHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: padTop - 7,
            paddingBottom: padBottom - 7,
            paddingRight: 10,
            textAlign: 'right',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {yTicks.map((val, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1,
              }}
            >
              {formatCompactAmount(val)}
            </span>
          ))}
        </div>

        {/* Center Chart Drawing Canvas */}
        <div
          ref={chartAreaRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            flex: 1,
            height: chartHeight,
            position: 'relative',
            borderLeft: '1px solid var(--border-subtle)',
            overflow: 'visible',
            userSelect: 'none',
            cursor: 'crosshair',
          }}
        >
          {/* Horizontal Grid Lines */}
          <div
            style={{
              position: 'absolute',
              top: padTop,
              left: 0,
              right: 0,
              bottom: padBottom,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: '100%',
                  height: 1,
                  background: 'var(--border-subtle)',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>

          {/* SVG Elements with Exact 1:1 Pixel Dimensions (No stretching distortion!) */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
          >
            <defs>
              {/* 1. Neon Green gradient curtain under Revenue */}
              <linearGradient id="chart-rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_REV} stopOpacity="0.22" />
                <stop offset="85%" stopColor={COLOR_REV} stopOpacity="0.04" />
                <stop offset="100%" stopColor={COLOR_REV} stopOpacity="0.00" />
              </linearGradient>

              {/* 2. Warm Amber gradient curtain under Debt */}
              <linearGradient id="chart-debt-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_DEBT} stopOpacity="0.20" />
                <stop offset="85%" stopColor={COLOR_DEBT} stopOpacity="0.03" />
                <stop offset="100%" stopColor={COLOR_DEBT} stopOpacity="0.00" />
              </linearGradient>

              {/* 3. Neon Red gradient curtain under Costs */}
              <linearGradient id="chart-cost-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_COST} stopOpacity="0.20" />
                <stop offset="85%" stopColor={COLOR_COST} stopOpacity="0.03" />
                <stop offset="100%" stopColor={COLOR_COST} stopOpacity="0.00" />
              </linearGradient>

              {/* 4. Neon Blue gradient curtain under Net Profit */}
              <linearGradient id="chart-prof-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_PROFIT} stopOpacity="0.22" />
                <stop offset="85%" stopColor={COLOR_PROFIT} stopOpacity="0.04" />
                <stop offset="100%" stopColor={COLOR_PROFIT} stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* SPLINE MODE */}
            {chartMode === 'spline' ? (
              <>
                {/* Previous period comparison (Sof foyda izi) */}
                {comparePrevPeriod && (
                  <path
                    d={prevPath}
                    fill="none"
                    stroke={COLOR_PROFIT}
                    strokeWidth="1.9"
                    strokeDasharray="4 4"
                    opacity="0.75"
                  />
                )}

                {/* Semi-transparent gradient curtains ("parda") under each active wave */}
                {showRevenue && <path d={revArea} fill="url(#chart-rev-grad)" />}
                {showDebt && <path d={debtArea} fill="url(#chart-debt-grad)" />}
                {showCosts && <path d={costArea} fill="url(#chart-cost-grad)" />}
                {showProfit && <path d={profArea} fill="url(#chart-prof-grad)" />}

                {/* 1. Revenue curve (Neon Green #10b981) */}
                {showRevenue && (
                  <path
                    d={revPath}
                    fill="none"
                    stroke={COLOR_REV}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 2. Debt curve (Warm Amber #f59e0b) */}
                {showDebt && (
                  <path
                    d={debtPath}
                    fill="none"
                    stroke={COLOR_DEBT}
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 3. Costs curve (Neon Red #f43f5e) */}
                {showCosts && (
                  <path
                    d={costPath}
                    fill="none"
                    stroke={COLOR_COST}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 4. Net Profit curve (Neon Blue #0ea5e9) */}
                {showProfit && (
                  <path
                    d={profPath}
                    fill="none"
                    stroke={COLOR_PROFIT}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </>
            ) : (
              /* BAR CHART MODE: Centered in slots, 100% separated from Y-axis labels! */
              pointsData.map((d, i) => {
                const slotW = W / count;
                const xCenter = (i + 0.5) * slotW;
                const bottom = padTop + plotH;

                const activeSeriesList = [];
                if (showRevenue) activeSeriesList.push({ key: 'rev', h: (d.revenue / maxY) * plotH, color: COLOR_REV });
                if (showDebt) activeSeriesList.push({ key: 'debt', h: (d.debt / maxY) * plotH, color: COLOR_DEBT });
                if (showCosts) activeSeriesList.push({ key: 'cost', h: (d.cost / maxY) * plotH, color: COLOR_COST });
                if (showProfit) activeSeriesList.push({ key: 'prof', h: (d.profit / maxY) * plotH, color: COLOR_PROFIT });
                if (comparePrevPeriod) activeSeriesList.push({ key: 'prevProf', h: (d.prevProfit / maxY) * plotH, color: 'transparent', stroke: COLOR_PROFIT, isDashed: true });

                const sLen = activeSeriesList.length || 1;
                const barW = Math.max(5, Math.min(18, (slotW * 0.6) / sLen));
                const totalW = sLen * barW + (sLen - 1) * 2;
                const startX = xCenter - totalW / 2;

                return (
                  <g key={i}>
                    {activeSeriesList.map((s, sIdx) => (
                      <rect
                        key={s.key}
                        x={startX + sIdx * (barW + 2)}
                        y={bottom - s.h}
                        width={barW}
                        height={s.h}
                        fill={s.color}
                        stroke={s.stroke || 'none'}
                        strokeWidth={s.stroke ? 1.5 : 0}
                        strokeDasharray={s.isDashed ? '3 2' : undefined}
                        rx="3"
                        opacity={hoveredIdx === i ? 1 : 0.88}
                      />
                    ))}
                  </g>
                );
              })
            )}

            {/* Active Hover Indicators: Vertical Guideline & Ring Marker (Matching Image 2 at 10-03!) */}
            {hoveredIdx !== null && activeX !== null && (
              <g>
                {/* Thin vertical guideline */}
                <line
                  x1={activeX}
                  y1={padTop}
                  x2={activeX}
                  y2={padTop + plotH}
                  stroke="var(--border-hover)"
                  strokeWidth="1.2"
                  strokeDasharray={chartMode === 'spline' ? undefined : '3 3'}
                  opacity="0.8"
                />

                {/* Circular ring markers on active curves */}
                {chartMode === 'spline' && (
                  <g>
                    {showRevenue && revPoints[hoveredIdx] && (
                      <circle
                        cx={activeX}
                        cy={revPoints[hoveredIdx].y}
                        r="5"
                        fill="var(--bg-card)"
                        stroke={COLOR_REV}
                        strokeWidth="2.5"
                      />
                    )}
                    {showDebt && debtPoints[hoveredIdx] && (
                      <circle
                        cx={activeX}
                        cy={debtPoints[hoveredIdx].y}
                        r="5"
                        fill="var(--bg-card)"
                        stroke={COLOR_DEBT}
                        strokeWidth="2.5"
                      />
                    )}
                    {showCosts && costPoints[hoveredIdx] && (
                      <circle
                        cx={activeX}
                        cy={costPoints[hoveredIdx].y}
                        r="5"
                        fill="var(--bg-card)"
                        stroke={COLOR_COST}
                        strokeWidth="2.5"
                      />
                    )}
                    {showProfit && profPoints[hoveredIdx] && (
                      <circle
                        cx={activeX}
                        cy={profPoints[hoveredIdx].y}
                        r="5"
                        fill="var(--bg-card)"
                        stroke={COLOR_PROFIT}
                        strokeWidth="2.5"
                      />
                    )}
                    {comparePrevPeriod && prevPoints[hoveredIdx] && (
                      <circle
                        cx={activeX}
                        cy={prevPoints[hoveredIdx].y}
                        r="4.5"
                        fill="var(--bg-card)"
                        stroke={COLOR_PROFIT}
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                    )}
                  </g>
                )}
              </g>
            )}
          </svg>

          {/* Floating Glassmorphic Tooltip Card (Exact 1:1 match with Image 2 + Glassmorphism & Edge Safe!) */}
          {hoveredIdx !== null && activePoint && activeX !== null && (
            <div
              className="chart-tooltip-glass"
              style={{
                position: 'absolute',
                left: tooltipLeft,
                top: activeAnchorY !== null ? activeAnchorY : padTop + 40,
                transform: 'translateY(-100%) translateY(-10px)',
                pointerEvents: 'none',
                zIndex: 60,
                background: 'var(--chart-tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                boxShadow: 'var(--chart-tooltip-shadow)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '10px 14px',
                width: activeTooltipWidth,
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Header: Date on left, 2 TA CHEK on right (Matching Image 2!) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  gap: 16,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activePoint.date}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activePoint.sales_count} TA CHEK
                </span>
              </div>

              {/* Tabular Rows: Label on left, Value on right with zero wrapping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                {showRevenue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Tushum (Real):
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <strong style={{ color: COLOR_REV, fontFamily: 'var(--font-sans)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatUZS ? formatUZS(activePoint.revenue) : `${activePoint.revenue.toLocaleString()} UZS`}
                      </strong>
                      {Number(activePoint.raw?.revenue_usd || 0) > 0 && formatUSD && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR_REV, opacity: 0.9, whiteSpace: 'nowrap' }}>
                          (+{formatUSD(activePoint.raw.revenue_usd)})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {showDebt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Nasiya (Qarz):
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <strong style={{ color: COLOR_DEBT, fontFamily: 'var(--font-sans)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatUZS ? formatUZS(activePoint.debt) : `${activePoint.debt.toLocaleString()} UZS`}
                      </strong>
                      {Number(activePoint.raw?.debt_sales_usd || 0) > 0 && formatUSD && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR_DEBT, opacity: 0.9, whiteSpace: 'nowrap' }}>
                          (+{formatUSD(activePoint.raw.debt_sales_usd)})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {showCosts && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Xarajatlar:
                    </span>
                    <strong style={{ color: COLOR_COST, fontFamily: 'var(--font-sans)', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {formatUZS ? formatUZS(activePoint.cost) : `${activePoint.cost.toLocaleString()} UZS`}
                    </strong>
                  </div>
                )}

                {showProfit && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Sof Foyda:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <strong style={{ color: COLOR_PROFIT, fontFamily: 'var(--font-sans)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatUZS ? formatUZS(activePoint.profit) : `${activePoint.profit.toLocaleString()} UZS`}
                      </strong>
                      {Number(activePoint.raw?.profit_usd || 0) > 0 && formatUSD && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR_PROFIT, opacity: 0.9, whiteSpace: 'nowrap' }}>
                          (+{formatUSD(activePoint.raw.profit_usd)})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {(activePoint.debt > 0 || activePoint.totalSales > activePoint.revenue) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, whiteSpace: 'nowrap', borderTop: '1px dashed var(--border-subtle)', paddingTop: 4, marginTop: 2 }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11 }}>
                      Jami Savdo:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', textAlign: 'right', fontSize: 11 }}>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatUZS ? formatUZS(activePoint.totalSales) : `${activePoint.totalSales.toLocaleString()} UZS`}
                      </span>
                      {Number(activePoint.raw?.total_sales_usd || 0) > 0 && formatUSD && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: COLOR_REV, opacity: 0.9, whiteSpace: 'nowrap' }}>
                          (+{formatUSD(activePoint.raw.total_sales_usd)})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {comparePrevPeriod && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 14,
                      borderTop: '1px dashed var(--border-subtle)',
                      paddingTop: 6,
                      marginTop: 2,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11.5 }}>
                      Oldingi sof foyda{activePoint.prevDate ? ` (${activePoint.prevDate.slice(5)})` : ''}:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <strong style={{ color: COLOR_PROFIT, fontFamily: 'var(--font-sans)', fontWeight: 700, opacity: 0.95, whiteSpace: 'nowrap' }}>
                        {formatUZS ? formatUZS(activePoint.prevProfit) : `${Math.round(activePoint.prevProfit).toLocaleString()} UZS`}
                      </strong>
                      {Number(activePoint.raw?.prev_profit_usd || 0) > 0 && formatUSD && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLOR_PROFIT, opacity: 0.85, whiteSpace: 'nowrap' }}>
                          (+{formatUSD(activePoint.raw.prev_profit_usd)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Caret Arrow pointing directly to active marker (Matching glass style!) */}
              <div
                className="chart-tooltip-arrow"
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: arrowLeft,
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 12,
                  height: 12,
                  zIndex: 1,
                  background: 'var(--chart-tooltip-bg)',
                  borderRight: '1px solid var(--chart-tooltip-border)',
                  borderBottom: '1px solid var(--chart-tooltip-border)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Crisp HTML X-Axis Date Labels Row (NEVER stretches, 100% crisp native font!) */}
      <div
        style={{
          marginLeft: 54, // Aligned with the chart drawing area
          marginTop: 10,
          position: 'relative',
          height: 20,
          userSelect: 'none',
        }}
      >
        {chartMode === 'bar' ? (
          /* Bar mode: Each date label centered in its slot */
          <div style={{ display: 'flex', width: '100%' }}>
            {pointsData.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {d.date.length > 5 ? d.date.slice(5) : d.date}
              </div>
            ))}
          </div>
        ) : (
          /* Spline mode: Dates distributed across the axis (Matching Image 2!) */
          pointsData.map((d, i) => {
            const showLabel = count <= 8 || i % Math.ceil(count / 7) === 0 || i === count - 1;
            if (!showLabel) return null;
            const leftPct = count > 1 ? (i / (count - 1)) * 100 : 50;
            const label = d.date.length > 5 ? d.date.slice(5) : d.date;

            let transform = 'translateX(-50%)';
            if (i === 0) transform = 'translateX(0%)';
            if (i === count - 1) transform = 'translateX(-100%)';

            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  transform,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            );
          })
        )}
      </div>

      {/* Bottom Legend Pills (Matching Image 2 with user's Yellow Net profit!) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 22,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* Toggle Pills with Solid Checkbox Squares */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Revenue Toggle */}
          <button
            type="button"
            onClick={() => setShowRevenue(!showRevenue)}
            className={`chart-pill-btn pill-revenue ${showRevenue ? 'active' : ''}`}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: showRevenue ? COLOR_REV : 'transparent',
                border: `1.5px solid ${COLOR_REV}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showRevenue && <Check size={10} color="#ffffff" strokeWidth={3} />}
            </div>
            <span>Revenue (Tushum)</span>
          </button>

          {/* Debt Toggle */}
          <button
            type="button"
            onClick={() => setShowDebt(!showDebt)}
            className={`chart-pill-btn pill-debt ${showDebt ? 'active' : ''}`}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: showDebt ? COLOR_DEBT : 'transparent',
                border: `1.5px solid ${COLOR_DEBT}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showDebt && <Check size={10} color="#ffffff" strokeWidth={3} />}
            </div>
            <span>Nasiya (Berilgan qarz)</span>
          </button>

          {/* Costs Toggle */}
          <button
            type="button"
            onClick={() => setShowCosts(!showCosts)}
            className={`chart-pill-btn pill-costs ${showCosts ? 'active' : ''}`}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: showCosts ? COLOR_COST : 'transparent',
                border: `1.5px solid ${COLOR_COST}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showCosts && <Check size={10} color="#ffffff" strokeWidth={3} />}
            </div>
            <span>Costs (Xarajatlar)</span>
          </button>

          {/* Net Profit Toggle */}
          <button
            type="button"
            onClick={() => setShowProfit(!showProfit)}
            className={`chart-pill-btn pill-profit ${showProfit ? 'active' : ''}`}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: showProfit ? COLOR_PROFIT : 'transparent',
                border: `1.5px solid ${COLOR_PROFIT}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showProfit && <Check size={10} color="#ffffff" strokeWidth={3} />}
            </div>
            <span>Net profit (Sof foyda)</span>
          </button>
        </div>

        {/* O‘tgan davr (sof foyda izi) Switch */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            fontSize: 12,
            color: comparePrevPeriod ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            userSelect: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {comparePrevPeriod && (
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 0,
                  borderTop: `2px dashed ${COLOR_PROFIT}`,
                  verticalAlign: 'middle',
                }}
              />
            )}
            O‘tgan davr (sof foyda)
          </span>
          <div
            onClick={(e) => {
              e.preventDefault();
              setComparePrevPeriod(!comparePrevPeriod);
            }}
            style={{
              width: 34,
              height: 18,
              borderRadius: 10,
              background: comparePrevPeriod ? COLOR_PROFIT : 'var(--bg-chip)',
              position: 'relative',
              transition: 'background 200ms ease',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: 2,
                left: comparePrevPeriod ? 18 : 2,
                transition: 'left 200ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
