"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { participantEntry } from "@/app/actions/participant";
import type { Role } from "@/lib/session";
import { EmailOtpForm } from "./email-otp-form";
import { Button, Field, inputClass } from "./ui";

const noopSubscribe = () => () => {};

export function EntryForm({ role, emailOtpEnabled = false }: { role: Role; emailOtpEnabled?: boolean }) {
  return emailOtpEnabled ? <EmailOtpForm role={role} /> : <ManualEntryForm role={role} />;
}

function ManualEntryForm({ role }: { role: Role }) {
  const [state, action, pending] = useActionState(participantEntry, null);
  const [recover, setRecover] = useState(false);
  const demo = useSyncExternalStore(noopSubscribe,
    () => new URLSearchParams(window.location.search).get("demo") === "1" ? "1" : "0",
    () => "0",
  );
  return <div className="mx-auto w-full max-w-md space-y-5">
    <div className="grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-bold">
      <button type="button" disabled={pending} aria-pressed={!recover} onClick={() => setRecover(false)} className={`rounded-full py-2 ${!recover ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>Primera vez</button>
      <button type="button" disabled={pending} aria-pressed={recover} onClick={() => setRecover(true)} className={`rounded-full py-2 ${recover ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>Recuperar acceso</button>
    </div>
    {recover ? <div className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900"><p className="font-bold">¿Necesitas volver a tu perfil?</p><p className="mt-2">Escribe a <a href="mailto:sarnolds@miuandes.cl?subject=Recuperar%20acceso%20a%20EmprendeRed" className="break-all font-bold underline">sarnolds@miuandes.cl</a> indicando tu nombre, el correo con el que participaste y tu rol. El equipo revisará la solicitud y te entregará un código temporal.</p><p className="mt-2">Cuando lo recibas, ingrésalo abajo. No se envía un correo automático desde esta pantalla.</p></div> : <p className="text-sm leading-relaxed text-muted">Ingresa tus datos para comenzar. Tu avance se mantiene en este navegador mientras tu sesión siga activa. Si ya participaste, usa Recuperar acceso para volver al registro anterior.</p>}
    <form action={action} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="intent" value={recover ? "recover" : "register"} />
      <input type="hidden" name="demo" value={demo} />
      {!recover && <Field label="Nombre"><input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} placeholder="Ej: Daniela Soto" /></Field>}
      <Field label="Correo electrónico"><input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} placeholder="tu@email.com" /></Field>
      {recover ? <Field label="Código que te entregó el equipo" hint="Es temporal y de un solo uso. Cópialo completo, incluido REC-."><input name="token" required maxLength={80} autoComplete="off" className={`${inputClass} font-mono`} placeholder="REC-…" /></Field> : <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900"><input name="consent" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" /><span>Acepto que mis respuestas se usen <b>con fines académicos</b> en Pensamiento de Diseño Aplicado a la Ingeniería (UANDES). Mi nombre y correo no se publican.</span></label>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Cargando…" : recover ? "Recuperar mi perfil" : "Comenzar"}<ArrowRight className="h-4 w-4" /></Button>
    </form>
    {state?.error && <p role="alert" className="rounded-xl bg-coral-50 p-4 text-sm font-bold text-coral-700">{state.error}</p>}
    {demo === "1" && <p className="flex items-center gap-2 text-xs font-bold text-sun-600"><ShieldCheck className="h-4 w-4" />Modo demo: esta sesión no cuenta para la validación.</p>}
  </div>;
}
