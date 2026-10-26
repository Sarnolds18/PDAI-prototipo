// Proyecto de ejemplo para el test A/B de evaluadores (H2, H3, H5).
// Es FICTICIO e inspirado en un caso del Hito 1 (Anexo 7: panel con IA para la gestión ambiental
// en minería y puertos que no logró financiamiento externo). El mismo proyecto se muestra en ambas versiones:
//   A = contacto en frío (texto breve, sin números)
//   B = ficha estandarizada (perfil validado + indicadores)
// Para usar un proyecto real, reemplaza estos datos con permiso de su autor.

import type { FichaData } from "@/components/ficha-view";
import { computeFinance, DEFAULT_INPUTS, summarize, type FinanceInputs } from "./finance";

export const EXAMPLE_INPUTS: FinanceInputs = {
  ...DEFAULT_INPUTS,
  investment: 18_000_000,
  price: 650_000, // suscripción mensual por faena o terminal
  units: 3,
  growth: 0.06,
  variableCost: 90_000,
  fixedCosts: 3_300_000,
  taxRate: 0.25,
  discountRate: 0.12,
};

export const EXAMPLE_COLD_MESSAGE = {
  from: "Ignacia Paredes",
  subject: "Proyecto de monitoreo ambiental con IA",
  body: [
    "Hola, ¿cómo estás?",
    "Me llamo Ignacia y estoy desarrollando Vigía, una plataforma con inteligencia artificial para monitorear el impacto ambiental en faenas mineras y puertos.",
    "Creo que tiene mucho potencial y que puede ayudar a muchas empresas. Me encantaría contarte más y saber tu opinión.",
    "¿Podríamos juntarnos un rato esta semana o la próxima?",
    "¡Muchas gracias!",
  ],
};

export function exampleFicha(): FichaData {
  return {
    projectName: "Vigía",
    founderName: "Ignacia Paredes",
    region: "Antofagasta",
    industry: "mineria",
    stage: "validacion",
    seeking: ["socio", "inversion"],
    skills: [
      { skill: "software", level: 3, evidence_type: "linkedin", evidence: "linkedin.com/in/ejemplo-vigia" },
      { skill: "tecnico_rubro", level: 2, evidence_type: "certificado", evidence: "Diplomado en Gestión Ambiental Minera (2024)" },
      { skill: "producto", level: 2, evidence_type: "referencia", evidence: "Ex jefe de proyecto" },
    ],
    problem:
      "Las faenas y puertos deben reportar emisiones de material particulado, pero hoy lo consolidan a mano desde varios sensores, con días de atraso y riesgo de multas.",
    solution:
      "Plataforma que lee los sensores existentes, alerta en tiempo real cuando se acerca un límite y genera el reporte para la autoridad en un clic.",
    customer: "Jefaturas de medio ambiente de faenas medianas y terminales portuarios del norte. Pagan una suscripción mensual por instalación.",
    traction: "Piloto de 3 meses en una faena mediana en Antofagasta y 14 entrevistas con jefes de medio ambiente.",
    finance: { summary: summarize(computeFinance(EXAMPLE_INPUTS)), discountRate: EXAMPLE_INPUTS.discountRate },
    generatedAt: "Proyecto de ejemplo",
  };
}
