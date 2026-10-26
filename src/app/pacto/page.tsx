import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { ParticipantGate } from "@/components/participant-gate";
import { PageHeader, Skeleton } from "@/components/ui";
import { DEFAULT_PACT, type PactData } from "@/lib/pact";
import { db } from "@/lib/supabase";
import { PactWizard } from "./pact-wizard";

export const metadata: Metadata = { title: "Pacto de socios" };

export default function PactoPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12 print:max-w-none print:p-0">
      <div className="no-print">
        <PageHeader eyebrow="Pacto de socios" title="Pónganse de acuerdo antes, no después">
          Roles, aportes, dedicación y qué pasa si alguien sale. Háganlo juntos: toma pocos minutos.
        </PageHeader>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ParticipantGate
          role="emprendedor"
          intro={
            <>
              <ScrollText className="mx-auto h-10 w-10 text-brand-600" />
              <p className="mt-2 text-xl font-extrabold">Ingresa para armar el pacto</p>
              <p className="text-muted">Lo completa uno de los socios, con el otro al lado.</p>
            </>
          }
        >
          {(p) => <PactLoader participantId={p.id} />}
        </ParticipantGate>
      </Suspense>
    </section>
  );
}

async function PactLoader({ participantId }: { participantId: string }) {
  const [{ data: row }, { data: profile }] = await Promise.all([
    db().from("pacts").select("data, completed, last_step").eq("participant_id", participantId).maybeSingle(),
    db().from("profiles").select("project_name").eq("participant_id", participantId).maybeSingle(),
  ]);
  const saved = (row?.data as Partial<PactData> | undefined) ?? {};
  const initial: PactData = {
    ...DEFAULT_PACT,
    ...saved,
    projectName: saved.projectName || profile?.project_name || "",
  };
  return <PactWizard initial={initial} completed={Boolean(row?.completed)} lastStep={row?.last_step ?? 0} />;
}
