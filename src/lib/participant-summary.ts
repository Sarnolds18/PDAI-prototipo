import "server-only";
import { requireParticipant } from "./session";
import { db } from "./supabase";
import { loadMatches } from "./connections";
import type { ProfileRow } from "./types";
import type { FinanceInputs, FinanceSummary } from "./finance";
import type { PactData } from "./pact";

export async function loadEntrepreneurSummary() {
  const participant = await requireParticipant("emprendedor");
  // La identidad viene exclusivamente de la cookie firmada, nunca de la URL.
  const results = await Promise.all([
    db().from("profiles").select("*").eq("participant_id", participant.id).maybeSingle(),
    db().from("financial_models").select("inputs, results, completed").eq("participant_id", participant.id).maybeSingle(),
    db().from("pacts").select("data, completed").eq("participant_id", participant.id).maybeSingle(),
    db().from("match_suggestions").select("network_profile_id, rating").eq("participant_id", participant.id),
    db().from("platform_feedback").select("participant_id").eq("participant_id", participant.id).maybeSingle(),
  ]);
  if (results.some((r) => r.error)) throw new Error("No pudimos cargar tu resumen. Intenta nuevamente.");
  const [profile, finance, pact, ratings, feedback] = results;
  return {
    participant,
    profile: profile.data as ProfileRow | null,
    finance: finance.data as { inputs: FinanceInputs; results: FinanceSummary | null; completed: boolean } | null,
    pact: pact.data as { data: PactData; completed: boolean } | null,
    ratings: (ratings.data ?? []) as { network_profile_id: string; rating: number | null }[],
    connectionsCompleted: Boolean(feedback.data),
    matches: await loadMatches(participant.id),
  };
}

export type EvaluationSummary = {
  variant: "A" | "B";
  evaluator_type: string | null;
  meeting_score: number | null;
  meeting_yes: boolean | null;
  defensibility: number | null;
  would_receive: boolean | null;
  comment: string | null;
  saw_other: boolean;
  preferred: "A" | "B" | null;
  preferred_why: string | null;
  answered_at: string | null;
  completed_at: string | null;
};

export async function loadEvaluatorSummary() {
  const participant = await requireParticipant("evaluador");
  const { data, error } = await db().from("evaluations")
    .select("variant, evaluator_type, meeting_score, meeting_yes, defensibility, would_receive, comment, saw_other, preferred, preferred_why, answered_at, completed_at")
    .eq("participant_id", participant.id).maybeSingle();
  if (error) throw new Error("No pudimos cargar tu evaluación. Intenta nuevamente.");
  return { participant, evaluation: data as EvaluationSummary | null };
}

export type EntrepreneurSummary = Awaited<ReturnType<typeof loadEntrepreneurSummary>>;
