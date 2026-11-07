import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  jar: new Map<string, string>(), send: vi.fn(), verify: vi.fn(), session: vi.fn(),
  from: vi.fn(), filters: [] as [string, string][], inserts: [] as Record<string, unknown>[],
  rows: [] as { id: string; name: string; created_at: string; is_test: boolean; profiles: { project_name: string } | null }[],
  dbError: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (key: string) => m.jar.has(key) ? { value: m.jar.get(key) } : undefined,
  set: (key: string, value: string) => m.jar.set(key, value),
  delete: (key: string) => m.jar.delete(key),
}) }));
vi.mock("./session", () => ({ setSession: m.session }));
vi.mock("./supabase", () => ({
  participantAuth: () => ({ auth: { signInWithOtp: m.send, verifyOtp: m.verify } }),
  db: () => ({ from: m.from }),
}));

import { requestParticipantOtp, resendParticipantOtp, selectVerifiedParticipant, verifyParticipantOtp } from "./participant-access";

const request = { role: "emprendedor" as const, mode: "resume" as const, email: " Owner@Example.cl ", name: "", consent: false, isTest: false };
const row = (id: string) => ({ id, name: "Propietario", created_at: "2026-11-06T12:00:00Z", is_test: false, profiles: { project_name: "Proyecto propio" } });

beforeEach(() => {
  vi.clearAllMocks();
  m.jar.clear(); m.filters.length = 0; m.inserts.length = 0; m.rows = [row("own-profile")]; m.dbError = false;
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-public-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  m.send.mockResolvedValue({ error: null });
  m.verify.mockResolvedValue({ data: { user: { email: "owner@example.cl", email_confirmed_at: "2026-11-06" } }, error: null });
  m.from.mockImplementation(() => {
    const q = {
      select: () => q,
      eq: (field: string, value: string) => { m.filters.push([field, value]); return q; },
      order: async () => ({ data: m.rows, error: m.dbError ? { message: "offline" } : null }),
      insert: (payload: Record<string, unknown>) => { m.inserts.push(payload); return q; },
      single: async () => ({ data: { id: "new-profile" }, error: null }),
    };
    return q;
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("ingreso por correo verificado", () => {
  it("no consulta perfiles ni abre sesiones al pedir un código", async () => {
    expect(await requestParticipantOtp(request)).toEqual({ stage: "verify", email: "owner@example.cl" });
    expect(m.send).toHaveBeenCalledWith({ email: "owner@example.cl", options: { shouldCreateUser: true } });
    expect(m.from).not.toHaveBeenCalled();
    expect(m.session).not.toHaveBeenCalled();
  });

  it("no permite comenzar sin configurar Auth o sin consentimiento al registrarse", async () => {
    await requestParticipantOtp({ ...request, mode: "signup", name: "Persona" });
    expect(m.send).not.toHaveBeenCalled();
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    expect((await requestParticipantOtp(request))?.stage).toBe("request");
    expect(m.send).not.toHaveBeenCalled();
  });

  it("rechaza código inválido, correo verificado diferente y respuestas no confirmadas", async () => {
    await requestParticipantOtp(request);
    m.verify.mockResolvedValueOnce({ data: { user: null }, error: { message: "expired" } });
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.error).toBeTruthy();
    m.verify.mockResolvedValueOnce({ data: { user: { email: "other@example.cl", email_confirmed_at: "today" } }, error: null });
    await verifyParticipantOtp("emprendedor", "123456");
    m.verify.mockResolvedValueOnce({ data: { user: { email: "owner@example.cl", email_confirmed_at: null } }, error: null });
    await verifyParticipantOtp("emprendedor", "123456");
    expect(m.from).not.toHaveBeenCalled();
    expect(m.session).not.toHaveBeenCalled();
  });

  it("solo recupera el registro del correo y rol verificados; no reutiliza la solicitud completada", async () => {
    await requestParticipantOtp(request);
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.ok).toBe(true);
    expect(m.filters).toEqual([["email", "owner@example.cl"], ["role", "emprendedor"]]);
    expect(m.session).toHaveBeenCalledWith("emprendedor", "own-profile");
    await verifyParticipantOtp("emprendedor", "123456");
    expect(m.verify).toHaveBeenCalledTimes(1);
    expect(m.session).toHaveBeenCalledTimes(1);
  });

  it("rechaza solicitudes de otro rol, vencidas o alteradas sin consultar perfiles", async () => {
    vi.useFakeTimers();
    await requestParticipantOtp(request);
    await verifyParticipantOtp("evaluador", "123456");
    vi.advanceTimersByTime(10 * 60 * 1000);
    await verifyParticipantOtp("emprendedor", "123456");
    await requestParticipantOtp(request);
    m.jar.set("er_email_emprendedor", `${m.jar.get("er_email_emprendedor")}x`);
    await verifyParticipantOtp("emprendedor", "123456");
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.from).not.toHaveBeenCalled();
  });

  it("solo permite elegir entre perfiles del mismo correo después de la verificación", async () => {
    await selectVerifiedParticipant("emprendedor", "foreign-profile");
    expect(m.from).not.toHaveBeenCalled();
    await requestParticipantOtp(request);
    m.rows = [row("own-first"), row("own-second")];
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.stage).toBe("choose");
    expect(m.session).not.toHaveBeenCalled();
    expect((await selectVerifiedParticipant("emprendedor", "foreign-profile"))?.error).toBeTruthy();
    expect(m.session).not.toHaveBeenCalled();
    await selectVerifiedParticipant("emprendedor", "own-second");
    expect(m.session).toHaveBeenCalledWith("emprendedor", "own-second");
  });

  it("crea nuevos registros solo después del OTP y mantiene privado el ID interno", async () => {
    m.rows = [];
    await requestParticipantOtp({ ...request, mode: "signup", name: "Nombre", consent: true });
    expect(m.inserts).toEqual([]);
    const result = await verifyParticipantOtp("emprendedor", "123456");
    expect(result).toEqual({ stage: "request", ok: true });
    expect(m.inserts[0]).toMatchObject({ email: "owner@example.cl", role: "emprendedor", consent: true });
    expect(m.inserts[0].code).toMatch(/^ER-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(m.session).toHaveBeenCalledWith("emprendedor", "new-profile");
  });

  it("no duplica un registro existente al elegir Primera vez", async () => {
    await requestParticipantOtp({ ...request, mode: "signup", name: "Otro nombre", consent: true });
    await verifyParticipantOtp("emprendedor", "123456");
    expect(m.inserts).toEqual([]);
    expect(m.session).toHaveBeenCalledWith("emprendedor", "own-profile");
  });

  it("no crea un registro si la recuperación no encuentra coincidencias", async () => {
    m.rows = [];
    await requestParticipantOtp(request);
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.error).toContain("No encontramos");
    expect(m.inserts).toEqual([]);
    expect(m.session).not.toHaveBeenCalled();
  });

  it("permite reintentar un fallo de base sin consumir el OTP por segunda vez", async () => {
    await requestParticipantOtp(request);
    m.dbError = true;
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.verified).toBe(true);
    m.dbError = false;
    expect((await verifyParticipantOtp("emprendedor", ""))?.ok).toBe(true);
    expect(m.verify).toHaveBeenCalledTimes(1);
  });

  it("mantiene la pantalla de verificación si un reenvío falla", async () => {
    await requestParticipantOtp(request);
    m.send.mockResolvedValue({ error: { message: "rate limit" } });
    expect((await resendParticipantOtp("emprendedor"))?.stage).toBe("verify");
    expect((await verifyParticipantOtp("emprendedor", "123456"))?.ok).toBe(true);
  });
});
