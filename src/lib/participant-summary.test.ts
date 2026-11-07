import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireParticipant: vi.fn(),
  loadMatches: vi.fn(),
  filters: [] as { table: string; field: string; value: string }[],
  tables: [] as string[],
  errorTable: "",
}));
vi.mock("server-only", () => ({}));
vi.mock("./session", () => ({ requireParticipant: mocks.requireParticipant }));
vi.mock("./connections", () => ({ loadMatches: mocks.loadMatches }));
vi.mock("./supabase", () => ({ db: () => ({ from: (table: string) => {
  mocks.tables.push(table);
  const result = Promise.resolve({ data: table === "match_suggestions" ? [] : null, error: mocks.errorTable === table ? { message: "offline" } : null });
  const query = {
    select: () => query,
    eq: (field: string, value: string) => { mocks.filters.push({ table, field, value }); return query; },
    maybeSingle: () => result,
    then: result.then.bind(result),
  };
  return query;
} }) }));

import { loadEntrepreneurSummary, loadEvaluatorSummary } from "./participant-summary";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.filters.length = 0;
  mocks.tables.length = 0;
  mocks.errorTable = "";
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
