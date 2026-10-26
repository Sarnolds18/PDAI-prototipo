"use server";

import { WTP_RANGES } from "@/lib/catalog";
import { loadMatches } from "@/lib/connections";
import { requireParticipant } from "@/lib/session";
import { db } from "@/lib/supabase";

/** Guarda lo que se le mostró (puntaje y motivos), sin tocar calificaciones previas. */
export async function recordSuggestions() {
  const p = await requireParticipant("emprendedor");
  const matches = await loadMatches(p.id);
  if (!matches) return;
  const rows = Object.values(matches).flatMap((list) =>
    list.map((m, i) => ({
      participant_id: p.id,
      network_profile_id: m.profile.id,
      kind: m.profile.kind,
      rank: i + 1,
      score: m.score,
      reasons: m.parts,
    })),
  );
  const { data: existing } = await db().from("match_suggestions").select("network_profile_id").eq("participant_id", p.id);
  const seen = new Set((existing ?? []).map((r) => r.network_profile_id));
  const fresh = rows.filter((r) => !seen.has(r.network_profile_id));
  if (fresh.length) await db().from("match_suggestions").insert(fresh);
  if (!existing?.length) await db().from("events").insert({ participant_id: p.id, module: "conexiones", type: "start" });
}

export async function rateSuggestion(networkProfileId: string, rating: number) {
  const p = await requireParticipant("emprendedor");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Calificación inválida." };
  const update = () =>
    db()
      .from("match_suggestions")
      .update({ rating, rated_at: new Date().toISOString() }, { count: "exact" })
      .eq("participant_id", p.id)
      .eq("network_profile_id", networkProfileId);
  let { error, count } = await update();
  // Si calificó antes de que terminara de registrarse lo mostrado, se registra y se reintenta.
  if (!error && !count) {
    await recordSuggestions();
    ({ error, count } = await update());
  }
  if (error || !count) return { error: "No pudimos guardar la calificación." };
  return { ok: true };
}

export async function submitPlatformFeedback(input: { wouldUse: boolean; wtp: string | null; comment: string }) {
  const p = await requireParticipant("emprendedor");
  const wtp = input.wtp && input.wtp in WTP_RANGES ? input.wtp : null;
  const { error } = await db()
    .from("platform_feedback")
    .upsert({ participant_id: p.id, would_use: Boolean(input.wouldUse), wtp_monthly: wtp, comment: input.comment.trim().slice(0, 600) || null });
  if (error) return { error: "No pudimos guardar tu respuesta." };
  await db().from("events").insert({ participant_id: p.id, module: "conexiones", type: "complete" });
  return { ok: true };
}
