import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartLine } from "lucide-react";
import { ParticipantGate } from "@/components/participant-gate";
import { PageHeader, Skeleton } from "@/components/ui";
import { DEFAULT_INPUTS, type FinanceInputs } from "@/lib/finance";
import { db } from "@/lib/supabase";
import { FinanceWizard } from "./finance-wizard";

export const metadata: Metadata = { title: "Plantilla financiera" };

export default function FinanzasPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow="Paso 2 · Números defendibles" title="Tus números, paso a paso">
        Flujo de caja, VAN, TIR y escenarios. Sin saber de finanzas.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ParticipantGate
          role="emprendedor"
          intro={
            <>
              <ChartLine className="mx-auto h-10 w-10 text-brand-600" />
              <p className="mt-2 text-xl font-extrabold">Ingresa para armar tus números</p>
              <p className="text-muted">Si ya creaste tu perfil, usa tu código.</p>
            </>
          }
        >
          {(p) => <FinanceLoader participantId={p.id} />}
        </ParticipantGate>
      </Suspense>
    </section>
  );
}

async function FinanceLoader({ participantId }: { participantId: string }) {
  const [{ data: row }, { data: profile }] = await Promise.all([
    db().from("financial_models").select("inputs, completed, duration_s, last_step").eq("participant_id", participantId).maybeSingle(),
    db().from("profiles").select("id").eq("participant_id", participantId).maybeSingle(),
  ]);
  const initial: FinanceInputs = { ...DEFAULT_INPUTS, ...((row?.inputs as Partial<FinanceInputs>) ?? {}) };
  return (
    <FinanceWizard
      initial={initial}
      completed={Boolean(row?.completed)}
      durationS={row?.duration_s ?? null}
      lastStep={row?.last_step ?? 0}
      profileId={(profile?.id as string | undefined) ?? null}
    />
  );
}
