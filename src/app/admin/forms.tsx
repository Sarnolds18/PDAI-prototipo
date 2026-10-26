"use client";

import { useActionState, useTransition } from "react";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { addIteration, adminLogin, adminLogout, deleteIteration, saveSettings, setTestFlag } from "@/app/actions/admin";
import { Button, Field, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="mx-auto max-w-sm space-y-4">
      <Field label="Contraseña del dashboard">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      {state?.error && <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{state.error}</p>}
    </form>
  );
}

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" type="button" disabled={pending} onClick={() => start(() => adminLogout())}>
      <LogOut className="h-4 w-4" /> Salir
    </Button>
  );
}

export function TestToggle({ id, isTest }: { id: string; isTest: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold">
      <input
        type="checkbox"
        className="h-4 w-4 accent-sun-600"
        checked={isTest}
        disabled={pending}
        onChange={(e) => start(() => setTestFlag(id, e.target.checked))}
      />
      Prueba
    </label>
  );
}

export function IterationForm() {
  const [state, action, pending] = useActionState(addIteration, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[140px_160px_1fr_1fr_auto] sm:items-end">
      <Field label="Fecha">
        <input name="date" type="date" className={inputClass} />
      </Field>
      <Field label="Módulo">
        <select name="module" className={inputClass} defaultValue="">
          <option value="" disabled>
            Elegir
          </option>
          {["Perfil", "Finanzas", "Ficha", "Conexiones", "Evaluar", "Pacto", "General"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label="Qué cambiamos">
        <input name="change" className={inputClass} maxLength={500} />
      </Field>
      <Field label="Por qué (qué vimos en la validación)">
        <input name="reason" className={inputClass} maxLength={500} />
      </Field>
      <Button type="submit" disabled={pending} className="h-[50px]">
        <Plus className="h-4 w-4" /> Agregar
      </Button>
      <input type="hidden" name="hypothesis" value="" />
      {state?.error && <p className="text-sm font-bold text-coral-700 sm:col-span-5">{state.error}</p>}
    </form>
  );
}

export function DeleteIteration({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Eliminar"
      disabled={pending}
      onClick={() => confirm("¿Eliminar esta iteración?") && start(() => deleteIteration(id))}
      className="rounded-full p-1.5 text-muted hover:bg-coral-50 hover:text-coral-600"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function SettingsForm({ emp, ev, minN }: { emp: number; ev: number; minN: number }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <Field label="Meta emprendedores">
        <input name="target_emprendedores" type="number" min={1} defaultValue={emp} className={inputClass} />
      </Field>
      <Field label="Meta evaluadores">
        <input name="target_evaluadores" type="number" min={1} defaultValue={ev} className={inputClass} />
      </Field>
      <Field label="n mínimo para veredicto" hint="Bajo este n: «Datos insuficientes»">
        <input name="min_n" type="number" min={1} defaultValue={minN} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} className="h-[50px]">
        {pending ? "Guardando…" : state?.ok ? "Guardado ✓" : "Guardar"}
      </Button>
    </form>
  );
}
