import { describe, expect, it } from "vitest";
import { annualize, computeFinance, DEFAULT_INPUTS, irr, monthlyRate, npv } from "./finance";

describe("npv", () => {
  it("descuenta cada flujo por su período", () => {
    expect(npv(0.1, [-100, 110])).toBeCloseTo(0, 9);
    expect(npv(0, [-100, 50, 60])).toBe(10);
  });
});

describe("irr", () => {
  it("encuentra la tasa de un caso simple", () => {
    expect(irr([-100, 110]).value).toBeCloseTo(0.1, 6);
    expect(irr([-1000, 300, 400, 500]).value).toBeCloseTo(0.0889633947, 6);
  });

  it("maneja casos sin solución", () => {
    expect(irr([100, 50]).status).toBe("sin_inversion");
    expect(irr([-100, -10, 0]).status).toBe("no_recupera");
    // Recupera solo una parte: existe una TIR, pero negativa.
    expect(irr([-100, 10, 10]).value).toBeLessThan(0);
  });

  it("encuentra TIR muy altas ampliando el rango", () => {
    expect(irr([-1, 50]).value).toBeCloseTo(49, 4);
  });
});

describe("tasas", () => {
  it("convierte anual a mensual y de vuelta", () => {
    expect(annualize(monthlyRate(0.12))).toBeCloseTo(0.12, 10);
  });
});

describe("computeFinance", () => {
  const base = {
    ...DEFAULT_INPUTS,
    investment: 4_000_000,
    price: 10_000,
    units: 100,
    growth: 0,
    variableCost: 4_000,
    fixedCosts: 400_000,
    taxRate: 0,
  };

  it("calcula flujos, recuperación y punto de equilibrio", () => {
    const r = computeFinance(base);
    const s = r.scenarios.base;
    // margen 6.000 × 100 − 400.000 = 200.000 al mes
    expect(s.cashFlows[0]).toBe(-4_000_000);
    expect(s.cashFlows[1]).toBe(200_000);
    expect(s.paybackMonth).toBe(20);
    expect(r.breakEvenUnits).toBe(67);
    expect(s.breakEvenMonth).toBe(1);
    expect(s.revenueByYear[0]).toBe(12_000_000);
    expect(s.irr.status).toBe("ok");
  });

  it("los escenarios quedan ordenados y la contingencia empeora la caja", () => {
    const r = computeFinance(base).scenarios;
    expect(r.pesimista.npv).toBeLessThan(r.base.npv);
    expect(r.optimista.npv).toBeGreaterThan(r.base.npv);
    expect(r.contingencia.minCumulative).toBeLessThan(r.base.minCumulative);
    expect(r.contingencia.cashFlows[1]).toBe(-800_000); // sin cobrar aún: paga 400.000 variables + 400.000 fijos
  });

  it("aplica impuesto solo después de absorber las pérdidas", () => {
    const r = computeFinance({ ...base, taxRate: 0.25, units: 50 }); // pierde 100.000/mes
    expect(r.scenarios.base.netByYear[0]).toBe(-1_200_000);
    const g = computeFinance({ ...base, taxRate: 0.25 });
    expect(g.scenarios.base.cashFlows[1]).toBe(150_000);
  });

  it("sin margen unitario no hay punto de equilibrio", () => {
    expect(computeFinance({ ...base, variableCost: 12_000 }).breakEvenUnits).toBeNull();
  });
});
