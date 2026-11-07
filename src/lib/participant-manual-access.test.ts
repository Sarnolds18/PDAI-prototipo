import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  admin: false, session: vi.fn(), from: vi.fn(),
  settings: new Map<string, { participant_id: string; token_hash: string; expires_at: string }>(),
  person: { id: "own-id", email: "owner@example.cl", role: "emprendedor" },
  inserted: [] as Record<string, unknown>[],
}));
vi.mock("server-only", () => ({}));
vi.mock("./admin", () => ({ isAdmin: async () => m.admin }));
vi.mock("./session", () => ({ setSession: m.session }));
vi.mock("./supabase", () => ({ db: () => ({ from: m.from }) }));

import { generateRecoveryCode, recoverParticipant, registerParticipant } from "./participant-manual-access";
import { emailOtpEnabled } from "./access-mode";

beforeEach(() => {
  vi.clearAllMocks(); m.admin = false; m.settings.clear(); m.inserted.length = 0;
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("PARTICIPANT_EMAIL_OTP_ENABLED", "false");
  m.from.mockImplementation((table: string) => {
    const filters = new Map<string, string>();
    let deleting = false;
    const q = {
      select: () => q,
      eq: (key: string, value: string) => { filters.set(key, value); return q; },
      like: () => q,
      delete: () => { deleting = true; return q; },
      insert: (payload: Record<string, unknown>) => { m.inserted.push(payload); return q; },
      single: async () => ({ data: { id: "new-id" }, error: null }),
      upsert: async (row: { key: string; value: { participant_id: string; token_hash: string; expires_at: string } }) => {
        m.settings.set(row.key, row.value); return { error: null };
      },
      maybeSingle: async () => {
        if (table === "participants") {
          const matches = [...filters].every(([key, value]) => m.person[key as keyof typeof m.person] === value);
          return { data: matches ? { ...m.person } : null, error: null };
        }
        const match = [...m.settings].find(([key, value]) =>
          (!filters.has("key") || filters.get("key") === key)
          && (!filters.has("value->>token_hash") || filters.get("value->>token_hash") === value.token_hash));
        if (!match) return { data: null, error: null };
        if (deleting) m.settings.delete(match[0]);
        return { data: { key: match[0], value: { ...match[1] } }, error: null };
      },
    };
    return q;
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

async function issue() {
  m.admin = true;
  return (await generateRecoveryCode("own-id", true))!.token!;
}

describe("modo pitch y recuperación manual", () => {
  it("mantiene el envío automático apagado salvo habilitación expresa", () => {
    expect(emailOtpEnabled()).toBe(false);
    vi.stubEnv("PARTICIPANT_EMAIL_OTP_ENABLED", "true");
    expect(emailOtpEnabled()).toBe(true);
  });

  it("solo permite a un administrador emitir un código", async () => {
    await expect(generateRecoveryCode("own-id", true)).rejects.toThrow("No autorizado");
    expect(m.from).not.toHaveBeenCalled();
    m.admin = true;
    expect((await generateRecoveryCode("own-id", false))?.error).toBeTruthy();
    expect(m.settings.size).toBe(0);
  });

  it("guarda un hash del código, nunca el código original", async () => {
    const token = await issue();
    expect(token).toMatch(/^REC-[A-F0-9]{24}$/);
    const stored = [...m.settings.values()][0];
    expect(stored.token_hash).not.toBe(token);
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("no admite el identificador ER ni un correo o rol ajeno", async () => {
    const token = await issue();
    expect((await recoverParticipant("emprendedor", "owner@example.cl", "ER-ABCD"))?.ok).not.toBe(true);
    expect((await recoverParticipant("emprendedor", "other@example.cl", token))?.ok).not.toBe(true);
    expect((await recoverParticipant("evaluador", "owner@example.cl", token))?.ok).not.toBe(true);
    expect(m.session).not.toHaveBeenCalled();
    expect(m.settings.size).toBe(1);
  });

  it("abre únicamente el perfil elegido por el admin y consume el código", async () => {
    const token = await issue();
    expect((await recoverParticipant("emprendedor", " OWNER@example.cl ", token.toLowerCase()))?.ok).toBe(true);
    expect(m.session).toHaveBeenCalledWith("emprendedor", "own-id");
    expect((await recoverParticipant("emprendedor", "owner@example.cl", token))?.ok).not.toBe(true);
    expect(m.session).toHaveBeenCalledTimes(1);
  });

  it("solo permite un uso incluso con dos solicitudes simultáneas", async () => {
    const token = await issue();
    const results = await Promise.all([
      recoverParticipant("emprendedor", "owner@example.cl", token),
      recoverParticipant("emprendedor", "owner@example.cl", token),
    ]);
    expect(results.filter((result) => result?.ok)).toHaveLength(1);
    expect(m.session).toHaveBeenCalledTimes(1);
  });

  it("vence a la hora y generar otro invalida el anterior", async () => {
    vi.useFakeTimers();
    const expired = await issue();
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect((await recoverParticipant("emprendedor", "owner@example.cl", expired))?.ok).not.toBe(true);
    const previous = await issue();
    const current = await issue();
    expect((await recoverParticipant("emprendedor", "owner@example.cl", previous))?.ok).not.toBe(true);
    expect((await recoverParticipant("emprendedor", "owner@example.cl", current))?.ok).toBe(true);
  });

  it("el registro inicial abre solo el nuevo ID y nunca recupera un perfil por escribir su correo", async () => {
    await registerParticipant({ role: "emprendedor", email: "owner@example.cl", name: "Nombre", consent: true, isTest: false });
    expect(m.session).toHaveBeenCalledWith("emprendedor", "new-id");
    expect(m.session).not.toHaveBeenCalledWith("emprendedor", "own-id");
    expect(m.inserted).toHaveLength(1);
  });
});
