"use server";

import { requireParticipant, type Role } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { EventType, ModuleName } from "@/lib/types";

const ROLE_BY_MODULE: Record<ModuleName, Role> = {
  perfil: "emprendedor",
  finanzas: "emprendedor",
  conexiones: "emprendedor",
  pacto: "emprendedor",
  evaluar: "evaluador",
};

/** Registra un evento de uso (embudo, ayudas, abandono). Nunca rompe la UI si falla. */
export async function trackEvent(module: ModuleName, type: EventType, step?: number, payload?: Record<string, unknown>) {
  try {
    const p = await requireParticipant(ROLE_BY_MODULE[module]);
    await db().from("events").insert({ participant_id: p.id, module, type, step: step ?? null, payload: payload ?? null });
  } catch (e) {
    console.error("trackEvent", e);
  }
}
