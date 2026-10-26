const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 });

export const formatCLP = (v: number) => clp.format(Math.round(v));
export const formatNumber = (v: number) => num.format(v);
/** v en fracción: 0.123 → "12,3 %" */
export const formatPct = (v: number) => pct.format(v);

/** CLP compacto para gráficos y tarjetas: $12,3 M */
export function formatCLPShort(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toLocaleString("es-CL", { maximumFractionDigits: 0 })} mil`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
