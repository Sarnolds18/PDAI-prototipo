import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { Card, Skeleton } from "@/components/ui";
import { LoginForm } from "@/app/admin/forms";

export const metadata: Metadata = { title: "Acceso del equipo", robots: { index: false, follow: false } };

export default function EquipoPage() {
  return <section className="mx-auto max-w-lg px-4 py-12"><Suspense fallback={<Skeleton className="h-64" />}><Access /></Suspense></section>;
}

async function Access() {
  if (await isAdmin()) redirect("/admin");
  return <Card><h1 className="mb-6 text-center text-2xl font-extrabold">Acceso del equipo</h1><LoginForm /></Card>;
}
