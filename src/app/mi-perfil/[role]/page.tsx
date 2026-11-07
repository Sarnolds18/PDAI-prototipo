import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ParticipantGate } from "@/components/participant-gate";
import { Skeleton } from "@/components/ui";
import { EntrepreneurProfile, EvaluatorProfile } from "../summaries";

export const metadata: Metadata = { title: "Mi resumen", robots: { index: false, follow: false } };

type Props = { params: Promise<{ role: string }> };
export default function RoleProfilePage({ params }: Props) {
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12"><Suspense fallback={<Skeleton className="h-96" />}><RoleContent params={params} /></Suspense></section>;
}

async function RoleContent({ params }: Props) {
  const { role } = await params;
  if (role !== "emprendedor" && role !== "evaluador") notFound();
  return <ParticipantGate role={role} intro={<><h1 className="text-2xl font-extrabold">Tu perfil de {role}</h1><p className="mt-2 text-muted">Si ya participaste, selecciona la opción para recuperar tu acceso.</p></>}>
        {() => role === "emprendedor" ? <EntrepreneurProfile /> : <EvaluatorProfile />}
      </ParticipantGate>;
}
