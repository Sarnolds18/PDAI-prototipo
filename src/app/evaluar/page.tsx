import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { ParticipantGate } from "@/components/participant-gate";
import { PageHeader, Skeleton } from "@/components/ui";
import { EXAMPLE_COLD_MESSAGE, exampleFicha } from "@/lib/example-project";
import { EvaluationFlow } from "./evaluation-flow";

export const metadata: Metadata = { title: "Evaluar un proyecto" };

export default function EvaluarPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow="Para mentores e inversionistas" title="Evalúa un proyecto en 3 minutos">
        Te mostramos un proyecto de ejemplo. Dinos si te reunirías con su fundadora.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ParticipantGate
          role="evaluador"
          intro={
            <>
              <ClipboardCheck className="mx-auto h-10 w-10 text-brand-600" />
              <p className="mt-2 text-xl font-extrabold">Antes de empezar</p>
              <p className="text-muted">Solo nombre y email, para no contar dos veces la misma evaluación.</p>
            </>
          }
        >
          {() => <EvaluationFlow ficha={exampleFicha()} cold={EXAMPLE_COLD_MESSAGE} />}
        </ParticipantGate>
      </Suspense>
    </section>
  );
}
