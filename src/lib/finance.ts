// Modelo financiero de la plantilla guiada. Funciones puras, sin dependencias: se prueban en finance.test.ts.
//
// Supuestos (se explican en la UI):
// - Horizonte de 36 meses; mes 0 = inversión inicial. Sin valor terminal.
// - Las unidades crecen a una tasa mensual constante durante los 36 meses.
// - Impuesto sobre la utilidad con arrastre de pérdidas (no se paga mientras haya pérdidas acumuladas).
// - La tasa de descuento anual se convierte a mensual: (1 + r)^(1/12) − 1.
// - Contingencia: escenario base, pero los clientes pagan con N días de atraso (los costos se pagan igual).

export type FinanceInputs = {
  investment: number; // inversión inicial (CLP)
  price: number; // precio por unidad (CLP)
  units: number; // unidades vendidas en el mes 1
  growth: number; // crecimiento mensual de unidades (fracción, 0.05 = 5 %)
  variableCost: number; // costo variable por unidad (CLP)
  fixedCosts: number; // costos fijos mensuales (CLP)
  taxRate: number; // impuesto sobre la utilidad (fracción)
  discountRate: number; // tasa de descuento anual (fracción)
  pessimistic: number; // ajuste de ventas pesimista (fracción, −0.30)
  optimistic: number; // ajuste de ventas optimista (fracción, 0.20)
  paymentDelayDays: number; // atraso de pagos en contingencia (días)
};

export const DEFAULT_INPUTS: FinanceInputs = {
  investment: 0,
  price: 0,
  units: 0,
  growth: 0.03,
  variableCost: 0,
  fixedCosts: 0,
  taxRate: 0,
  discountRate: 0.12,
  pessimistic: -0.3,
  optimistic: 0.2,
  paymentDelayDays: 60,
};

export const HORIZON = 36;

export type ScenarioKey = "pesimista" | "base" | "optimista" | "contingencia";
export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  pesimista: "Pesimista",
  base: "Base",
  optimista: "Optimista",
  contingencia: "Contingencia",
};

export type IrrResult = { value: number | null; status: "ok" | "sin_inversion" | "no_recupera" | "sin_solucion" };

export type ScenarioResult = {
  cashFlows: number[]; // índice 0..36
  cumulative: number[];
  npv: number;
  irr: IrrResult; // anual
  paybackMonth: number | null;
  breakEvenMonth: number | null; // primer mes con utilidad operacional ≥ 0
  revenueByYear: [number, number, number];
  netByYear: [number, number, number];
  marginByYear: [number | null, number | null, number | null];
  minCumulative: number; // capital que hay que tener para no quedar en rojo
};

export type FinanceResults = {
  scenarios: Record<ScenarioKey, ScenarioResult>;
  breakEvenUnits: number | null; // unidades/mes para cubrir costos fijos
  unitMargin: number;
};

export const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;
export const annualize = (monthly: number) => Math.pow(1 + monthly, 12) - 1;

export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

/**
 * TIR por bisección sobre el VAN. Devuelve la tasa por período (mensual si los flujos son mensuales).
 * Casos sin solución: sin inversión (todos los flujos ≥ 0), nunca recupera (todos ≤ 0 tras invertir)
 * o el VAN no cambia de signo en el rango buscado.
 */
export function irr(flows: number[]): IrrResult {
  const hasNeg = flows.some((f) => f < 0);
  const hasPos = flows.some((f) => f > 0);
  if (!hasNeg) return { value: null, status: "sin_inversion" };
  if (!hasPos) return { value: null, status: "no_recupera" };

  let lo = -0.99;
  let hi = 1;
  let fLo = npv(lo, flows);
  let fHi = npv(hi, flows);
  // Amplía el techo si la rentabilidad es muy alta.
  while (Math.sign(fLo) === Math.sign(fHi) && hi < 1e4) {
    hi *= 4;
    fHi = npv(hi, flows);
  }
  if (Math.sign(fLo) === Math.sign(fHi)) {
    return { value: null, status: npv(0, flows) < 0 ? "no_recupera" : "sin_solucion" };
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-12) return { value: mid, status: "ok" };
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return { value: (lo + hi) / 2, status: "ok" };
}

function simulate(inp: FinanceInputs, salesAdj: number, delayMonths: number): ScenarioResult {
  const rate = monthlyRate(inp.discountRate);
  const revenue: number[] = [];
  const operating: number[] = [];
  const taxes: number[] = [];
  let lossPool = 0;

  for (let t = 1; t <= HORIZON; t++) {
    const units = Math.max(0, inp.units * Math.pow(1 + inp.growth, t - 1) * (1 + salesAdj));
    const rev = units * inp.price;
    const op = rev - units * inp.variableCost - inp.fixedCosts;
    let tax = 0;
    if (op < 0) lossPool += -op;
    else {
      const taxable = Math.max(0, op - lossPool);
      lossPool = Math.max(0, lossPool - op);
      tax = taxable * inp.taxRate;
    }
    revenue.push(rev);
    operating.push(op);
    taxes.push(tax);
  }

  // Flujo de caja: la cobranza puede llegar desplazada (contingencia); costos e impuestos se pagan en su mes.
  const cashFlows = [-inp.investment];
  for (let t = 1; t <= HORIZON; t++) {
    const i = t - 1;
    const collectedIdx = i - delayMonths;
    const collected = collectedIdx >= 0 ? revenue[collectedIdx] : 0;
    const costs = revenue[i] - operating[i]; // variables + fijos
    cashFlows.push(collected - costs - taxes[i]);
  }

  const cumulative: number[] = [];
  cashFlows.reduce((acc, cf) => {
    const next = acc + cf;
    cumulative.push(next);
    return next;
  }, 0);

  const paybackIdx = cumulative.findIndex((c, t) => t > 0 && c >= 0 && cumulative.slice(t).every((x) => x >= 0));
  const beIdx = operating.findIndex((o) => o >= 0);

  const byYear = (arr: number[]) =>
    [0, 1, 2].map((y) => arr.slice(y * 12, y * 12 + 12).reduce((a, b) => a + b, 0)) as [number, number, number];
  const revenueByYear = byYear(revenue);
  const netByYear = byYear(operating.map((o, i) => o - taxes[i]));
  const irrMonthly = irr(cashFlows);

  return {
    cashFlows,
    cumulative,
    npv: npv(rate, cashFlows),
    irr: irrMonthly.value === null ? irrMonthly : { value: annualize(irrMonthly.value), status: "ok" },
    paybackMonth: inp.investment > 0 && paybackIdx > 0 ? paybackIdx : null,
    breakEvenMonth: beIdx >= 0 ? beIdx + 1 : null,
    revenueByYear,
    netByYear,
    marginByYear: revenueByYear.map((r, i) => (r > 0 ? netByYear[i] / r : null)) as [number | null, number | null, number | null],
    minCumulative: Math.min(0, ...cumulative),
  };
}

export function computeFinance(inp: FinanceInputs): FinanceResults {
  const unitMargin = inp.price - inp.variableCost;
  const delayMonths = Math.max(0, Math.round(inp.paymentDelayDays / 30));
  return {
    scenarios: {
      pesimista: simulate(inp, inp.pessimistic, 0),
      base: simulate(inp, 0, 0),
      optimista: simulate(inp, inp.optimistic, 0),
      contingencia: simulate(inp, 0, delayMonths),
    },
    breakEvenUnits: unitMargin > 0 ? Math.ceil(inp.fixedCosts / unitMargin) : null,
    unitMargin,
  };
}

/** Resumen compacto que se guarda en la base y se muestra en la ficha (sin los 37 flujos por escenario). */
export function summarize(res: FinanceResults) {
  const pick = (s: ScenarioResult) => ({
    npv: s.npv,
    irr: s.irr.value,
    irr_status: s.irr.status,
    payback_month: s.paybackMonth,
    break_even_month: s.breakEvenMonth,
    revenue_by_year: s.revenueByYear,
    net_by_year: s.netByYear,
    margin_by_year: s.marginByYear,
    min_cumulative: s.minCumulative,
    cumulative: s.cumulative.map((v) => Math.round(v)),
  });
  return {
    break_even_units: res.breakEvenUnits,
    unit_margin: res.unitMargin,
    scenarios: Object.fromEntries(Object.entries(res.scenarios).map(([k, v]) => [k, pick(v)])) as Record<ScenarioKey, ReturnType<typeof pick>>,
  };
}
export type FinanceSummary = ReturnType<typeof summarize>;

export const IRR_STATUS_TEXT: Record<IrrResult["status"], string> = {
  ok: "",
  sin_inversion: "Sin inversión inicial, la TIR no aplica",
  no_recupera: "No recupera la inversión en 3 años",
  sin_solucion: "Los flujos no tienen una TIR única",
};
