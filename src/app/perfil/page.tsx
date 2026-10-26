import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { ParticipantGate } from "@/components/participant-gate";
import { PageHeader, Skeleton } from "@/components/ui";
import { db } from "@/lib/supabase";
import type { ProfileData, ProfileRow } from "@/lib/types";
import { ProfileWizard } from "./profile-wizard";

export const metadata: Metadata = { title: "Perfil validado" };

const EMPTY: ProfileData = {
  age_range: null,
  region: null,
  industry: null,
  stage: null,
  seeking: [],
  skills: [],
  project_name: null,
  problem: null,
  solution: null,
  customer: null,
  traction: null,
  main_obstacle: null,
};

export default function PerfilPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow="Paso 1 · Perfil validado" title="Muestra lo que sabes hacer">
        Tus competencias con evidencia y tu proyecto en formato estándar.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ParticipantGate
          role="emprendedor"
          intro={
            <>
              <BadgeCheck className="mx-auto h-10 w-10 text-brand-600" />
              <p className="mt-2 text-xl font-extrabold">Crea tu perfil</p>
              <p className="text-muted">Solo nombre y email. Te damos un código para volver cuando quieras.</p>
            </>
          }
        >
          {(p) => <ProfileLoader participantId={p.id} />}
        </ParticipantGate>
      </Suspense>
    </section>
  );
}

async function ProfileLoader({ participantId }: { participantId: string }) {
  const { data } = await db().from("profiles").select("*").eq("participant_id", participantId).maybeSingle();
  const row = data as ProfileRow | null;
  const initial: ProfileData = row
    ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k as keyof ProfileData] ?? EMPTY[k as keyof ProfileData]])) as ProfileData
    : EMPTY;
  return (
    <ProfileWizard initial={initial} completed={Boolean(row?.completed)} durationS={row?.duration_s ?? null} profileId={row?.id ?? null} />
  );
}
