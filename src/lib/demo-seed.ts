import "server-only";
import { DEMO_ENTREPRENEURS, DEMO_EVALUATORS, DEMO_PREFIX } from "./demo-data";
import { computeFinance, summarize } from "./finance";
import { topMatches, type NetworkProfile } from "./matching";
import { db } from "./supabase";

const iso = (d: Date) => d.toISOString();
const code = (anexo: number) => `${DEMO_PREFIX}${String(anexo).padStart(2, "0")}`;

/** Borra todo el set de demostración (cascada sobre perfiles, finanzas, eventos, etc.). */
export async function clearDemo() {
  const { error } = await db().from("participants").delete().like("code", `${DEMO_PREFIX}%`);
  if (error) throw new Error(error.message);
}

/** Carga (o recarga) los 17 perfiles de demostración. Todos con is_test = true. */
export async function seedDemo() {
  await clearDemo();
  const { data: network } = await db().from("network_profiles").select("*").eq("active", true);
  const now = Date.now();
  const events: Record<string, unknown>[] = [];
  const ev = (participant_id: string, module: string, type: string, at: Date, step: number | null = null, payload: unknown = null) =>
    events.push({ participant_id, module, type, step, payload, created_at: iso(at) });

  for (const [i, e] of DEMO_ENTREPRENEURS.entries()) {
    // Escalonados en los últimos días para que se vean como sesiones distintas.
    const t0 = new Date(now - (6 - i) * 86_400_000 - 3_600_000 * (i + 1));
    const { data: p, error } = await db()
      .from("participants")
      .insert({
        code: code(e.anexo),
        name: e.name,
        email: `anexo${e.anexo}@demo.emprendered.cl`,
        role: "emprendedor",
        consent: true,
        consent_at: iso(t0),
        is_test: true,
        created_at: iso(t0),
      })
      .select("id")
      .single();
    if (error || !p) throw new Error(error?.message ?? "participante");

    // Perfil
    const pEnd = new Date(t0.getTime() + e.durationS * 1000);
    await db().from("profiles").insert({
      participant_id: p.id,
      ...e.profile,
      started_at: iso(t0),
      completed_at: iso(pEnd),
      duration_s: e.durationS,
      completed: true,
      needed_help: e.neededHelp,
    });
    ev(p.id, "perfil", "start", t0);
    for (let s = 0; s < 5; s++) {
      const at = new Date(t0.getTime() + ((e.durationS * 1000) / 5) * s);
      ev(p.id, "perfil", "step_view", at, s);
      if (s < 4) ev(p.id, "perfil", "step_done", new Date(at.getTime() + 30_000), s);
    }
    ev(p.id, "perfil", "complete", pEnd);

    // Finanzas
    let tf = new Date(pEnd.getTime() + 120_000);
    if (e.finance) {
      const f = e.finance;
      const fEnd = new Date(tf.getTime() + f.durationS * 1000);
      await db().from("financial_models").insert({
        participant_id: p.id,
        inputs: f.inputs,
        results: f.completed ? summarize(computeFinance(f.inputs)) : null,
        started_at: iso(tf),
        completed_at: f.completed ? iso(fEnd) : null,
        duration_s: f.completed ? f.durationS : null,
        completed: f.completed,
        needed_help: f.completed ? f.neededHelp : null,
        help_opens: f.helpOpens,
        last_step: f.lastStep,
      });
      ev(p.id, "finanzas", "start", tf);
      const lastView = f.completed ? 5 : f.lastStep;
      for (let s = 0; s <= lastView; s++) {
        ev(p.id, "finanzas", "step_view", new Date(tf.getTime() + s * 60_000), s);
        if (s < lastView) ev(p.id, "finanzas", "step_done", new Date(tf.getTime() + s * 60_000 + 50_000), s);
      }
      for (let h = 0; h < f.helpOpens; h++) ev(p.id, "finanzas", "help_open", new Date(tf.getTime() + h * 40_000), Math.min(h, 4), { topic: "demo" });
      if (f.completed) ev(p.id, "finanzas", "complete", fEnd);
      tf = fEnd;
    }

    // Conexiones: se calculan con el mismo matching que ve el usuario.
    const matches = topMatches(
      { industry: e.profile.industry, stage: e.profile.stage, region: e.profile.region, seeking: e.profile.seeking, skills: e.profile.skills },
      (network ?? []) as NetworkProfile[],
    );
    const shown = [...matches.socio, ...matches.mentor, ...matches.inversionista];
    const tc = new Date(tf.getTime() + 300_000);
    await db()
      .from("match_suggestions")
      .insert(
        shown.map((m, j) => ({
          participant_id: p.id,
          network_profile_id: m.profile.id,
          kind: m.profile.kind,
          rank: (j % 3) + 1,
          score: m.score,
          reasons: m.parts,
          rating: e.ratings[j] ?? null,
          rated_at: e.ratings[j] ? iso(new Date(tc.getTime() + j * 20_000)) : null,
          created_at: iso(tc),
        })),
      );
    ev(p.id, "conexiones", "start", tc);
    if (e.feedback) {
      await db().from("platform_feedback").insert({
        participant_id: p.id,
        would_use: e.feedback.wouldUse,
        wtp_monthly: e.feedback.wtp,
        comment: e.feedback.comment,
        created_at: iso(new Date(tc.getTime() + 240_000)),
      });
      ev(p.id, "conexiones", "complete", new Date(tc.getTime() + 240_000));
    }

    // Pacto
    if (e.pact) {
      const tp = new Date(tc.getTime() + 600_000);
      const dur = 480 + i * 60;
      await db().from("pacts").insert({
        participant_id: p.id,
        data: e.pact.data,
        started_at: iso(tp),
        completed_at: e.pact.completed ? iso(new Date(tp.getTime() + dur * 1000)) : null,
        duration_s: e.pact.completed ? dur : null,
        completed: e.pact.completed,
        would_use: e.pact.wouldUse,
        last_step: e.pact.lastStep,
      });
      ev(p.id, "pacto", "start", tp);
      const lastView = e.pact.completed ? 5 : e.pact.lastStep;
      for (let s = 0; s <= lastView; s++) ev(p.id, "pacto", "step_view", new Date(tp.getTime() + s * 60_000), s);
      if (e.pact.completed) ev(p.id, "pacto", "complete", new Date(tp.getTime() + dur * 1000));
    }
  }

  for (const [i, v] of DEMO_EVALUATORS.entries()) {
    const t0 = new Date(now - (5 - (i % 5)) * 86_400_000 - 1_800_000 * (i + 1));
    const { data: p, error } = await db()
      .from("participants")
      .insert({
        code: code(v.anexo),
        name: v.name,
        email: `anexo${v.anexo}@demo.emprendered.cl`,
        role: "evaluador",
        consent: true,
        consent_at: iso(t0),
        is_test: true,
        created_at: iso(t0),
      })
      .select("id")
      .single();
    if (error || !p) throw new Error(error?.message ?? "evaluador");
    const answered = new Date(t0.getTime() + 150_000 + i * 10_000);
    const done = new Date(answered.getTime() + 90_000);
    await db().from("evaluations").insert({
      participant_id: p.id,
      variant: v.variant,
      evaluator_type: v.type,
      meeting_score: v.meetingScore,
      meeting_yes: v.meetingYes,
      defensibility: v.defensibility,
      would_receive: v.wouldReceive,
      comment: v.comment,
      saw_other: v.preferred !== null,
      preferred: v.preferred,
      preferred_why: v.preferredWhy,
      started_at: iso(t0),
      answered_at: iso(answered),
      completed_at: iso(done),
    });
    ev(p.id, "evaluar", "start", t0, null, { variant: v.variant });
    ev(p.id, "evaluar", "step_done", answered, 1);
    ev(p.id, "evaluar", "complete", done, null, { skipped: v.preferred === null });
  }

  for (let k = 0; k < events.length; k += 500) {
    const { error } = await db().from("events").insert(events.slice(k, k + 500));
    if (error) throw new Error(error.message);
  }
  return { emprendedores: DEMO_ENTREPRENEURS.length, evaluadores: DEMO_EVALUATORS.length, eventos: events.length };
}
