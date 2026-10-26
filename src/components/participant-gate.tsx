import type { ReactNode } from "react";
import { connection } from "next/server";
import { getParticipant, type Participant, type Role } from "@/lib/session";
import { isDbConfigured, missingEnv } from "@/lib/supabase";
import { EntryForm } from "./entry-form";
import { LeaveButton } from "./leave-button";
import { Badge, Card } from "./ui";

/**
 * Muestra el formulario de ingreso si no hay sesión para el rol; si la hay, renderiza el módulo.
 * Lee cookies: siempre va dentro de un <Suspense>.
 */
export async function ParticipantGate({
  role,
  intro,
  children,
}: {
  role: Role;
  intro: ReactNode;
  children: (p: Participant) => ReactNode;
}) {
  // Siempre en tiempo de request: sin esto, un build sin variables de entorno dejaría el aviso fijo en el HTML estático.
  await connection();
  if (!isDbConfigured()) {
    return (
      <Card className="border-sun-400 bg-sun-100">
        <p className="font-bold">Falta configurar el servidor.</p>
        <p className="mt-1 text-sm">
          Variables de entorno faltantes: <b>{missingEnv().join(", ")}</b>. En local van en .env.local; en Vercel, en Settings → Environment
          Variables (y luego Redeploy).
        </p>
      </Card>
    );
  }

  const participant = await getParticipant(role);
  if (!participant) {
    return (
      <Card className="py-8">
        <div className="mx-auto mb-6 max-w-md text-center">{intro}</div>
        <EntryForm role={role} />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>
          Hola, <b className="text-ink">{participant.name.includes("·") ? participant.name.split("·")[0].trim() : participant.name.split(" ")[0]}</b>
        </span>
        <Badge tone="muted">
          Tu código: <span className="tracking-widest text-ink">{participant.code}</span>
        </Badge>
        {participant.is_test && <Badge tone="sun">Demo</Badge>}
        <LeaveButton role={role} />
      </div>
      {children(participant)}
    </>
  );
}
