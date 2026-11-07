import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireParticipant: vi.fn(),
  loadMatches: vi.fn(),
  isAdmin: vi.fn(),
  adminParticipant: null as null | { id: string; role: string; code: string },
  filters: [] as { table: string; field: string; value: string }[],
  tables: [] as string[],
  errorTable: "",
}));
vi.mock("server-only", () => ({}));
vi.mock("./admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("./session", () => ({ requireParticipant: mocks.requireParticipant }));
vi.mock("./connections", () => ({ loadMatches: mocks.loadMatches }));
vi.mock("./supabase", () => ({ db: () => ({ from: (table: string) => {
  mocks.tables.push(table);
  const result = Promise.resolve({ data: table === "participants" ? mocks.adminParticipant : table === "match_suggestions" ? [] : null, error: mocks.errorTable === table ? { message: "offline" } : null });
  const query = {
    select: () => query,
    eq: (field: string, value: string) => { mocks.filters.push({ table, field, value }); return query; },
    maybeSingle: () => result,
    then: result.then.bind(result),
  };
  return query;
} }) }));

import { loadAdminParticipantSummary, loadEntrepreneurSummary, loadEvaluatorSummary } from "./participant-summary";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.filters.length = 0;
  mocks.tables.length = 0;
  mocks.errorTable = "";
  mocks.isAdmin.mockResolvedValue(false);
  mocks.adminParticipant = null;
  mocks.requireParticipant.mockResolvedValue({ id: "own-session-id", name: "Participante" });
  mocks.loadMatches.mockResolvedValue(null);
});

describe("resúmenes personales", () => {
  it("limita todas las consultas del emprendedor a la identidad de su sesión", async () => {
    const summary = await loadEntrepreneurSummary();
    expect(mocks.requireParticipant).toHaveBeenCalledWith("emprendedor");
    expect(mocks.filters).toHaveLength(5);
    for (const filter of mocks.filters) expect(filter).toMatchObject({ field: "participant_id", value: "own-session-id" });
    expect(mocks.loadMatches).toHaveBeenCalledWith("own-session-id");
    expect(summary.finance).toBeNull();
    expect(summary.pact).toBeNull();
    expect(summary.connectionsCompleted).toBe(false);
  });

  it("solo carga la propia evaluación, sin consultar proyectos reales", async () => {
    const summary = await loadEvaluatorSummary();
    expect(mocks.requireParticipant).toHaveBeenCalledWith("evaluador");
    expect(mocks.tables).toEqual(["evaluations"]);
    expect(mocks.filters).toEqual([{ table: "evaluations", field: "participant_id", value: "own-session-id" }]);
    expect(summary.evaluation).toBeNull();
    expect(mocks.loadMatches).not.toHaveBeenCalled();
  });

  it("no consulta datos sin una sesión del rol requerido", async () => {
    mocks.requireParticipant.mockRejectedValue(new Error("Sesión no encontrada"));
    await expect(loadEntrepreneurSummary()).rejects.toThrow("Sesión no encontrada");
    await expect(loadEvaluatorSummary()).rejects.toThrow("Sesión no encontrada");
    expect(mocks.tables).toEqual([]);
  });

  it("informa fallos de lectura en lugar de presentar datos incompletos como pendientes", async () => {
    mocks.errorTable = "financial_models";
    await expect(loadEntrepreneurSummary()).rejects.toThrow("No pudimos cargar");
    mocks.errorTable = "evaluations";
    await expect(loadEvaluatorSummary()).rejects.toThrow("No pudimos cargar");
  });
});


describe("consulta administrativa de perfiles", () => {
  it("rechaza consultar IDs ajenos sin autorización de administrador, antes de consultar datos", async () => {
    await expect(loadAdminParticipantSummary("someone-else")).rejects.toThrow("No autorizado");
    expect(mocks.tables).toEqual([]);
  });

  it("permite al admin leer el perfil seleccionado sin cambiar su sesión de participante", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.adminParticipant = { id: "selected-person", role: "emprendedor", code: "ER-TEST" };
    const result = await loadAdminParticipantSummary("selected-person");
    expect(result?.role).toBe("emprendedor");
    expect(mocks.filters[0]).toEqual({ table: "participants", field: "id", value: "selected-person" });
    for (const filter of mocks.filters.slice(1)) expect(filter.value).toBe("selected-person");
    expect(mocks.requireParticipant).not.toHaveBeenCalled();
  });

  it("separa los perfiles de evaluadores al consultarlos desde admin", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.adminParticipant = { id: "selected-evaluator", role: "evaluador", code: "ER-TEST" };
    const result = await loadAdminParticipantSummary("selected-evaluator");
    expect(result?.role).toBe("evaluador");
    expect(mocks.tables).toEqual(["participants", "evaluations"]);
    expect(mocks.filters[1].value).toBe("selected-evaluator");
  });
});
