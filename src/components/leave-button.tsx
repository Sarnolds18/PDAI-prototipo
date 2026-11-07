"use client";

import { useTransition } from "react";
import { leaveParticipant } from "@/app/actions/participant";
import type { Role } from "@/lib/session";

export function LeaveButton({ role }: { role: Role }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm("¿Quieres cerrar la sesión? Si necesitas volver, usa Recuperar acceso en el formulario.")) start(() => leaveParticipant(role));
      }}
      className="text-xs font-bold text-muted underline-offset-2 hover:text-coral-600 hover:underline"
    >
      ¿No eres tú? Salir
    </button>
  );
}
