import type { EventType, ModuleName } from "./types";

/** Registra un evento de uso sin bloquear la UI ni la cola de server actions. Nunca lanza errores. */
export function track(module: ModuleName, type: Extract<EventType, "step_view" | "help_open">, step?: number, payload?: Record<string, unknown>) {
  try {
    fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, type, step, payload }),
    }).catch(() => {});
  } catch {
    // sin red: se pierde el evento, no la sesión
  }
}
