import { getParticipant, type Role } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { EventType, ModuleName } from "@/lib/types";

// Eventos de medición (embudo, ayudas). Van por un route handler y no por server actions:
// las server actions se ejecutan en cola, y un evento lento no debe bloquear un guardado.

const ROLE_BY_MODULE: Record<ModuleName, Role> = {
  perfil: "emprendedor",
  finanzas: "emprendedor",
  conexiones: "emprendedor",
  pacto: "emprendedor",
  evaluar: "evaluador",
};
const TYPES: EventType[] = ["step_view", "help_open"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mod = body?.module as ModuleName;
    const type = body?.type as EventType;
    if (!(mod in ROLE_BY_MODULE) || !TYPES.includes(type)) return new Response(null, { status: 400 });

    const p = await getParticipant(ROLE_BY_MODULE[mod]);
    if (!p) return new Response(null, { status: 401 });

    const step = Number.isInteger(body.step) ? body.step : null;
    const payload = body.payload && typeof body.payload === "object" ? body.payload : null;
    await db().from("events").insert({ participant_id: p.id, module: mod, type, step, payload });

    if (type === "help_open" && mod === "finanzas") {
      const { data } = await db().from("financial_models").select("help_opens").eq("participant_id", p.id).maybeSingle();
      if (data) await db().from("financial_models").update({ help_opens: (data.help_opens ?? 0) + 1 }).eq("participant_id", p.id);
    }
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("track", e);
    return new Response(null, { status: 500 });
  }
}
