import type { ReactNode } from "react";
import { getParticipant, type Participant, type Role } from "@/lib/session";
import { isDbConfigured } from "@/lib/supabase";
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
  if (!isDbConfigured()) {
    return (
      <Card className="border-sun-400 bg-sun-100">
        <p className="font-bold">Falta configurar Supabase.</p>
        <p className="mt-1 text-sm">Copia .env.example a .env.local y completa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.</p>
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
          Hola, <b className="text-ink">{participant.name.split(" ")[0]}</b>
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
