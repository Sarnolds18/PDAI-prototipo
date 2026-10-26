import { describe, expect, it } from "vitest";
import { scoreMatch, topMatches, type Entrepreneur, type NetworkProfile } from "./matching";

const candidate = (over: Partial<NetworkProfile>): NetworkProfile => ({
  id: over.name ?? "x",
  kind: "socio",
  name: "Camila Fuentes",
  headline: "",
  bio: "",
  region: "Metropolitana",
  industries: ["retail"],
  stages: ["idea"],
  skills: ["finanzas", "comercial"],
  ticket_min: null,
  ticket_max: null,
  is_demo: true,
  ...over,
});

const dev: Entrepreneur = {
  industry: "retail",
  stage: "idea",
  region: "Valparaíso",
  seeking: ["socio"],
  skills: [{ skill: "software", level: 3, evidence_type: "linkedin", evidence: "x" }],
};

describe("scoreMatch", () => {
  it("premia la complementariedad, el área, la etapa y lo que busca", () => {
    const m = scoreMatch(dev, candidate({}));
    expect(m.score).toBe(30 + 25 + 15 + 15);
    expect(m.summary).toMatch(/^Te sugerimos a Camila porque aporta finanzas y proyecciones y ventas y desarrollo comercial/);
  });

  it("no suma complementariedad si el candidato tiene lo mismo", () => {
    const m = scoreMatch(dev, candidate({ skills: ["software"], industries: ["mineria"] }));
    expect(m.parts.find((p) => p.key === "complementariedad")?.points).toBe(0);
    expect(m.parts.find((p) => p.key === "area")?.points).toBe(0);
  });

  it("cuenta como refuerzo una competencia en nivel básico", () => {
    const e = { ...dev, skills: [{ skill: "finanzas" as const, level: 1 as const, evidence_type: "linkedin" as const, evidence: "x" }] };
    const m = scoreMatch(e, candidate({ skills: ["finanzas"] }));
    expect(m.parts[0].points).toBe(8);
  });

  it("da bonus por misma región sin pasar de 100", () => {
    const m = scoreMatch({ ...dev, region: "Metropolitana" }, candidate({ skills: ["finanzas", "comercial", "marketing", "legal"] }));
    expect(m.score).toBe(100);
  });
});

describe("topMatches", () => {
  it("separa por tipo y ordena por puntaje", () => {
    const res = topMatches(dev, [
      candidate({ name: "A Uno", industries: ["mineria"] }),
      candidate({ name: "B Dos" }),
      candidate({ name: "C Tres", kind: "mentor" }),
    ]);
    expect(res.socio.map((m) => m.profile.name)).toEqual(["B Dos", "A Uno"]);
    expect(res.mentor).toHaveLength(1);
    expect(res.inversionista).toHaveLength(0);
  });
});
