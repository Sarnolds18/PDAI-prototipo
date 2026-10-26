import "server-only";
import { topMatches, type NetworkProfile } from "./matching";
import { db } from "./supabase";

/** Calcula las sugerencias del participante leyendo su perfil y la red activa. */
export async function loadMatches(participantId: string) {
  const [{ data: profile }, { data: network }] = await Promise.all([
    db().from("profiles").select("industry, stage, region, seeking, skills, completed").eq("participant_id", participantId).maybeSingle(),
    db().from("network_profiles").select("*").eq("active", true),
  ]);
  if (!profile?.completed) return null;
  return topMatches(
    { industry: profile.industry, stage: profile.stage, region: profile.region, seeking: profile.seeking ?? [], skills: profile.skills ?? [] },
    (network ?? []) as NetworkProfile[],
  );
}
