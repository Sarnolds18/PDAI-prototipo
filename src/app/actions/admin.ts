"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin";
import { db } from "@/lib/supabase";

export type AdminState = { error?: string; ok?: boolean } | null;

async function guard() {
  if (!(await isAdmin())) throw new Error("No autorizado");
}

export async function adminLogin(_prev: AdminState, form: FormData): Promise<AdminState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "Falta ADMIN_PASSWORD en las variables de entorno." };
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Contraseña incorrecta." };
  await setAdminCookie();
  return { ok: true };
}

export async function adminLogout() {
  await clearAdminCookie();
}

export async function setTestFlag(participantId: string, isTest: boolean) {
  await guard();
  await db().from("participants").update({ is_test: isTest }).eq("id", participantId);
  revalidatePath("/admin");
}

export async function addIteration(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard();
  const change = String(form.get("change") ?? "").trim();
  const reason = String(form.get("reason") ?? "").trim();
  const mod = String(form.get("module") ?? "").trim();
  if (!change || !reason || !mod) return { error: "Completa módulo, cambio y motivo." };
  const { error } = await db()
    .from("iterations")
    .insert({
      module: mod,
      change: change.slice(0, 500),
      reason: reason.slice(0, 500),
      hypothesis: String(form.get("hypothesis") ?? "") || null,
      date: String(form.get("date") ?? "") || undefined,
    });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteIteration(id: string) {
  await guard();
  await db().from("iterations").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function saveSettings(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard();
  const n = (k: string, min: number) => Math.max(min, Math.min(500, Math.round(Number(form.get(k)) || 0)));
  const target = { emprendedores: n("target_emprendedores", 1), evaluadores: n("target_evaluadores", 1) };
  await db()
    .from("settings")
    .upsert([
      { key: "target_n", value: target },
      { key: "min_n", value: n("min_n", 1) },
    ]);
  revalidatePath("/admin");
  return { ok: true };
}
