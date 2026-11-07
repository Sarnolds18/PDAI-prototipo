import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getParticipant } from "@/lib/session";
import { ButtonLink, Card, PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false, follow: false } };

export default function MyProfilePage() {
  return <section className="mx-auto max-w-3xl px-4 py-10"><Suspense fallback={<Skeleton />}><ChooseRole /></Suspense></section>;
}

async function ChooseRole() {
  const [entrepreneur, evaluator] = await Promise.all([getParticipant("emprendedor"), getParticipant("evaluador")]);
  if (entrepreneur && !evaluator) redirect("/mi-perfil/emprendedor");
  if (evaluator && !entrepreneur) redirect("/mi-perfil/evaluador");
  return <>
    <PageHeader eyebrow="Tu espacio" title="Mi perfil">Elige el resumen que quieres consultar. Cada rol tiene su propio espacio.</PageHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card><h2 className="text-xl font-extrabold">Soy emprendedor</h2><p className="my-4 text-muted">Tu proyecto, sus números, las conexiones sugeridas y el acuerdo con tus socios.</p><ButtonLink href="/mi-perfil/emprendedor">Ver mi proyecto</ButtonLink></Card>
      <Card><h2 className="text-xl font-extrabold">Soy evaluador</h2><p className="my-4 text-muted">Tu evaluación del proyecto de ejemplo, tus respuestas y tu preferencia de formato.</p><ButtonLink href="/mi-perfil/evaluador">Ver mi evaluación</ButtonLink></Card>
    </div>
  </>;
}
