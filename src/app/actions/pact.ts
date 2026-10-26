"use server";

import { DECISION_RULES, DEFAULT_PACT, LEAVE_RULES, PACT_ROLES, type PactData, type Partner } from "@/lib/pact";
import { requireParticipant } from "@/lib/session";
import { db } from "@/lib/supabase";

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function clean(d: Partial<PactData>): PactData {
  const partner = (p: Partial<Partner> | undefined): Partner => ({
    name: str(p?.name, 80),
    role: p?.role && p.role in PACT_ROLES ? p.role : "",
    capital: num(p?.capital, 0, 1e11, 0),
    contribution: str(p?.contribution, 300),
    dedication: num(p?.dedication, 0, 100, 100),
    equity: num(p?.equity, 0, 100, 50),
  });
  return {
    projectName: str(d.projectName, 80),
    partners: [partner(d.partners?.[0]), partner(d.partners?.[1])],
    pool: num(d.pool, 0, 50, 0),
    vestingYears: num(d.vestingYears, 0, 6, DEFAULT_PACT.vestingYears),
    cliffMonths: num(d.cliffMonths, 0, 24, DEFAULT_PACT.cliffMonths),
    decisions: d.decisions && d.decisions in DECISION_RULES ? d.decisions : "",
    leaveRules: Array.isArray(d.leaveRules) ? d.leaveRules.filter((r) => r in LEAVE_RULES) : [],
    reviewMonths: num(d.reviewMonths, 1, 24, DEFAULT_PACT.reviewMonths),
  };
}

export async function startPact() {
  const p = await requireParticipant("emprendedor");
  const { data } = await db().from("pacts").select("id").eq("participant_id", p.id).maybeSingle();
  if (data) return;
  const { error } = await db().from("pacts").insert({ participant_id: p.id, data: DEFAULT_PACT });
  if (!error) await db().from("events").insert({ participant_id: p.id, module: "pacto", type: "start" });
}

export async function savePactStep(step: number, data: Partial<PactData>) {
  const p = await requireParticipant("emprendedor");
  const { data: row } = await db().from("pacts").select("last_step").eq("participant_id", p.id).single();
  const { error } = await db()
    .from("pacts")
    .update({ data: clean(data), last_step: Math.max(row?.last_step ?? 0, step + 1), updated_at: new Date().toISOString() })
    .eq("participant_id", p.id);
  if (error) return { error: "No pudimos guardar. Revisa tu conexión." };
  await db().from("events").insert({ participant_id: p.id, module: "pacto", type: "step_done", step });
  return { ok: true };
}

export async function completePact(data: Partial<PactData>, wouldUse: boolean) {
  const p = await requireParticipant("emprendedor");
  const { data: row } = await db().from("pacts").select("id, started_at, completed, duration_s").eq("participant_id", p.id).single();
  if (!row) return { error: "No encontramos el pacto." };
  const now = new Date();
  const duration_s = row.completed ? row.duration_s : Math.round((now.getTime() - new Date(row.started_at).getTime()) / 1000);
  const { error } = await db()
    .from("pacts")
    .update({
      data: clean(data),
      would_use: Boolean(wouldUse),
      ...(row.completed ? {} : { completed: true, completed_at: now.toISOString(), duration_s }),
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
  if (error) return { error: "No pudimos guardar." };
  if (!row.completed) await db().from("events").insert({ participant_id: p.id, module: "pacto", type: "complete" });
  return { ok: true };
}
