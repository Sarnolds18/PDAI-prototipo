import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FichaView, type FichaData } from "@/components/ficha-view";
import { Skeleton } from "@/components/ui";
import type { FinanceInputs, FinanceSummary } from "@/lib/finance";
import { db } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Ficha de proyecto" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function FichaPage({ params }: PageProps<"/ficha/[id]">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Esta es la ficha que recibe un mentor o inversionista.</p>
        <PrintButton />
      </div>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Ficha params={params} />
      </Suspense>
    </section>
  );
}

async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: profile } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();
  const p = profile as ProfileRow;

  const [{ data: participant }, { data: fin }] = await Promise.all([
    db().from("participants").select("name").eq("id", p.participant_id).single(),
    db().from("financial_models").select("inputs, results, completed").eq("participant_id", p.participant_id).maybeSingle(),
  ]);

  const data: FichaData = {
    projectName: p.project_name || "Proyecto sin nombre",
    founderName: participant?.name ?? "—",
    region: p.region,
    industry: p.industry,
    stage: p.stage,
    seeking: p.seeking ?? [],
    skills: p.skills ?? [],
    problem: p.problem,
    solution: p.solution,
    customer: p.customer,
    traction: p.traction,
    finance:
      fin?.completed && fin.results
        ? { summary: fin.results as FinanceSummary, discountRate: (fin.inputs as FinanceInputs).discountRate }
        : null,
    generatedAt: new Date(p.completed_at ?? p.started_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
  };

  return <FichaView data={data} />;
}
