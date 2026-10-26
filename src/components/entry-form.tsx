"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { resumeParticipant, startParticipant } from "@/app/actions/participant";
import type { Role } from "@/lib/session";
import { Button, Field, inputClass } from "./ui";

const noopSubscribe = () => () => {};

export function EntryForm({ role }: { role: Role }) {
  const [mode, setMode] = useState<"new" | "resume">("new");
  const [startState, startAction, starting] = useActionState(startParticipant, null);
  const [resumeState, resumeAction, resuming] = useActionState(resumeParticipant, null);

  // ?demo=1 marca la sesión como prueba: se excluye del dashboard de validación.
  const demo = useSyncExternalStore(
    noopSubscribe,
    () => (new URLSearchParams(window.location.search).get("demo") === "1" ? "1" : "0"),
    () => "0",
  );

  const state = mode === "new" ? startState : resumeState;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-bold">
        {(["new", "resume"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 transition-colors ${mode === m ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}
          >
            {m === "new" ? "Primera vez" : "Tengo un código"}
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <form action={startAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="demo" value={demo} />
          <Field label="Nombre">
            <input name="name" required autoComplete="name" className={inputClass} placeholder="Ej: Daniela Soto" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} placeholder="tu@email.com" />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
            <input name="consent" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
            <span>
              Acepto que mis respuestas se usen <b>con fines académicos</b> en el ramo Pensamiento de Diseño Aplicado a la Ingeniería
              (UANDES). Mi nombre y email no se publican.
            </span>
          </label>
          <Button type="submit" disabled={starting} className="w-full">
            {starting ? "Creando…" : "Comenzar"} <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
      ) : (
        <form action={resumeAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          <Field label="Código de participante" hint="Lo ves arriba de cada pantalla, ej: ER-7K3Q">
            <input name="code" required className={`${inputClass} uppercase tracking-widest`} placeholder="ER-XXXX" autoComplete="off" />
          </Field>
          <Button type="submit" disabled={resuming} className="w-full">
            <KeyRound className="h-5 w-5" /> {resuming ? "Buscando…" : "Continuar"}
          </Button>
        </form>
      )}

      {state?.error && <p className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{state.error}</p>}
      {demo === "1" && (
        <p className="mt-4 flex items-center gap-2 text-xs font-bold text-sun-600">
          <ShieldCheck className="h-4 w-4" /> Modo demo: esta sesión no cuenta para la validación.
        </p>
      )}
    </div>
  );
}
