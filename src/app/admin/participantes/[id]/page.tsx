import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { loadAdminParticipantSummary } from "@/lib/participant-summary";
import { EntrepreneurSummaryView, EvaluatorSummaryView } from "@/app/mi-perfil/summaries";
import { RecoveryCodeForm } from "@/components/recovery-code-form";
import { ButtonLink, Card, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Perfil del participante", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default function AdminParticipantPage({ params }: Props) {
  return <section className="mx-auto max-w-6xl px-4 py-8"><Suspense fallback={<Skeleton className="h-96" />}><ParticipantDetails params={params} /></Suspense></section>;
}

async function ParticipantDetails({ params }: Props) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const data = await loadAdminParticipantSummary(id);
  if (!data) notFound();
  const participant = data.summary.participant;
  return <div className="space-y-6">
    <Card><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-extrabold">Consulta del equipo · Solo lectura</h1><p className="mt-2 break-all text-sm text-muted">{participant.code} · {participant.email}</p><p className="mt-1 text-sm text-muted">Estás consultando este perfil desde tu sesión de administrador.</p></div><ButtonLink href="/admin" variant="ghost">Volver al panel</ButtonLink></div></Card>
    <Card><h2 className="mb-4 text-xl font-extrabold">Recuperación de acceso</h2><RecoveryCodeForm participantId={participant.id} /></Card>
    {data.role === "emprendedor" ? <EntrepreneurSummaryView data={data.summary} readOnly /> : <EvaluatorSummaryView data={data.summary} readOnly />}
  </div>;
}
