import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

export type Role = "emprendedor" | "evaluador";

export type Participant = {
  id: string;
  code: string;
  name: string;
  email: string;
  role: Role;
  is_test: boolean;
};

// Una cookie por rol: la misma persona puede probar /perfil y /evaluar sin pisarse.
const cookieName = (role: Role) => `er_${role}`;
const MAX_AGE = 60 * 60 * 24 * 90;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return s;
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

function verify(value: string): string | null {
  const [id, sig] = value.split(".");
  if (!id || !sig) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

export async function setSession(role: Role, participantId: string) {
  (await cookies()).set(cookieName(role), `${participantId}.${sign(participantId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession(role: Role) {
  (await cookies()).delete(cookieName(role));
}

/** Lee el participante de la cookie. Usa cookies(): llamarlo dentro de un <Suspense>. */
export async function getParticipant(role: Role): Promise<Participant | null> {
  const raw = (await cookies()).get(cookieName(role))?.value;
  if (!raw) return null;
  const id = verify(raw);
  if (!id) return null;
  const { data } = await db()
    .from("participants")
    .select("id, code, name, email, role, is_test")
    .eq("id", id)
    .eq("role", role)
    .maybeSingle();
  return (data as Participant | null) ?? null;
}

export async function requireParticipant(role: Role): Promise<Participant> {
  const p = await getParticipant(role);
  if (!p) throw new Error("Sesión no encontrada. Vuelve a ingresar.");
  return p;
}
