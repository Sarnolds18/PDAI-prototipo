"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP, formatCLPShort } from "@/lib/format";

// Paleta validada (validate_palette.js, --pairs all, fondo blanco): coral, verde, azul.
// CVD en el borde (ΔE 8,0) → codificación secundaria: línea punteada + etiqueta directa al final.
export const SERIES_COLORS = { coral: "#e9502f", green: "#00876c", blue: "#2a78d6" } as const;

export type ChartSeries = { key: string; label: string; color: string; dashed?: boolean; values: number[] };

export function CashChart({ series, height = 280, title }: { series: ChartSeries[]; height?: number; title: string }) {
  const [showTable, setShowTable] = useState(false);
  const months = series[0]?.values.length ?? 0;
  const data = Array.from({ length: months }, (_, t) => {
    const row: Record<string, number> = { t };
    for (const s of series) row[s.key] = s.values[t];
    return row;
  });

  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-extrabold text-ink">{title}</span>
        <span className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden="true">
                <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "4 3" : undefined} />
              </svg>
              {s.label}
            </span>
          ))}
          <button type="button" onClick={() => setShowTable((v) => !v)} className="no-print underline underline-offset-2 hover:text-brand-700">
            {showTable ? "Ver gráfico" : "Ver tabla"}
          </button>
        </span>
      </figcaption>

      {showTable ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full text-right text-xs tabular">
            <thead className="sticky top-0 bg-sand">
              <tr>
                <th className="px-3 py-2 text-left">Mes</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.t} className="border-t border-line">
                  <td className="px-3 py-1.5 text-left">{row.t}</td>
                  {series.map((s) => (
                    <td key={s.key} className={`px-3 py-1.5 ${row[s.key] < 0 ? "text-coral-700" : ""}`}>
                      {formatCLP(row[s.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}. Usa "Ver tabla" para los valores.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 64, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#ece8df" vertical={false} />
              <XAxis
                dataKey="t"
                tickLine={false}
                axisLine={{ stroke: "#d9d4c8" }}
                ticks={[0, 6, 12, 18, 24, 30, 36].filter((x) => x < months)}
                tick={{ fontSize: 11, fill: "#5b6b67" }}
                tickFormatter={(v) => `m${v}`}
              />
              <YAxis
                width={64}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#5b6b67" }}
                tickFormatter={(v: number) => formatCLPShort(v)}
              />
              <ReferenceLine y={0} stroke="#12201d" strokeOpacity={0.5} />
              <Tooltip
                formatter={(value, name) => [formatCLP(Number(value)), series.find((s) => s.key === name)?.label ?? String(name)]}
                labelFormatter={(t) => `Mes ${t}`}
                contentStyle={{ borderRadius: 12, border: "1px solid #e3ded3", fontSize: 12 }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeDasharray={s.dashed ? "6 4" : undefined}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                  label={(props: { index?: number; x?: number | string; y?: number | string }) =>
                    props.index === months - 1 ? (
                      <text key={s.key} x={Number(props.x) + 6} y={Number(props.y)} dy={4} fontSize={11} fontWeight={700} fill="#12201d">
                        {s.label}
                      </text>
                    ) : (
                      <g key={`${s.key}-${props.index}`} />
                    )
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
