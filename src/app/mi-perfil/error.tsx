"use client";

import { Button, Card } from "@/components/ui";

export default function ProfileError({ reset }: { reset: () => void }) {
  return <Card className="mx-auto my-10 max-w-xl"><h2 className="text-xl font-extrabold">No pudimos cargar tu resumen</h2><p className="my-4 text-muted">Tus datos guardados siguen ahí. Intenta cargar el perfil nuevamente.</p><Button onClick={reset}>Volver a intentar</Button></Card>;
}
