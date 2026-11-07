"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { participantEntry } from "@/app/actions/participant";
import type { Role } from "@/lib/session";
import { Button, Field, inputClass } from "./ui";

const noopSubscribe = () => () => {};

export function EmailOtpForm({ role }: { role: Role }) {
  const [state, action, pending] = useActionState(participantEntry, null);
  const [mode, setMode] = useState<"signup" | "resume">("signup");
  const [restart, setRestart] = useState(false);
  const demo = useSyncExternalStore(noopSubscribe,
    () => new URLSearchParams(window.location.search).get("demo") === "1" ? "1" : "0",
    () => "0",
  );
  const stage = restart ? "request" : state?.stage ?? "request";
  const submit = (data: FormData) => { setRestart(false); action(data); };

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      {stage === "request" && <>
        <div className="grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-bold">
          {(["signup", "resume"] as const).map((value) => <button key={value} type="button" disabled={pending} aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-full py-2 ${mode === value ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>{value === "signup" ? "Primera vez" : "Ya participé"}</button>)}
        </div>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="intent" value="request" />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="demo" value={demo} />
          <p className="text-sm leading-relaxed text-muted">{mode === "signup" ? "Verifica tu correo para comenzar. Te enviaremos un código de un solo uso." : "Usa el correo con el que participaste. Te enviaremos un código para recuperar tu perfil en este dispositivo."}</p>
          {mode === "signup" && <Field label="Nombre"><input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} placeholder="Ej: Daniela Soto" /></Field>}
          <Field label="Correo electrónico"><input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} placeholder="tu@email.com" /></Field>
          {mode === "signup" && <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900"><input name="consent" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" /><span>Acepto que mis respuestas se usen <b>con fines académicos</b> en Pensamiento de Diseño Aplicado a la Ingeniería (UANDES). Mi nombre y correo no se publican.</span></label>}
          <Button type="submit" disabled={pending} className="w-full"><Mail className="h-4 w-4" />{pending ? "Enviando…" : "Enviar código a mi correo"}</Button>
        </form>
      </>}

      {stage === "verify" && <>
        <div className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900"><p className="font-bold">{state?.verified ? "Correo verificado" : "Revisa tu correo"}</p><p className="mt-1 break-words">{state?.verified ? "Puedes reintentar cargar tus datos sin pedir otro código." : `Enviamos un código a ${state?.email}. Revisa también spam. Es de un solo uso; completa este paso dentro de 10 minutos.`}</p></div>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="role" value={role} /><input type="hidden" name="intent" value="verify" />
          {!state?.verified && <Field label="Código recibido por correo" hint="No compartas este código: permite abrir tu perfil."><input name="token" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} className={`${inputClass} text-center text-xl tracking-widest`} /></Field>}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "Cargando…" : state?.verified ? "Continuar" : "Verificar y continuar"}<ArrowRight className="h-4 w-4" /></Button>
        </form>
        {!state?.verified && <><p className="text-xs text-muted">Espera al menos un minuto antes de solicitar otro código.</p><form action={submit}><input type="hidden" name="role" value={role} /><input type="hidden" name="intent" value="resend" /><Button variant="ghost" type="submit" disabled={pending} className="w-full">Reenviar código</Button></form></>}
      </>}

      {stage === "choose" && <>
        <p className="text-sm leading-relaxed text-muted">Tu correo está verificado. Encontramos más de una participación de este rol; elige cuál quieres abrir.</p>
        {state?.choices?.map((choice) => <form key={choice.id} action={submit}><input type="hidden" name="role" value={role} /><input type="hidden" name="intent" value="select" /><input type="hidden" name="participantId" value={choice.id} /><button type="submit" disabled={pending} className="w-full rounded-xl border border-line p-4 text-left transition hover:border-brand-500 disabled:opacity-50"><span className="block font-bold">{choice.title}</span><span className="mt-1 block text-xs text-muted">{new Date(choice.createdAt).toLocaleString("es-CL")}{choice.isTest ? " · Prueba" : ""}</span></button></form>)}
      </>}

      {!restart && state?.error && <p role="alert" className="rounded-xl bg-coral-50 p-4 text-sm font-bold text-coral-700">{state.error}</p>}
      {stage !== "request" && <button type="button" disabled={pending} onClick={() => setRestart(true)} className="text-sm font-bold text-muted underline underline-offset-4">Usar otro correo</button>}
      {demo === "1" && <p className="flex items-center gap-2 text-xs font-bold text-sun-600"><ShieldCheck className="h-4 w-4" />Modo demo: esta sesión no cuenta para la validación.</p>}
    </div>
  );
}
