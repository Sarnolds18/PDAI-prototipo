"use server";

import { randomInt } from "node:crypto";
import { EVALUATOR_TYPES } from "@/lib/catalog";
import { requireParticipant } from "@/lib/session";
import { db } from "@/lib/supabase";

export type Variant = "A" | "B";

/**
 * Asigna una versión al evaluador (una sola vez). Balanceado: la versión con menos evaluaciones reales;
 * en empate, al azar. Las sesiones demo no cuentan para el balance.
 */
export async function startEvaluation(): Promise<{ variant: Variant; answered: boolean; completed: boolean }> {
  const p = await requireParticipant("evaluador");
  const { data: existing } = await db()
    .from("evaluations")
    .select("variant, answered_at, completed_at")
    .eq("participant_id", p.id)
    .maybeSingle();
  if (existing) return { variant: existing.variant, answered: Boolean(existing.answered_at), completed: Boolean(existing.completed_at) };

  const { data: rows } = await db().from("evaluations").select("variant, participants!inner(is_test)").eq("participants.is_test", false);
  const countA = (rows ?? []).filter((r) => r.variant === "A").length;
  const countB = (rows ?? []).length - countA;
  const variant: Variant = countA === countB ? (randomInt(2) === 0 ? "A" : "B") : countA < countB ? "A" : "B";

  const { error } = await db().from("evaluations").insert({ participant_id: p.id, variant });
  if (error) {
    // Doble clic / dos pestañas: la fila ya existe, se usa esa.
    const { data } = await db().from("evaluations").select("variant").eq("participant_id", p.id).single();
    return { variant: data?.variant ?? variant, answered: false, completed: false };
  }
  await db().from("events").insert({ participant_id: p.id, module: "evaluar", type: "start", payload: { variant } });
  return { variant, answered: false, completed: false };
}

const scale = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null);

export async function submitEvaluation(input: {
  evaluatorType: string | null;
  meetingScore: number | null;
  meetingYes: boolean | null;
  defensibility: number | null;
  wouldReceive: boolean | null;
  comment: string;
}) {
  const p = await requireParticipant("evaluador");
  const meeting_score = scale(input.meetingScore);
  const defensibility = scale(input.defensibility);
  if (!meeting_score || !defensibility || input.meetingYes === null || input.wouldReceive === null) {
    return { error: "Responde todas las preguntas." };
  }
  const { error } = await db()
    .from("evaluations")
    .update({
      evaluator_type: input.evaluatorType && input.evaluatorType in EVALUATOR_TYPES ? input.evaluatorType : null,
      meeting_score,
      meeting_yes: input.meetingYes,
      defensibility,
      would_receive: input.wouldReceive,
      comment: input.comment.trim().slice(0, 800) || null,
      answered_at: new Date().toISOString(),
    })
    .eq("participant_id", p.id)
    .is("answered_at", null); // la primera respuesta (sin haber visto la otra versión) no se sobrescribe
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  await db().from("events").insert({ participant_id: p.id, module: "evaluar", type: "step_done", step: 1 });
  return { ok: true };
}

export async function submitPreference(input: { preferred: Variant | null; why: string; skipped: boolean }) {
  const p = await requireParticipant("evaluador");
  const preferred = input.preferred === "A" || input.preferred === "B" ? input.preferred : null;
  if (!input.skipped && !preferred) return { error: "Elige una versión." };
  const { error } = await db()
    .from("evaluations")
    .update({
      saw_other: !input.skipped,
      preferred: input.skipped ? null : preferred,
      preferred_why: input.skipped ? null : input.why.trim().slice(0, 600) || null,
      completed_at: new Date().toISOString(),
    })
    .eq("participant_id", p.id)
    .not("answered_at", "is", null);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  await db().from("events").insert({ participant_id: p.id, module: "evaluar", type: "complete", payload: { skipped: input.skipped } });
  return { ok: true };
}
