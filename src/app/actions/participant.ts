"use server";

import { randomInt } from "node:crypto";
import { db } from "@/lib/supabase";
import { clearSession, setSession, type Role } from "@/lib/session";

export type EntryState = { error?: string; code?: string } | null;

// Sin 0/O ni 1/I para que el código se pueda dictar sin errores.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () =>
  "ER-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRole(v: FormDataEntryValue | null): Role {
  return v === "evaluador" ? "evaluador" : "emprendedor";
}

export async function startParticipant(_prev: EntryState, form: FormData): Promise<EntryState> {
  const role = parseRole(form.get("role"));
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const consent = form.get("consent") === "on";
  const isTest = form.get("demo") === "1";

  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Revisa tu email." };
  if (!consent) return { error: "Necesitamos tu consentimiento para continuar." };

  // Reintenta si el código aleatorio ya existe (unique en la tabla).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { data, error } = await db()
      .from("participants")
      .insert({ code, name, email, role, consent, consent_at: new Date().toISOString(), is_test: isTest })
      .select("id, code")
      .single();
    if (!error && data) {
      await setSession(role, data.id);
      return { code: data.code };
    }
    if (error && error.code !== "23505") {
      console.error("startParticipant", error);
      return { error: "No pudimos guardar tus datos. Intenta de nuevo." };
    }
  }
  return { error: "No pudimos generar tu código. Intenta de nuevo." };
}

export async function resumeParticipant(_prev: EntryState, form: FormData): Promise<EntryState> {
  const role = parseRole(form.get("role"));
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/^ER-?/, "ER-");
  const { data } = await db()
    .from("participants")
    .select("id, code")
    .eq("code", code)
    .eq("role", role)
    .maybeSingle();
  if (!data) return { error: "No encontramos ese código." };
  await setSession(role, data.id);
  return { code: data.code };
}

export async function leaveParticipant(role: Role) {
  await clearSession(role);
}
