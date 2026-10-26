import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "er_admin";

// El token depende de la contraseña: si se cambia ADMIN_PASSWORD, las sesiones viejas dejan de valer.
function token(): string | null {
  const secret = process.env.SESSION_SECRET;
  const pass = process.env.ADMIN_PASSWORD;
  if (!secret || !pass) return null;
  return createHmac("sha256", secret).update(`admin:${pass}`).digest("base64url");
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkPassword(input: string): boolean {
  const pass = process.env.ADMIN_PASSWORD;
  return Boolean(pass) && safeEqual(input, pass as string);
}

export async function setAdminCookie() {
  const t = token();
  if (!t) return;
  (await cookies()).set(COOKIE, t, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const t = token();
  const v = (await cookies()).get(COOKIE)?.value;
  return Boolean(t && v && safeEqual(v, t));
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
