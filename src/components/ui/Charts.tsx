import React, { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  secondaryValue?: number;
  suffix?: string;
}

export function BarTrendChart({
  data,
  primaryColor = '#0F2A56',
  secondaryColor = '#94A3B8',
  primaryLabel = 'Primary',
  secondaryLabel,
  height = 200,
  maxValue,
  formatValue = (v) => String(v),
}: {
  data: BarDatum[];
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
  maxValue?: number;
  formatValue?: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const rawMax = Math.max(
    1,
    maxValue ?? 0,
    ...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0))
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        No chart records available for the selected filter.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        <div className="flex h-full items-end gap-2 sm:gap-3 pt-6 pb-6 border-b border-slate-200">
          {data.map((d, idx) => {
            const h1 = Math.max(4, Math.round((d.value / rawMax) * (height - 56)));
            const h2 =
              d.secondaryValue !== undefined
                ? Math.max(4, Math.round((d.secondaryValue / rawMax) * (height - 56)))
                : 0;
            const isHovered = hoverIdx === idx;

            return (
              <div
                key={d.label}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                className="relative flex-1 flex flex-col items-center justify-end h-full min-w-0 cursor-pointer"
              >
                {isHovered && (
                  <div className="absolute -top-1 z-20 rounded-md border border-slate-200 bg-slate-900 px-2.5 py-1 text-xs text-white shadow-md whitespace-nowrap tabular-nums">
                    {d.label}: {formatValue(d.value)}
                    {d.secondaryValue !== undefined && secondaryLabel
                      ? ` · ${secondaryLabel}: ${formatValue(d.secondaryValue)}`
                      : ''}
                  </div>
                )}
                <div className="flex items-end justify-center gap-1 w-full">
                  <div
                    className="w-full max-w-[26px] rounded-t transition-opacity"
                    style={{
                      height: h1,
                      backgroundColor: primaryColor,
                      opacity: hoverIdx !== null && !isHovered ? 0.55 : 1,
                    }}
                  />
                  {d.secondaryValue !== undefined && (
                    <div
                      className="w-full max-w-[20px] rounded-t transition-opacity"
                      style={{
                        height: h2,
                        backgroundColor: secondaryColor,
                        opacity: hoverIdx !== null && !isHovered ? 0.55 : 0.85,
                      }}
                    />
                  )}
                </div>
                <span className="mt-2 text-[11px] text-slate-500 truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        {secondaryLabel && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
            {secondaryLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function LineTrendChart({
  data,
  color = '#1D4ED8',
  height = 190,
  unit = '%',
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
  unit?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        No performance records available.
      </div>
    );
  }

  const width = 480;
  const padX = 28;
  const padY = 24;
  const maxVal = Math.max(100, ...data.map((d) => d.value));
  const minVal = 0;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((d.value - minVal) / Math.max(1, maxVal - minVal)) * (height - padY * 2);
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `M ${points[0].x},${height - padY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${
          points[points.length - 1].x
        },${height - padY} Z`
      : '';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = height - padY - (tick / maxVal) * (height - padY * 2);
          return (
            <g key={tick}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={4} y={y + 4} fontSize="10" fill="#64748b" className="tabular-nums">
                {tick}
                {unit}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <>
            <path d={areaPath} fill={color} fillOpacity="0.08" />
            <polyline fill="none" stroke={color} strokeWidth="2.5" points={polyline} />
          </>
        )}

        {points.map((p, idx) => (
          <g
            key={p.label}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
            className="cursor-pointer"
          >
            <circle cx={p.x} cy={p.y} r={hoverIdx === idx ? 6 : 4} fill="#ffffff" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={height - 4} fontSize="10" textAnchor="middle" fill="#64748b">
              {p.label.slice(0, 12)}
            </text>
            {hoverIdx === idx && (
              <g>
                <rect x={Math.min(width - 110, Math.max(10, p.x - 46))} y={Math.max(2, p.y - 30)} width="96" height="22" rx="4" fill="#0f172a" />
                <text
                  x={Math.min(width - 62, Math.max(58, p.x + 2))}
                  y={Math.max(16, p.y - 16)}
                  fontSize="10.5"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="tabular-nums"
                >
                  {p.value}
                  {unit}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DonutBreakdownChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const offset = -cumulative * circumference;
            cumulative += pct;
            return (
              <circle
                key={seg.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
          <span className="text-base font-bold text-slate-900 tabular-nums">{centerValue}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 w-full">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">
              ₹{seg.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
