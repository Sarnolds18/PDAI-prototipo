import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { isAdmin } from "./admin";
import { db } from "./supabase";
import { setSession, type Role } from "./session";
import type { EntryState } from "./participant-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERNAL_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PREFIX = "participant_recovery:";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function registerParticipant(input: { role: Role; email: string; name: string; consent: boolean; isTest: boolean }): Promise<EntryState> {
  const email = input.email.trim().toLowerCase();
  if (!process.env.SESSION_SECRET) return { stage: "request", error: "El acceso todavía no está configurado. Contacta al equipo." };
  if (!EMAIL_RE.test(email) || email.length > 254 || input.name.trim().length < 2 || !input.consent) {
    return { stage: "request", error: "Completa tu nombre, un correo válido y el consentimiento." };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = "ER-" + Array.from({ length: 4 }, () => INTERNAL_ALPHABET[randomInt(INTERNAL_ALPHABET.length)]).join("");
    const { data, error } = await db().from("participants").insert({
      code, email, name: input.name.trim().slice(0, 100), role: input.role, is_test: input.isTest,
      consent: true, consent_at: new Date().toISOString(),
    }).select("id").single();
    if (!error && data) {
      // Solo abre el registro nuevo; escribir un correo ajeno no permite recuperar sus datos.
      await setSession(input.role, data.id);
      return { stage: "request", ok: true };
    }
    if (error?.code !== "23505") break;
  }
  return { stage: "request", error: "No pudimos guardar tu registro. Intenta nuevamente." };
}

export type RecoveryCodeState = { token?: string; expiresAt?: string; error?: string } | null;

export async function generateRecoveryCode(participantId: string, confirmed: boolean): Promise<RecoveryCodeState> {
  if (!(await isAdmin())) throw new Error("No autorizado");
  if (!confirmed) return { error: "Confirma que verificaste a quién pertenece el perfil." };
  const { data: participant, error } = await db().from("participants").select("id").eq("id", participantId).maybeSingle();
  if (error || !participant) return { error: "No encontramos el participante." };
  const token = `REC-${randomBytes(12).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  // settings ya tiene RLS y no tiene políticas públicas. Una fila por persona invalida el código anterior.
  const { error: saveError } = await db().from("settings").upsert({
    key: `${PREFIX}${participant.id}`,
    value: { participant_id: participant.id, token_hash: digest(token), expires_at: expiresAt },
  });
  if (saveError) return { error: "No pudimos generar el código. Intenta nuevamente." };
  return { token, expiresAt };
}

export async function recoverParticipant(role: Role, rawEmail: string, rawToken: string): Promise<EntryState> {
  const failure: EntryState = { stage: "request", error: "El correo o código no coincide, ya fue utilizado o venció. Contacta al equipo si necesitas otro." };
  if (!process.env.SESSION_SECRET) return failure;
  const email = rawEmail.trim().toLowerCase();
  const token = rawToken.trim().toUpperCase();
  if (!EMAIL_RE.test(email) || !/^REC-[A-F0-9]{24}$/.test(token)) return failure;
  const tokenHash = digest(token);
  const { data: recovery, error } = await db().from("settings").select("key, value")
    .like("key", `${PREFIX}%`).eq("value->>token_hash", tokenHash).maybeSingle();
  if (error || !recovery) return failure;
  const value = recovery.value as { participant_id: string; expires_at: string };
  const expiry = Date.parse(value.expires_at);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return failure;
  const { data: participant, error: participantError } = await db().from("participants").select("id")
    .eq("id", value.participant_id).eq("email", email).eq("role", role).maybeSingle();
  if (participantError || !participant) return failure;
  // DELETE con hash en el filtro es atómico: un segundo uso o una renovación concurrente no puede ganar.
  const { data: consumed, error: consumeError } = await db().from("settings").delete()
    .eq("key", recovery.key).eq("value->>token_hash", tokenHash).select("key").maybeSingle();
  if (consumeError || !consumed) return failure;
  await setSession(role, participant.id);
  return { stage: "request", ok: true };
}
