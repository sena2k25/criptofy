import { useMemo } from "react";
import { CHART_RANGES } from "../lib/crypto";
import { useStore } from "../store";

type Props = {
  points: [number, number][];
  days: string;
  onDays: (days: string) => void;
};

function formatAxisX(ts: number, days: string) {
  const d = new Date(ts);
  if (days === "1") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (days === "7" || days === "30") return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function PriceChart({ points, days, onDays }: Props) {
  const { price } = useStore();
  const W = 960;
  const H = 440;
  const L = 82;
  const R = 20;
  const T = 20;
  const B = 38;

  const series = useMemo(() => {
    const clean = points.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]) && p[1] > 0);
    if (clean.length < 2) return null;
    const vals = clean.map((p) => p[1]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08 || min * 0.02 || 0.01;
    const lo = min - pad;
    const hi = max + pad;
    const first = clean[0][0];
    const lastT = clean[clean.length - 1][0];
    const span = Math.max(1, lastT - first);
    const plotW = W - L - R;
    const plotH = H - T - B;
    const xy = clean.map(([t, p]) => {
      const x = L + ((t - first) / span) * plotW;
      const y = T + (1 - (p - lo) / (hi - lo)) * plotH;
      return [x, y] as const;
    });
    const path = xy.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const last = xy[xy.length - 1];
    const area = `${path} L${last[0].toFixed(1)},${H - B} L${xy[0][0].toFixed(1)},${H - B} Z`;
    const up = clean[clean.length - 1][1] >= clean[0][1];
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: T + f * plotH,
      v: hi - f * (hi - lo),
    }));
    const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => ({
      x: L + f * plotW,
      t: first + f * span,
    }));
    return { path, area, up, last, yTicks, xTicks, min, max };
  }, [points]);

  return (
    <div className="chart-panel">
      <div className="chart-ranges">
        {CHART_RANGES.map((r) => (
          <button key={r.id} type="button" className={days === r.id ? "on" : ""} onClick={() => onDays(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="chart-box">
        {!series ? (
          <div className="chart-empty">Carregando gráfico…</div>
        ) : (
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="criptofyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.up ? "#3dd68c" : "#e06a6a"} stopOpacity="0.32" />
                <stop offset="100%" stopColor={series.up ? "#3dd68c" : "#e06a6a"} stopOpacity="0" />
              </linearGradient>
            </defs>
            {series.yTicks.map((tick) => (
              <g key={tick.y}>
                <line x1={L} y1={tick.y} x2={W - R} y2={tick.y} className="chart-grid" />
                <text x={L - 8} y={tick.y + 4} textAnchor="end" className="chart-axis">
                  {price(tick.v)}
                </text>
              </g>
            ))}
            {series.xTicks.map((tick) => (
              <text key={tick.x} x={tick.x} y={H - 10} textAnchor="middle" className="chart-axis">
                {formatAxisX(tick.t, days)}
              </text>
            ))}
            <path d={series.area} fill="url(#criptofyFill)" />
            <path d={series.path} fill="none" stroke={series.up ? "#3dd68c" : "#e06a6a"} strokeWidth="2.4" />
            <circle cx={series.last[0]} cy={series.last[1]} r="4.5" fill={series.up ? "#3dd68c" : "#e06a6a"} />
          </svg>
        )}
      </div>
      {series ? (
        <p className="tiny chart-span">
          {price(series.min)} — {price(series.max)} no período
        </p>
      ) : null}
    </div>
  );
}
