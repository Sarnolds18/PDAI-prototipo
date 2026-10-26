import { BadgeCheck, MapPin, Target } from "lucide-react";
import { CashChart, SERIES_COLORS } from "@/components/cash-chart";
import { EVIDENCE_TYPES, INDUSTRIES, label, SEEKING, SKILL_LEVELS, SKILLS, STAGES } from "@/lib/catalog";
import { IRR_STATUS_TEXT, type FinanceSummary } from "@/lib/finance";
import { formatCLPShort, formatNumber, formatPct } from "@/lib/format";
import type { SkillEntry } from "@/lib/types";
import { LogoMark } from "./logo";

export type FichaData = {
  projectName: string;
  founderName: string;
  region: string | null;
  industry: string | null;
  stage: string | null;
  seeking: string[];
  skills: SkillEntry[];
  problem: string | null;
  solution: string | null;
  customer: string | null;
  traction: string | null;
  finance: { summary: FinanceSummary; discountRate: number } | null;
  generatedAt: string;
};

/** Ficha estandarizada: lo que recibe un mentor o inversionista. Imprimible en A4. */
export function FichaView({ data }: { data: FichaData }) {
  const f = data.finance;
  const base = f?.summary.scenarios.base;
  const validated = data.skills.length > 0 && data.skills.every((s) => s.evidence);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-white print:rounded-none print:border-0">
      <header className="bg-network px-6 py-6 text-white print:px-0 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-100">Ficha de proyecto</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{data.projectName}</h1>
            <p className="mt-1 text-brand-50">por {data.founderName}</p>
          </div>
          {validated && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-brand-700">
              <BadgeCheck className="h-5 w-5 text-coral-500" /> Perfil validado
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          <Pill>{label(INDUSTRIES, data.industry)}</Pill>
          <Pill>Etapa: {label(STAGES, data.stage)}</Pill>
          {data.region && (
            <Pill>
              <MapPin className="h-3.5 w-3.5" /> {data.region}
            </Pill>
          )}
          {data.seeking.length > 0 && (
            <Pill tone="coral">
              <Target className="h-3.5 w-3.5" /> Busca: {data.seeking.map((s) => label(SEEKING, s)).join(", ")}
            </Pill>
          )}
        </div>
      </header>

      <div className="space-y-8 px-6 py-6 print:px-0 sm:px-8">
        <section>
          <SectionTitle>El proyecto</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Block title="Problema" text={data.problem} />
            <Block title="Solución" text={data.solution} />
            <Block title="Cliente" text={data.customer} />
            <Block title="Avance" text={data.traction} />
          </div>
        </section>

        <section>
          <SectionTitle>Indicadores · escenario base</SectionTitle>
          {f && base ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="VAN 3 años" value={formatCLPShort(base.npv)} sub={`Tasa ${formatPct(f.discountRate)} anual`} bad={base.npv < 0} />
                <Metric
                  label="TIR anual"
                  value={base.irr === null ? "—" : formatPct(base.irr)}
                  sub={base.irr === null ? IRR_STATUS_TEXT[base.irr_status] : "Rentabilidad del proyecto"}
                  bad={base.irr === null || base.irr < f.discountRate}
                />
                <Metric
                  label="Punto de equilibrio"
                  value={f.summary.break_even_units === null ? "—" : `${formatNumber(f.summary.break_even_units)} u/mes`}
                  sub={base.break_even_month ? `Desde el mes ${base.break_even_month}` : "No se alcanza en 3 años"}
                  bad={!base.break_even_month}
                />
                <Metric
                  label="Recuperación"
                  value={base.payback_month ? `Mes ${base.payback_month}` : "—"}
                  sub={`Capital necesario ${formatCLPShort(-Math.min(base.min_cumulative, f.summary.scenarios.contingencia.min_cumulative))}`}
                  bad={!base.payback_month}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-line p-4">
                  <CashChart
                    title="Flujo de caja acumulado"
                    height={220}
                    series={[
                      { key: "optimista", label: "Optimista", color: SERIES_COLORS.blue, values: f.summary.scenarios.optimista.cumulative },
                      { key: "base", label: "Base", color: SERIES_COLORS.green, values: base.cumulative },
                      { key: "pesimista", label: "Pesimista", color: SERIES_COLORS.coral, dashed: true, values: f.summary.scenarios.pesimista.cumulative },
                    ]}
                  />
                </div>
                <table className="w-full self-start text-sm tabular">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-1.5">Año</th>
                      <th className="py-1.5 text-right">Ventas</th>
                      <th className="py-1.5 text-right">Margen neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2].map((y) => (
                      <tr key={y} className="border-t border-line">
                        <td className="py-2 font-bold">Año {y + 1}</td>
                        <td className="py-2 text-right">{formatCLPShort(base.revenue_by_year[y])}</td>
                        <td className={`py-2 text-right ${(base.margin_by_year[y] ?? 0) < 0 ? "text-coral-700" : ""}`}>
                          {base.margin_by_year[y] === null ? "—" : formatPct(base.margin_by_year[y] as number)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-line text-muted">
                      <td colSpan={3} className="pt-2 text-xs">
                        VAN pesimista {formatCLPShort(f.summary.scenarios.pesimista.npv)} · optimista {formatCLPShort(f.summary.scenarios.optimista.npv)} ·
                        con atraso de pagos {formatCLPShort(f.summary.scenarios.contingencia.npv)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-sand p-4 text-sm font-bold text-muted">Indicadores financieros pendientes.</p>
          )}
        </section>

        <section>
          <SectionTitle>Equipo y competencias verificables</SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.skills.map((s) => (
              <li key={s.skill} className="flex items-start gap-3 rounded-2xl border border-line p-3">
                <BadgeCheck className={`mt-0.5 h-5 w-5 shrink-0 ${s.evidence ? "text-brand-600" : "text-line"}`} />
                <div className="min-w-0">
                  <p className="font-extrabold">
                    {label(SKILLS, s.skill)} <span className="text-xs font-bold text-muted">· {SKILL_LEVELS[s.level]}</span>
                  </p>
                  <p className="truncate text-sm text-muted">
                    {label(EVIDENCE_TYPES, s.evidence_type)}: <Evidence entry={s} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line bg-paper px-6 py-3 text-xs text-muted print:bg-white sm:px-8">
        <span className="inline-flex items-center gap-2">
          <LogoMark className="h-5 w-5" /> Ficha estandarizada EmprendeRed
        </span>
        <span>{data.generatedAt}</span>
      </footer>
    </article>
  );
}

function Evidence({ entry }: { entry: SkillEntry }) {
  if (!entry.evidence) return <>pendiente</>;
  // Las referencias traen datos de contacto de terceros: no se publican en la ficha.
  if (entry.evidence_type === "referencia") return <>disponible a pedido</>;
  if (entry.evidence_type === "linkedin") {
    const href = /^https?:\/\//.test(entry.evidence) ? entry.evidence : `https://${entry.evidence}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-700 underline underline-offset-2">
        {entry.evidence.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    );
  }
  return <>{entry.evidence}</>;
}

function Pill({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "coral" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${tone === "coral" ? "bg-coral-500 text-white" : "bg-white/15"}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-coral-600">{children}</h2>;
}

function Block({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-2xl bg-paper p-4 print:border print:border-line">
      <p className="text-sm font-extrabold text-brand-700">{title}</p>
      <p className="mt-1 text-ink">{text || "—"}</p>
    </div>
  );
}

function Metric({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`tabular mt-1 text-2xl font-extrabold ${bad ? "text-coral-600" : "text-brand-600"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}
