import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, participantAuth } from "./supabase";
import { setSession, type Role } from "./session";

type Mode = "signup" | "resume";
type Challenge = {
  email: string; role: Role; mode: Mode; name: string; isTest: boolean;
  verified: boolean; expires: number;
};
export type ProfileChoice = { id: string; title: string; createdAt: string; isTest: boolean };
export type EntryState = {
  stage: "request" | "verify" | "choose";
  email?: string;
  choices?: ProfileChoice[];
  error?: string;
  ok?: boolean;
  verified?: boolean;
} | null;

const TTL = 10 * 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const challengeCookie = (role: Role) => `er_email_${role}`;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

function signature(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta configurar el acceso por correo.");
  return createHmac("sha256", secret).update(`participant-otp-v1:${payload}`).digest("base64url");
}

async function saveChallenge(challenge: Challenge) {
  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  (await cookies()).set(challengeCookie(challenge.role), `${payload}.${signature(payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: TTL, path: "/",
  });
}

async function readChallenge(role: Role): Promise<Challenge | null> {
  const raw = (await cookies()).get(challengeCookie(role))?.value;
  if (!raw || !process.env.SESSION_SECRET) return null;
  try {
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = Buffer.from(signature(payload));
    const given = Buffer.from(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Challenge;
    if (c.role !== role || !Number.isFinite(c.expires) || c.expires <= Date.now()
      || typeof c.email !== "string" || !EMAIL_RE.test(c.email)
      || !["signup", "resume"].includes(c.mode) || typeof c.verified !== "boolean") return null;
    return c;
  } catch {
    return null;
  }
}

function configured() {
  return Boolean(process.env.SESSION_SECRET && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function requestParticipantOtp(input: { role: Role; mode: Mode; email: string; name: string; consent: boolean; isTest: boolean }): Promise<EntryState> {
  const email = normalizeEmail(input.email);
  if (!configured()) return { stage: "request", error: "El acceso por correo todavía no está configurado. Contacta al equipo." };
  if (!EMAIL_RE.test(email) || email.length > 254) return { stage: "request", error: "Escribe un correo válido." };
  if (input.mode === "signup" && (input.name.trim().length < 2 || !input.consent)) {
    return { stage: "request", error: "Escribe tu nombre y acepta el uso académico de tus respuestas." };
  }
  try {
    // Los registros antiguos de participants todavía no tienen un usuario en Auth.
    const { error } = await participantAuth().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return { stage: "request", error: "No pudimos enviar el código. Espera un momento e intenta nuevamente; si persiste, contacta al equipo." };
    await saveChallenge({
      email, role: input.role, mode: input.mode, name: input.name.trim().slice(0, 100),
      isTest: input.isTest, verified: false, expires: Date.now() + TTL * 1000,
    });
    return { stage: "verify", email };
  } catch {
    return { stage: "request", error: "No pudimos enviar el código. Intenta nuevamente más tarde." };
  }
}

export async function resendParticipantOtp(role: Role): Promise<EntryState> {
  const c = await readChallenge(role);
  if (!c || c.verified) return { stage: "request", error: "Solicita un nuevo código para continuar." };
  const result = await requestParticipantOtp({ ...c, consent: true });
  return result?.error ? { stage: "verify", email: c.email, error: result.error } : result;
}

async function candidates(c: Challenge) {
  const { data, error } = await db().from("participants")
    .select("id, name, created_at, is_test, profiles(project_name)")
    .eq("email", c.email).eq("role", c.role).order("created_at", { ascending: true });
  if (error) throw new Error("No pudimos consultar tus perfiles.");
  return (data ?? []).map((row): ProfileChoice => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.id, title: profile?.project_name || row.name, createdAt: row.created_at, isTest: Boolean(row.is_test) };
  });
}

async function finish(role: Role, id: string): Promise<EntryState> {
  await setSession(role, id);
  (await cookies()).delete(challengeCookie(role));
  return { stage: "request", ok: true };
}

export async function verifyParticipantOtp(role: Role, token: string): Promise<EntryState> {
  const c = await readChallenge(role);
  if (!c) return { stage: "request", error: "La solicitud venció. Pide otro código." };
  if (!c.verified) {
    if (!/^\d{6,10}$/.test(token.trim())) return { stage: "verify", email: c.email, error: "Escribe el código numérico que recibiste por correo." };
    try {
      const { data, error } = await participantAuth().auth.verifyOtp({ email: c.email, token: token.trim(), type: "email" });
      if (error || !data.user?.email_confirmed_at || normalizeEmail(data.user.email ?? "") !== c.email) {
        return { stage: "verify", email: c.email, error: "El código no es válido o ya venció. Revisa el correo o solicita otro." };
      }
    } catch {
      return { stage: "verify", email: c.email, error: "No pudimos verificar el código. Intenta nuevamente." };
    }
    c.verified = true;
    c.expires = Date.now() + TTL * 1000;
    // Si falla la base después, se puede reintentar sin reutilizar el OTP consumido.
    await saveChallenge(c);
  }
  try {
    const choices = await candidates(c);
    if (choices.length === 1) return finish(role, choices[0].id);
    if (choices.length > 1) return { stage: "choose", choices, email: c.email };
    if (c.mode === "resume") {
      (await cookies()).delete(challengeCookie(role));
      return { stage: "request", error: "No encontramos una participación de este rol con tu correo. Puedes registrarte en Primera vez." };
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = "ER-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
      const { data, error } = await db().from("participants").insert({
        code, email: c.email, name: c.name, role: c.role, is_test: c.isTest,
        consent: true, consent_at: new Date().toISOString(),
      }).select("id").single();
      if (!error && data) return finish(role, data.id);
      if (error?.code !== "23505") break;
    }
    return { stage: "verify", verified: true, email: c.email, error: "Tu correo está verificado, pero no pudimos crear el registro. Intenta continuar nuevamente." };
  } catch {
    return { stage: "verify", verified: true, email: c.email, error: "Tu correo está verificado, pero no pudimos cargar tu perfil. Intenta continuar nuevamente." };
  }
}

export async function selectVerifiedParticipant(role: Role, id: string): Promise<EntryState> {
  const c = await readChallenge(role);
  if (!c?.verified) return { stage: "request", error: "Verifica tu correo antes de elegir un perfil." };
  try {
    // Releer la pertenencia evita confiar en los IDs enviados por el formulario.
    const choices = await candidates(c);
    if (!choices.some((choice) => choice.id === id)) return { stage: "choose", choices, email: c.email, error: "Selecciona uno de tus perfiles de la lista." };
    return finish(role, id);
  } catch {
    return { stage: "verify", verified: true, email: c.email, error: "No pudimos cargar tus perfiles. Intenta continuar nuevamente." };
  }
}
