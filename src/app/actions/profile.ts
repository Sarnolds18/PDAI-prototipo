"use server";

import { AGE_RANGES, EVIDENCE_TYPES, INDUSTRIES, OBSTACLES, REGIONS, SEEKING, SKILLS, STAGES } from "@/lib/catalog";
import { requireParticipant } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { ProfileData, SkillEntry } from "@/lib/types";

const MAX_TEXT = 400;
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_TEXT) : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[] | Record<T, unknown>) => {
  const list = (Array.isArray(allowed) ? allowed : Object.keys(allowed)) as readonly string[];
  return typeof v === "string" && list.includes(v) ? (v as T) : null;
};

function cleanSkills(v: unknown): SkillEntry[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SkillEntry[] = [];
  for (const s of v) {
    const skill = oneOf(s?.skill, SKILLS);
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    const level = [1, 2, 3].includes(s?.level) ? (s.level as 1 | 2 | 3) : 2;
    out.push({
      skill,
      level,
      evidence_type: oneOf(s?.evidence_type, EVIDENCE_TYPES) ?? "linkedin",
      evidence: text(s?.evidence) ?? "",
    });
  }
  return out.slice(0, 6);
}

/** Normaliza solo los campos presentes: el wizard guarda paso a paso. */
function clean(partial: Partial<ProfileData>) {
  const out: Record<string, unknown> = {};
  if ("age_range" in partial) out.age_range = oneOf(partial.age_range, AGE_RANGES);
  if ("region" in partial) out.region = oneOf(partial.region, REGIONS);
  if ("industry" in partial) out.industry = oneOf(partial.industry, INDUSTRIES);
  if ("stage" in partial) out.stage = oneOf(partial.stage, STAGES);
  if ("seeking" in partial)
    out.seeking = Array.isArray(partial.seeking) ? partial.seeking.filter((s) => s in SEEKING) : [];
  if ("skills" in partial) out.skills = cleanSkills(partial.skills);
  for (const k of ["project_name", "problem", "solution", "customer", "traction"] as const) {
    if (k in partial) out[k] = text(partial[k]);
  }
  if ("main_obstacle" in partial) out.main_obstacle = oneOf(partial.main_obstacle, OBSTACLES);
  return out;
}

/** Crea la fila al entrar al wizard: aquí parte el cronómetro (started_at). No reinicia si ya existe. */
export async function startProfile() {
  const p = await requireParticipant("emprendedor");
  const { data: existing } = await db().from("profiles").select("id").eq("participant_id", p.id).maybeSingle();
  if (existing) return;
  const { error } = await db().from("profiles").insert({ participant_id: p.id });
  if (!error) await db().from("events").insert({ participant_id: p.id, module: "perfil", type: "start" });
}

export async function saveProfileStep(step: number, partial: Partial<ProfileData>) {
  const p = await requireParticipant("emprendedor");
  const { error } = await db()
    .from("profiles")
    .update({ ...clean(partial), updated_at: new Date().toISOString() })
    .eq("participant_id", p.id);
  if (error) {
    console.error("saveProfileStep", error);
    return { error: "No pudimos guardar. Revisa tu conexión e intenta de nuevo." };
  }
  await db().from("events").insert({ participant_id: p.id, module: "perfil", type: "step_done", step });
  return { ok: true };
}

export async function completeProfile(input: { main_obstacle: string | null; needed_help: boolean }) {
  const p = await requireParticipant("emprendedor");
  const { data: row } = await db()
    .from("profiles")
    .select("id, started_at, completed, duration_s, skills, problem, solution, industry, stage")
    .eq("participant_id", p.id)
    .single();
  if (!row) return { error: "No encontramos tu perfil." };

  const missing = [];
  if (!row.industry || !row.stage) missing.push("proyecto");
  if (!Array.isArray(row.skills) || row.skills.length === 0 || row.skills.some((s: SkillEntry) => !s.evidence))
    missing.push("competencias con evidencia");
  if (!row.problem || !row.solution) missing.push("descripción");
  if (missing.length) return { error: `Falta completar: ${missing.join(", ")}.` };

  // Si ya estaba completo (volvió a editar), se conserva la primera medición de tiempo.
  const now = new Date();
  const duration_s = row.completed ? row.duration_s : Math.round((now.getTime() - new Date(row.started_at).getTime()) / 1000);
  const { error } = await db()
    .from("profiles")
    .update({
      main_obstacle: oneOf(input.main_obstacle, OBSTACLES),
      ...(row.completed ? {} : { needed_help: Boolean(input.needed_help), completed: true, completed_at: now.toISOString(), duration_s }),
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  if (!row.completed) await db().from("events").insert({ participant_id: p.id, module: "perfil", type: "complete" });
  return { ok: true, duration_s: duration_s ?? 0, profileId: row.id as string };
}
