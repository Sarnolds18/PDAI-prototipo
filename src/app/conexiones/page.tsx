import type { Metadata } from "next";
import { Suspense } from "react";
import { Handshake } from "lucide-react";
import { loadMatches } from "@/lib/connections";
import { ParticipantGate } from "@/components/participant-gate";
import { ButtonLink, Card, PageHeader, Skeleton } from "@/components/ui";
import type { NetworkKind } from "@/lib/catalog";
import { db } from "@/lib/supabase";
import { ConnectionsBoard } from "./connections-board";

export const metadata: Metadata = { title: "Conexiones sugeridas" };

export default function ConexionesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow="Paso 3 · Conexiones" title="Las personas que tu proyecto necesita">
        Elegidas por lo que te falta, tu rubro y tu etapa. No por a quién conoces.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ParticipantGate
          role="emprendedor"
          intro={
            <>
              <Handshake className="mx-auto h-10 w-10 text-brand-600" />
              <p className="mt-2 text-xl font-extrabold">Ingresa para ver tus conexiones</p>
              <p className="text-muted">Usa tu código si ya creaste tu perfil.</p>
            </>
          }
        >
          {(p) => <ConnectionsLoader participantId={p.id} />}
        </ParticipantGate>
      </Suspense>
    </section>
  );
}

async function ConnectionsLoader({ participantId }: { participantId: string }) {
  const matches = await loadMatches(participantId);
  if (!matches) {
    return (
      <Card className="text-center">
        <p className="text-xl font-extrabold">Primero completa tu perfil</p>
        <p className="mt-1 text-muted">Lo usamos para saber qué te falta y a quién sugerirte.</p>
        <ButtonLink href="/perfil" className="mt-5">
          Ir a mi perfil
        </ButtonLink>
      </Card>
    );
  }

  const [{ data: ratings }, { data: feedback }, { data: profile }] = await Promise.all([
    db().from("match_suggestions").select("network_profile_id, rating").eq("participant_id", participantId),
    db().from("platform_feedback").select("would_use").eq("participant_id", participantId).maybeSingle(),
    db().from("profiles").select("seeking").eq("participant_id", participantId).single(),
  ]);

  // Primero lo que el emprendedor dijo que busca.
  const seeking: string[] = profile?.seeking ?? [];
  const kindFor: Record<string, NetworkKind> = { socio: "socio", mentor: "mentor", inversion: "inversionista" };
  const order = [...new Set([...seeking.map((s) => kindFor[s]), "socio", "mentor", "inversionista"] as NetworkKind[])];

  return (
    <ConnectionsBoard
      matches={matches}
      order={order}
      initialRatings={Object.fromEntries((ratings ?? []).filter((r) => r.rating).map((r) => [r.network_profile_id, r.rating]))}
      feedbackDone={Boolean(feedback)}
    />
  );
}
