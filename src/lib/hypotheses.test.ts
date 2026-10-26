import { describe, expect, it } from "vitest";
import { computeHypotheses, median, type Rows } from "./hypotheses";

const empty: Rows = { participants: [], profiles: [], finance: [], suggestions: [], feedback: [], evaluations: [], pacts: [] };

const ids = (n: number, prefix = "p") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe("computeHypotheses", () => {
  it("sin datos todo queda en datos insuficientes", () => {
    const { results } = computeHypotheses(empty, 5);
    expect(results.map((r) => r.status)).toEqual(Array(6).fill("insuficiente"));
  });

  it("H1 valida con ≥70 % y promedio ≥4, y excluye sesiones de prueba", () => {
    const real = ids(10);
    const rows: Rows = {
      ...empty,
      participants: [...real.map((id) => ({ id, role: "emprendedor", is_test: false })), { id: "t", role: "emprendedor", is_test: true }],
      feedback: [...real.map((id, i) => ({ participant_id: id, would_use: i < 7 })), { participant_id: "t", would_use: false }],
      suggestions: [...real.map((id) => ({ participant_id: id, rating: 4 })), { participant_id: "t", rating: 1 }],
    };
    const h1 = computeHypotheses(rows, 5).results[0];
    expect(h1.criteria[0].value).toBe(0.7);
    expect(h1.criteria[1].value).toBe(4);
    expect(h1.status).toBe("validada");
  });

  it("H6 no valida si la mediana supera 10 minutos", () => {
    const real = ids(5);
    const rows: Rows = {
      ...empty,
      participants: real.map((id) => ({ id, role: "emprendedor", is_test: false })),
      profiles: real.map((id, i) => ({ participant_id: id, completed: true, needed_help: false, duration_s: 500 + i * 100 })),
    };
    const h6 = computeHypotheses(rows, 5).results[5];
    expect(h6.criteria[1].value).toBe(700);
    expect(h6.status).toBe("no_validada");
  });

  it("H3 compara defendible B vs A solo con respuestas", () => {
    const ev = (id: string, variant: "A" | "B", defensibility: number) => ({
      participant_id: id,
      variant,
      meeting_score: 3,
      meeting_yes: true,
      defensibility,
      would_receive: true,
      preferred: null,
      answered_at: "2026-10-26",
    });
    const rows: Rows = {
      ...empty,
      evaluations: [ev("a1", "A", 2), ev("a2", "A", 3), ev("a3", "A", 2), ev("b1", "B", 4), ev("b2", "B", 5), ev("b3", "B", 4)],
    };
    const { results, extras } = computeHypotheses(rows, 5);
    expect(results[2].criteria[1].value).toBeCloseTo(2, 6);
    expect(results[2].criteria[1].pass).toBe(true);
    expect(extras.meetingByVariant.A.n).toBe(3);
  });
});

describe("median", () => {
  it("par e impar", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
