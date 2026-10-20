import React, { useId, useState } from 'react';

const SERIES = [
  { key: 'revenue_uzs', label: 'Tushum', color: 'var(--accent-emerald)' },
  { key: 'profit_uzs', label: 'Sof foyda', color: 'var(--chart-profit, #3671e9)' },
  { key: 'debt_sales_uzs', label: 'Nasiya savdo', color: 'var(--accent-amber)' },
];

export default function CompactSalesChart({ rows = [] }) {
  const [visible, setVisible] = useState(['revenue_uzs', 'profit_uzs']);
  const id = useId();
  const series = SERIES.filter(item => visible.includes(item.key));
  const values = rows.flatMap(row => series.map(item => Number(row[item.key]) || 0));
  const minimum = Math.min(0, ...values), maximum = Math.max(1, ...values);
  const width = 700, height = 250, left = 65, right = 20, top = 20, bottom = 42;
  const x = index => rows.length === 1 ? width / 2 : left + index * (width - left - right) / (rows.length - 1);
  const y = value => top + (maximum - value) / (maximum - minimum) * (height - top - bottom);
  const label = value => Number(value).toLocaleString('uz-UZ', { maximumFractionDigits: 0, notation: 'compact' });
  return <div className="workspace-compact-chart">
    {!rows.length ? <p className="workspace-empty">Tanlangan davrda grafik uchun ma’lumot yo‘q.</p> : <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Haqiqiy savdo tushumi, sof foyda va nasiya grafigi">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-emerald)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--accent-emerald)" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(index => {
        const value = minimum + (maximum - minimum) * index / 4;
        return <g key={index}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--border-subtle)" /><text x={left - 10} y={y(value) + 4} textAnchor="end">{label(value)}</text></g>;
      })}
      {series.map(item => {
        const points = rows.map((row, index) => `${x(index)},${y(Number(row[item.key]) || 0)}`).join(' ');
        return <g key={item.key}>
          {item.key === 'revenue_uzs' && rows.length > 1 && <polygon points={`${x(0)},${y(minimum)} ${points} ${x(rows.length - 1)},${y(minimum)}`} fill={`url(#${id})`} />}
          <polyline points={points} fill="none" stroke={item.color} strokeWidth="2.5" strokeLinejoin="round" />
          {rows.map((row, index) => <circle key={index} cx={x(index)} cy={y(Number(row[item.key]) || 0)} r="4" fill={item.color} stroke="var(--bg-card)" strokeWidth="1.5">
            <title>{row.date}: {item.label} — {Number(row[item.key] || 0).toLocaleString('uz-UZ')} UZS</title></circle>)}
        </g>;
      })}
      {rows.map((row, index) => index % Math.max(1, Math.ceil(rows.length / 7)) === 0 && <text key={index} x={x(index)} y={height - 12} textAnchor="middle">{String(row.date || '').slice(5)}</text>)}
    </svg>}
    <div className="workspace-chart-legend">{SERIES.map(item => <label key={item.key}>
      <input type="checkbox" checked={visible.includes(item.key)} onChange={() => setVisible(previous => previous.includes(item.key) ? previous.filter(key => key !== item.key) : [...previous, item.key])} />
      <span style={{ background: item.color }} />{item.label}</label>)}<small>UZS</small></div>
  </div>;
}
