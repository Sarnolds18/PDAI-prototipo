import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "er_admin";

// Lista cerrada del equipo. No se usa el correo declarado por participantes.
const TEAM_EMAILS = new Set(["sarnolds@miuandes.cl", "admin@example.cl"]);
const MAX_AGE = 60 * 60 * 12;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const adminPassword = () => process.env.ADMIN_PASSWORD?.trim() ?? "";
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

function signature(payload: string): string | null {
  const secret = process.env.SESSION_SECRET;
  const pass = adminPassword();
  if (!secret || !pass) return null;
  return createHmac("sha256", secret).update(JSON.stringify(["team-v1", pass, payload])).digest("base64url");
}

export function checkTeamCredentials(email: string, password: string): boolean {
  const pass = adminPassword();
  return TEAM_EMAILS.has(normalizeEmail(email)) && pass.length > 0 && safeEqual(password.trim(), pass);
}

export async function setAdminCookie(email: string) {
  const normalized = normalizeEmail(email);
  if (!TEAM_EMAILS.has(normalized)) throw new Error("No autorizado");
  const payload = Buffer.from(JSON.stringify({ email: normalized, expires: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const sig = signature(payload);
  if (!sig) throw new Error("Acceso del equipo sin configurar");
  (await cookies()).set(COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = signature(payload);
  if (!expected || !safeEqual(sig, expected)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof session.email === "string" && TEAM_EMAILS.has(session.email)
      && typeof session.expires === "number" && session.expires > Date.now();
  } catch {
    return false;
  }
}

/** Lee todas las filas de una tabla en páginas de 1000 (límite por defecto de Supabase). */
export async function fetchAll<T>(table: string, select = "*", order = "created_at"): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from(table)
      .select(select)
      .order(order, { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

export type Settings = { target_n: { emprendedores: number; evaluadores: number }; min_n: number };

export async function getSettings(): Promise<Settings> {
  const { data } = await db().from("settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    target_n: { emprendedores: 10, evaluadores: 10, ...(map.target_n ?? {}) },
    min_n: Number(map.min_n ?? 5),
  };
}
