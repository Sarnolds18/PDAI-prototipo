import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ jar: new Map<string, string>(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (key: string) => m.jar.has(key) ? { value: m.jar.get(key) } : undefined,
  set: (key: string, value: string) => m.jar.set(key, value),
  delete: (key: string) => m.jar.delete(key),
}) }));
vi.mock("./supabase", () => ({ db: () => ({ from: m.from }) }));
import { clearSession, getParticipant, setSession } from "./session";

beforeEach(() => {
  vi.clearAllMocks(); m.jar.clear();
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
  m.from.mockImplementation(() => {
    const values: Record<string, string> = {};
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { values[key] = value; return query; },
      maybeSingle: async () => ({ data: { ...values, name: "Participante" } }),
    };
    return query;
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("sesiones de participantes", () => {
  it("acepta la sesión nueva y la elimina al salir", async () => {
    await setSession("emprendedor", "own-id");
    expect((await getParticipant("emprendedor"))?.id).toBe("own-id");
    await clearSession("emprendedor");
    expect(await getParticipant("emprendedor")).toBeNull();
  });

  it("rechaza sesiones de versiones antiguas", async () => {
    const legacySig = createHmac("sha256", "test-session-secret").update("own-id").digest("base64url");
    m.jar.set("er_emprendedor", `own-id.${legacySig}`);
    expect(await getParticipant("emprendedor")).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  });

  it("no permite usar la cookie de un rol para otro ni cambiar su vencimiento", async () => {
    await setSession("emprendedor", "own-id");
    const raw = m.jar.get("er_emprendedor")!;
    m.jar.set("er_evaluador", raw);
    expect(await getParticipant("evaluador")).toBeNull();
    const parts = raw.split("."); parts[1] = String(Date.now() + 999999999999);
    m.jar.set("er_emprendedor", parts.join("."));
    expect(await getParticipant("emprendedor")).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  });

  it("aplica el vencimiento de 90 días también en el servidor", async () => {
    vi.useFakeTimers();
    await setSession("evaluador", "own-id");
    vi.advanceTimersByTime(90 * 24 * 60 * 60 * 1000);
    expect(await getParticipant("evaluador")).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  });
});
