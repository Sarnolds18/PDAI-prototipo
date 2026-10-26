// Pacto de socios estandarizado: tipos, valores por defecto y opciones.
// Valores por defecto tomados de las entrevistas: vesting 4 años + cliff 1 año (Anexo 12),
// dedicación explícita (Anexo 11: el equipo se cayó porque no todos podían dedicar el 100 %).

export const PACT_ROLES = {
  ceo: "Dirección general (CEO)",
  comercial: "Comercial y ventas",
  tecnico: "Técnico / producto (CTO)",
  operaciones: "Operaciones",
  finanzas: "Finanzas",
  otro: "Otro",
} as const;

export const LEAVE_RULES = {
  devuelve_no_consolidado: "Las acciones no consolidadas (vesting) vuelven a la sociedad",
  antes_cliff_nada: "Si sale antes del cliff, no conserva participación",
  compra_preferente: "El otro socio tiene derecho preferente a comprar sus acciones",
  no_competencia: "No compite con el proyecto por 12 meses",
} as const;

export const DECISION_RULES = {
  unanimidad: "Unanimidad para decisiones grandes (nuevos socios, deuda, vender)",
  mayoria: "Mayoría simple para todo",
  roles: "Cada uno decide en su área; lo grande, por unanimidad",
} as const;

export type Partner = {
  name: string;
  role: keyof typeof PACT_ROLES | "";
  capital: number; // CLP
  contribution: string; // trabajo, conocimiento, contactos, activos
  dedication: number; // % del tiempo
  equity: number; // %
};

export type PactData = {
  projectName: string;
  partners: [Partner, Partner];
  pool: number; // % reservado para futuros socios o equipo
  vestingYears: number;
  cliffMonths: number;
  decisions: keyof typeof DECISION_RULES | "";
  leaveRules: (keyof typeof LEAVE_RULES)[];
  reviewMonths: number; // cada cuánto revisan el pacto
};

const emptyPartner = (): Partner => ({ name: "", role: "", capital: 0, contribution: "", dedication: 100, equity: 50 });

export const DEFAULT_PACT: PactData = {
  projectName: "",
  partners: [emptyPartner(), emptyPartner()],
  pool: 0,
  vestingYears: 4,
  cliffMonths: 12,
  decisions: "",
  leaveRules: ["devuelve_no_consolidado", "antes_cliff_nada"],
  reviewMonths: 6,
};

/** Alerta cuando el reparto se aleja mucho del aporte (dedicación + capital). Wasserman (2012). */
export function equityWarning(p: PactData): string | null {
  const [a, b] = p.partners;
  const totalDed = a.dedication + b.dedication;
  const totalCap = a.capital + b.capital;
  if (totalDed === 0) return null;
  // Aporte relativo de A: mitad dedicación, mitad capital (si hay capital).
  const dedShare = a.dedication / totalDed;
  const contribA = totalCap > 0 ? 0.5 * dedShare + 0.5 * (a.capital / totalCap) : dedShare;
  const equityA = a.equity / Math.max(1, a.equity + b.equity);
  if (Math.abs(contribA - equityA) <= 0.25) return null;
  const [more, less] = contribA > equityA ? [a, b] : [b, a];
  return `${more.name || "Un socio"} aporta bastante más de lo que recibe frente a ${less.name || "el otro"}. Conversen si el reparto es justo: es la causa más común de conflictos.`;
}
