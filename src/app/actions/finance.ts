"use server";

import { computeFinance, DEFAULT_INPUTS, summarize, type FinanceInputs } from "@/lib/finance";
import { requireParticipant } from "@/lib/session";
import { db } from "@/lib/supabase";

const LIMITS: Record<keyof FinanceInputs, [number, number]> = {
  investment: [0, 1e11],
  price: [0, 1e10],
  units: [0, 1e8],
  growth: [-0.5, 1],
  variableCost: [0, 1e10],
  fixedCosts: [0, 1e10],
  taxRate: [0, 0.6],
  discountRate: [0, 1],
  pessimistic: [-0.9, 0],
  optimistic: [0, 3],
  paymentDelayDays: [0, 180],
};

function clean(inp: Partial<FinanceInputs>): FinanceInputs {
  const out = { ...DEFAULT_INPUTS };
  for (const k of Object.keys(LIMITS) as (keyof FinanceInputs)[]) {
    const v = Number(inp[k]);
    if (Number.isFinite(v)) out[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], v));
  }
  return out;
}

/** Crea la fila al entrar: aquí parte el cronómetro. */
export async function startFinance() {
  const p = await requireParticipant("emprendedor");
  const { data } = await db().from("financial_models").select("id").eq("participant_id", p.id).maybeSingle();
  if (data) return;
  const { error } = await db().from("financial_models").insert({ participant_id: p.id, inputs: DEFAULT_INPUTS });
  if (!error) await db().from("events").insert({ participant_id: p.id, module: "finanzas", type: "start" });
}

export async function saveFinanceStep(step: number, inputs: Partial<FinanceInputs>) {
  const p = await requireParticipant("emprendedor");
  const { data: row } = await db().from("financial_models").select("last_step").eq("participant_id", p.id).single();
  const { error } = await db()
    .from("financial_models")
    .update({ inputs: clean(inputs), last_step: Math.max(row?.last_step ?? 0, step + 1), updated_at: new Date().toISOString() })
    .eq("participant_id", p.id);
  if (error) return { error: "No pudimos guardar. Revisa tu conexión." };
  await db().from("events").insert({ participant_id: p.id, module: "finanzas", type: "step_done", step });
  return { ok: true };
}

export async function completeFinance(inputs: Partial<FinanceInputs>, neededHelp: boolean) {
  const p = await requireParticipant("emprendedor");
  const { data: row } = await db()
    .from("financial_models")
    .select("id, started_at, completed, duration_s")
    .eq("participant_id", p.id)
    .single();
  if (!row) return { error: "No encontramos tu plantilla." };

  const clean_ = clean(inputs);
  if (clean_.price <= 0 || clean_.units <= 0) return { error: "Falta el precio o las unidades." };
  // Se recalcula en el servidor: lo que se guarda no depende del navegador.
  const results = summarize(computeFinance(clean_));
  const now = new Date();
  const duration_s = row.completed ? row.duration_s : Math.round((now.getTime() - new Date(row.started_at).getTime()) / 1000);

  const { error } = await db()
    .from("financial_models")
    .update({
      inputs: clean_,
      results,
      ...(row.completed ? {} : { completed: true, completed_at: now.toISOString(), duration_s, needed_help: neededHelp }),
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  if (!row.completed) await db().from("events").insert({ participant_id: p.id, module: "finanzas", type: "complete" });

  const { data: profile } = await db().from("profiles").select("id").eq("participant_id", p.id).maybeSingle();
  return { ok: true, duration_s: duration_s ?? 0, profileId: (profile?.id as string | undefined) ?? null };
}
