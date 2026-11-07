import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("server-only", () => ({}));
vi.mock("./supabase", () => ({ db: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined,
    set: (key: string, value: string) => jar.set(key, value),
    delete: (key: string) => jar.delete(key),
  }),
}));

import { checkTeamCredentials, clearAdminCookie, isAdmin, setAdminCookie } from "./admin";

beforeEach(() => {
  jar.clear();
  vi.stubEnv("ADMIN_PASSWORD", "test-team-password");
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("acceso del equipo", () => {
  it("solo acepta los dos correos autorizados con la clave correcta", () => {
    expect(checkTeamCredentials(" SARNOLDS@MIUANDES.CL ", "test-team-password")).toBe(true);
    expect(checkTeamCredentials("admin@example.cl", "test-team-password")).toBe(true);
    expect(checkTeamCredentials("otro@example.cl", "test-team-password")).toBe(false);
    expect(checkTeamCredentials("sarnolds@miuandes.cl", "incorrecta")).toBe(false);
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(checkTeamCredentials("sarnolds@miuandes.cl", "")).toBe(false);
  });

  it("rechaza visitas sin sesión, cookies antiguas y cookies alteradas", async () => {
    expect(await isAdmin()).toBe(false);
    jar.set("er_admin", "legacy-password-token");
    expect(await isAdmin()).toBe(false);
    await setAdminCookie("sarnolds@miuandes.cl");
    expect(await isAdmin()).toBe(true);
    jar.set("er_admin", `${jar.get("er_admin")}x`);
    expect(await isAdmin()).toBe(false);
  });

  it("no permite emitir sesiones para otros correos", async () => {
    await expect(setAdminCookie("otro@example.cl")).rejects.toThrow("No autorizado");
    expect(await isAdmin()).toBe(false);
  });

  it("caduca la sesión en el servidor después de doce horas", async () => {
    vi.useFakeTimers();
    await setAdminCookie("admin@example.cl");
    vi.advanceTimersByTime(12 * 60 * 60 * 1000);
    expect(await isAdmin()).toBe(false);
  });

  it("invalida sesiones al cambiar la clave y al cerrar sesión", async () => {
    await setAdminCookie("admin@example.cl");
    vi.stubEnv("ADMIN_PASSWORD", "new-password");
    expect(await isAdmin()).toBe(false);
    await setAdminCookie("admin@example.cl");
    await clearAdminCookie();
    expect(await isAdmin()).toBe(false);
  });
});
