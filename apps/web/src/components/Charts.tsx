import { useId } from 'react';

export interface Pt { label: string; value: number; }

/** Gráfico de tendencia (área + línea) para series temporales. */
export function TrendChart({ data, height = 150, color = '#635bff' }: { data: Pt[]; height?: number; color?: string }) {
  const W = 320, H = height, pad = 6;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gid = 'g' + useId().replace(/[^a-z0-9]/gi, '');
  const xs = (i: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad));
  const ys = (v: number) => H - pad - (v / max) * (H - 2 * pad);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(d.value).toFixed(1)}`).join(' ');
  const area = n ? `${line} L${xs(n - 1).toFixed(1)},${H - pad} L${xs(0).toFixed(1)},${H - pad} Z` : '';
  return (
    <svg className="tchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Barras verticales (horas pico, día de la semana, etc.). */
export function Bars({ data, color = '#635bff', highlightMax = true, fmt }: { data: Pt[]; color?: string; highlightMax?: boolean; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i} title={`${d.label}: ${fmt ? fmt(d.value) : d.value}`}>
          <div className="bar-track">
            <div className="bar" style={{ height: `${(d.value / max) * 100}%`, background: highlightMax && d.value === max ? 'var(--ink)' : color }} />
          </div>
          <span className="bar-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Dona de proporciones (estado de los viajes). */
export function Donut({ slices, size = 128, centerTop, centerSub }: {
  slices: { label: string; value: number; color: string }[]; size?: number; centerTop?: string; centerSub?: string;
}) {
  const total = Math.max(1, slices.reduce((s, x) => s + x.value, 0));
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 128 128" width={size} height={size} className="donut">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        {slices.filter((s) => s.value > 0).map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const off = -acc * c;
          acc += frac;
          return <circle key={i} cx="64" cy="64" r={r} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={off} transform="rotate(-90 64 64)" />;
        })}
        {centerTop && <text x="64" y="60" textAnchor="middle" className="donut-top">{centerTop}</text>}
        {centerSub && <text x="64" y="78" textAnchor="middle" className="donut-sub">{centerSub}</text>}
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div className="leg" key={i}><span className="dot" style={{ background: s.color }} />{s.label} <b>{s.value}</b></div>
        ))}
      </div>
    </div>
  );
}
