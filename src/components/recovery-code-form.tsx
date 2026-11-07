"use client";

import { useActionState } from "react";
import { createParticipantRecoveryCode } from "@/app/actions/admin";
import { Button, Field, inputClass } from "./ui";

export function RecoveryCodeForm({ participantId }: { participantId: string }) {
  const [state, action, pending] = useActionState(createParticipantRecoveryCode, null);
  return <form action={action} className="space-y-4">
    <input type="hidden" name="participantId" value={participantId} />
    <p className="text-sm text-muted">Cuando alguien te escriba a sarnolds@miuandes.cl, verifica su identidad y selecciona el perfil correcto antes de generar el código.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmed" required className="mt-1" />Verifiqué que la solicitud corresponde a esta persona y este perfil.</label>
    <Button type="submit" disabled={pending}>{pending ? "Generando…" : "Generar código de recuperación"}</Button>
    {state?.token && <div className="space-y-3 rounded-xl bg-brand-50 p-4">
      <Field label="Código para enviar a la persona"><input className={`${inputClass} font-mono`} readOnly value={state.token} onFocus={(e) => e.target.select()} /></Field>
      <p className="text-sm text-brand-900">Dura una hora y funciona una sola vez. Envíaselo manualmente; al generar otro se invalida el anterior.</p>
    </div>}
    {state?.error && <p role="alert" className="text-sm font-bold text-coral-700">{state.error}</p>}
  </form>;
}
