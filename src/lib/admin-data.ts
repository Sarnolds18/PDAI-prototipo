import "server-only";
import { fetchAll, getSettings } from "./admin";
import { computeHypotheses, type Rows } from "./hypotheses";
import type { FinanceSummary } from "./finance";

type Participant = { id: string; code: string; name: string; email: string; role: string; is_test: boolean; created_at: string };
type EventRow = { participant_id: string | null; module: string; type: string; step: number | null; created_at: string };

export async function loadAdminData() {
  const [participants, profiles, finance, suggestions, feedback, evaluations, pacts, events, iterations, settings] = await Promise.all([
    fetchAll<Participant>("participants", "*"),
    fetchAll<Record<string, unknown>>("profiles", "*", "started_at"),
    fetchAll<Record<string, unknown>>("financial_models", "*", "started_at"),
    fetchAll<Record<string, unknown>>("match_suggestions", "*"),
    fetchAll<Record<string, unknown>>("platform_feedback", "*"),
    fetchAll<Record<string, unknown>>("evaluations", "*", "started_at"),
    fetchAll<Record<string, unknown>>("pacts", "*", "started_at"),
    fetchAll<EventRow>("events", "participant_id, module, type, step, created_at"),
    fetchAll<{ id: string; date: string; module: string; hypothesis: string | null; change: string; reason: string }>("iterations", "*", "date"),
    getSettings(),
  ]);

  const rows = { participants, profiles, finance, suggestions, feedback, evaluations, pacts } as unknown as Rows;
  const { results, extras } = computeHypotheses(rows, settings.min_n);

  const test = new Set(participants.filter((p) => p.is_test).map((p) => p.id));
  const real = <T extends Record<string, unknown>>(xs: T[]) => xs.filter((x) => !test.has(x.participant_id as string));
  const realParticipants = participants.filter((p) => !p.is_test);

  // Embudo: paso más avanzado que vio cada participante, por módulo.
  const funnel = (module: string, steps: string[]) => {
    const maxStep = new Map<string, number>();
    const completed = new Set<string>();
    for (const e of events) {
      if (!e.participant_id || test.has(e.participant_id) || e.module !== module) continue;
      if (e.type === "step_view" && e.step !== null) maxStep.set(e.participant_id, Math.max(maxStep.get(e.participant_id) ?? 0, e.step));
      if (e.type === "complete") completed.add(e.participant_id);
    }
    const reached = steps.map((label, i) => ({ label, n: [...maxStep.values()].filter((s) => s >= i).length }));
    const abandoned = steps.map((label, i) => ({
      label,
      n: [...maxStep.entries()].filter(([pid, s]) => s === i && !completed.has(pid)).length,
    }));
    return { reached, abandoned, completed: completed.size, started: maxStep.size };
  };

  const countBy = (xs: Record<string, unknown>[], key: string) => {
    const m = new Map<string, number>();
    for (const x of xs) {
      const vals = Array.isArray(x[key]) ? (x[key] as string[]) : [x[key] as string | null];
      for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const realProfiles = real(profiles);
  const helpOpens = real(finance).reduce((a, f) => a + Number(f.help_opens ?? 0), 0);

  return {
    settings,
    results,
    extras,
    participants,
    counts: {
      emprendedores: realParticipants.filter((p) => p.role === "emprendedor").length,
      evaluadores: realParticipants.filter((p) => p.role === "evaluador").length,
      test: test.size,
    },
    funnels: {
      perfil: funnel("perfil", ["Tú", "Proyecto", "Competencias", "Descripción", "Cierre"]),
      finanzas: funnel("finanzas", ["Inversión", "Ventas", "Costos", "Impuestos", "Escenarios", "Resultados"]),
    },
    helpOpens,
    segments: {
      obstacle: countBy(realProfiles, "main_obstacle"),
      stage: countBy(realProfiles, "stage"),
      industry: countBy(realProfiles, "industry"),
      age: countBy(realProfiles, "age_range"),
      region: countBy(realProfiles, "region"),
      wtp: countBy(real(feedback), "wtp_monthly"),
      evaluatorType: countBy(real(evaluations), "evaluator_type"),
    },
    comments: [
      ...real(evaluations)
        .filter((e) => e.comment || e.preferred_why)
        .map((e) => ({
          who: `Evaluador · vio versión ${e.variant}`,
          text: [e.comment, e.preferred_why ? `Prefirió ${e.preferred === "B" ? "la ficha" : "el mensaje"}: ${e.preferred_why}` : null].filter(Boolean).join(" — "),
        })),
      ...real(feedback)
        .filter((f) => f.comment)
        .map((f) => ({ who: `Emprendedor · ${f.would_use ? "sí" : "no"} la usaría`, text: String(f.comment) })),
    ],
    iterations,
    raw: { participants, profiles, finance, suggestions, feedback, evaluations, pacts, events },
  };
}

export type AdminData = Awaited<ReturnType<typeof loadAdminData>>;

/** Aplana las columnas útiles de cada tabla para el CSV. */
export function flattenFinance(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const s = r.results as FinanceSummary | null;
    const base = s?.scenarios.base;
    const { results: _results, inputs, ...rest } = r;
    void _results;
    return {
      ...rest,
      ...Object.fromEntries(Object.entries((inputs as Record<string, unknown>) ?? {}).map(([k, v]) => [`in_${k}`, v])),
      van_base: base?.npv ?? null,
      tir_base: base?.irr ?? null,
      recuperacion_mes: base?.payback_month ?? null,
      equilibrio_unidades: s?.break_even_units ?? null,
      van_pesimista: s?.scenarios.pesimista.npv ?? null,
      van_optimista: s?.scenarios.optimista.npv ?? null,
      van_contingencia: s?.scenarios.contingencia.npv ?? null,
    };
  });
}
