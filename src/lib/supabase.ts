import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente de Auth aislado por operación: nunca autenticar el cliente compartido con service role. */
export function participantAuth(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta configurar el acceso por correo.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Cliente de Supabase con la service role key. Solo se usa en el servidor:
 * las tablas tienen RLS sin políticas públicas, así que el navegador nunca habla con la base.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Copia .env.example a .env.local y complétalas.",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Variables necesarias para guardar datos y abrir sesiones. Vacío = todo configurado. */
export function missingEnv(): string[] {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SESSION_SECRET"].filter((k) => !process.env[k]);
}

export function isDbConfigured(): boolean {
  return missingEnv().length === 0;
}
