// DATOS DE DEMOSTRACIÓN · simulados a partir de las 17 entrevistas del Hito 1.
//
// NO son resultados de validación: nadie respondió estas preguntas en la plataforma.
// Los perfiles (rubro, cargo, proyecto, dolores) salen de lo que dijo cada entrevistado; las respuestas
// (calificaciones, preferencias A/B, tiempos, números financieros) son SIMULADAS y coherentes con su postura.
// Se identifican por el código DEMO-NN, se guardan con is_test = true y el dashboard solo los muestra
// en la vista «Demo», con un cartel visible. Los nombres están anonimizados (Anexo N · cargo · rubro).

import type { FinanceInputs } from "./finance";
import { DEFAULT_INPUTS } from "./finance";
import type { PactData } from "./pact";
import type { ProfileData } from "./types";

export const DEMO_PREFIX = "DEMO-";

export type DemoEntrepreneur = {
  anexo: number;
  name: string;
  profile: ProfileData;
  durationS: number;
  neededHelp: boolean;
  finance: { inputs: FinanceInputs; completed: boolean; lastStep: number; neededHelp: boolean; helpOpens: number; durationS: number } | null;
  ratings: number[]; // en orden de las sugerencias (socios, mentores, inversionistas)
  feedback: { wouldUse: boolean; wtp: string | null; comment: string | null } | null;
  pact: { data: PactData; completed: boolean; wouldUse: boolean | null; lastStep: number } | null;
};

export type DemoEvaluator = {
  anexo: number;
  name: string;
  type: "mentor" | "inversionista" | "ejecutivo" | "academico" | "otro";
  variant: "A" | "B";
  meetingScore: number;
  meetingYes: boolean;
  defensibility: number;
  wouldReceive: boolean;
  comment: string | null;
  preferred: "A" | "B" | null; // null = prefirió no comparar
  preferredWhy: string | null;
};

const fin = (over: Partial<FinanceInputs>): FinanceInputs => ({ ...DEFAULT_INPUTS, taxRate: 0.25, ...over });

export const DEMO_ENTREPRENEURS: DemoEntrepreneur[] = [
  {
    // Anexo 4: co-fundadora en cosmetología; dolor principal: permisos, certificaciones y arriendo sin operar.
    anexo: 4,
    name: "Anexo 4 · Co-fundadora · Cosmetología",
    profile: {
      age_range: "25-34",
      region: "Metropolitana",
      industry: "salud",
      stage: "primeras_ventas",
      seeking: ["mentor", "inversion"],
      skills: [
        { skill: "marketing", level: 3, evidence_type: "referencia", evidence: "Clienta frecuente · contacto disponible" },
        { skill: "producto", level: 2, evidence_type: "certificado", evidence: "Certificación en estética facial" },
      ],
      project_name: "Centro de estética (Anexo 4)",
      problem: "Tratamientos estéticos con profesional certificado son caros y difíciles de agendar en comunas fuera del centro.",
      solution: "Centro de estética con tratamientos certificados y agenda online, partiendo desde un espacio pequeño.",
      customer: "Mujeres de 25 a 45 años de la comuna y alrededores.",
      traction: "Primeras clientas recurrentes; un tratamiento tuvo que externalizarse por falta de profesional certificado.",
      main_obstacle: "tramites",
    },
    durationS: 412,
    neededHelp: false,
    finance: {
      inputs: fin({ investment: 6_000_000, price: 45_000, units: 60, growth: 0.04, variableCost: 12_000, fixedCosts: 1_800_000 }),
      completed: true,
      lastStep: 5,
      neededHelp: false,
      helpOpens: 2,
      durationS: 540,
    },
    ratings: [3, 4, 3, 4, 5, 3, 4, 3, 3],
    feedback: { wouldUse: false, wtp: "0", comment: "Mi problema hoy son los permisos más que los contactos." },
    pact: null,
  },
  {
    // Anexo 11: equipo universitario; financiamiento exigía 100 % de dedicación y el equipo se cayó.
    anexo: 11,
    name: "Anexo 11 · Director de área · Medios universitarios",
    profile: {
      age_range: "18-24",
      region: "Metropolitana",
      industry: "tecnologia",
      stage: "validacion",
      seeking: ["socio", "mentor"],
      skills: [
        { skill: "marketing", level: 3, evidence_type: "referencia", evidence: "Ex director del medio · contacto disponible" },
        { skill: "gestion", level: 2, evidence_type: "referencia", evidence: "Profesor guía · contacto disponible" },
      ],
      project_name: "Red de proyectos universitarios (Anexo 11)",
      problem: "Es difícil encontrar qué empresas o proyectos trabajan en un área para sumarse o crecer con ellos.",
      solution: "Directorio de proyectos y empresas por área, con perfiles comparables y contacto directo.",
      customer: "Estudiantes emprendedores y empresas que buscan proyectos con los que colaborar.",
      traction: "Prototipo usado por un grupo de estudiantes de la universidad.",
      main_obstacle: "socios",
    },
    durationS: 365,
    neededHelp: false,
    finance: {
      inputs: fin({ investment: 8_000_000, price: 250_000, units: 4, growth: 0.07, variableCost: 30_000, fixedCosts: 1_200_000 }),
      completed: true,
      lastStep: 5,
      neededHelp: false,
      helpOpens: 4,
      durationS: 610,
    },
    ratings: [5, 4, 4, 4, 4, 3, 3, 4, 3],
    feedback: { wouldUse: true, wtp: "1-5000", comment: "Útil si hay suficientes perfiles en mi área." },
    pact: {
      data: {
        projectName: "Red de proyectos universitarios (Anexo 11)",
        partners: [
          { name: "Fundador A", role: "ceo", capital: 0, contribution: "Producto y alianzas con la universidad", dedication: 100, equity: 50 },
          { name: "Fundador B", role: "tecnico", capital: 0, contribution: "Desarrollo de la plataforma", dedication: 50, equity: 50 },
        ],
        pool: 0,
        vestingYears: 4,
        cliffMonths: 12,
        decisions: "unanimidad",
        leaveRules: ["devuelve_no_consolidado", "antes_cliff_nada"],
        reviewMonths: 6,
      },
      completed: true,
      wouldUse: true,
      lastStep: 5,
    },
  },
  {
    // Anexo 12: CEO y cofundador en energía e IA; levantó ronda por referencias; pacto con vesting 4 años y cliff 1 año.
    anexo: 12,
    name: "Anexo 12 · CEO y cofundador · Energía e IA",
    profile: {
      age_range: "25-34",
      region: "Metropolitana",
      industry: "energia",
      stage: "primeras_ventas",
      seeking: ["inversion", "mentor"],
      skills: [
        { skill: "software", level: 3, evidence_type: "referencia", evidence: "Ex jefe de proyecto · contacto disponible" },
        { skill: "tecnico_rubro", level: 3, evidence_type: "certificado", evidence: "Ingeniería eléctrica (título)" },
        { skill: "levantamiento", level: 2, evidence_type: "referencia", evidence: "Inversionista de la ronda · contacto disponible" },
      ],
      project_name: "Almacenamiento con baterías e IA (Anexo 12)",
      problem: "Los sistemas de almacenamiento con baterías se operan con reglas fijas y pierden ahorro de energía.",
      solution: "Plataforma AI-native que decide cuándo cargar y descargar baterías según precios y consumo.",
      customer: "Empresas con consumo eléctrico alto y proyectos de almacenamiento.",
      traction: "Primeros clientes y una ronda levantada, casi toda por contacto directo.",
      main_obstacle: "contactos",
    },
    durationS: 298,
    neededHelp: false,
    finance: {
      inputs: fin({ investment: 60_000_000, price: 1_800_000, units: 3, growth: 0.06, variableCost: 300_000, fixedCosts: 9_000_000 }),
      completed: true,
      lastStep: 5,
      neededHelp: false,
      helpOpens: 0,
      durationS: 380,
    },
    ratings: [4, 4, 3, 4, 5, 4, 4, 5, 4],
    feedback: { wouldUse: true, wtp: "15001-30000", comment: "Sirve si los inversionistas de verdad están en la red; la referencia directa convierte más." },
    pact: {
      data: {
        projectName: "Almacenamiento con baterías e IA (Anexo 12)",
        partners: [
          { name: "Cofundador A", role: "ceo", capital: 5_000_000, contribution: "Estrategia, ventas y levantamiento", dedication: 100, equity: 45 },
          { name: "Cofundador B", role: "tecnico", capital: 5_000_000, contribution: "Plataforma de IA", dedication: 100, equity: 45 },
        ],
        pool: 10,
        vestingYears: 4,
        cliffMonths: 12,
        decisions: "roles",
        leaveRules: ["devuelve_no_consolidado", "antes_cliff_nada", "compra_preferente"],
        reviewMonths: 6,
      },
      completed: true,
      wouldUse: true,
      lastStep: 5,
    },
  },
  {
    // Anexo 13: socio en manufactura textil B2B y compras públicas; boletas de garantía y pagos lentos limitan la caja.
    anexo: 13,
    name: "Anexo 13 · Socio y gerente · Manufactura textil",
    profile: {
      age_range: "35-44",
      region: "Metropolitana",
      industry: "manufactura",
      stage: "primeras_ventas",
      seeking: ["socio", "mentor"],
      skills: [
        { skill: "comercial", level: 3, evidence_type: "referencia", evidence: "Cliente B2B · contacto disponible" },
        { skill: "operaciones", level: 3, evidence_type: "referencia", evidence: "Proveedor · contacto disponible" },
      ],
      project_name: "Merchandising textil B2B (Anexo 13)",
      problem: "Las empresas y servicios públicos necesitan merchandising a tiempo, pero los proveedores pequeños no dan abasto.",
      solution: "Fabricación textil y merchandising con entregas rápidas para empresas y licitaciones públicas.",
      customer: "Empresas y organismos públicos que compran por licitación.",
      traction: "Ventas recurrentes B2B; las boletas de garantía y la demora en pagos limitan el flujo de caja.",
      main_obstacle: "capital_trabajo",
    },
    durationS: 505,
    neededHelp: false,
    finance: {
      inputs: fin({ investment: 15_000_000, price: 9_000, units: 1_500, growth: 0.03, variableCost: 5_500, fixedCosts: 3_500_000, paymentDelayDays: 90 }),
      completed: true,
      lastStep: 5,
      neededHelp: false,
      helpOpens: 3,
      durationS: 720,
    },
    ratings: [4, 3, 4, 5, 4, 3, 4, 3, 4],
    feedback: { wouldUse: true, wtp: "5001-15000", comment: "Falta una red nacional que conecte proveedores, clientes y emprendedores." },
    pact: null,
  },
  {
    // Anexo 14: dueña en diseño y arquitectura; errores al planificar los montos para iniciar; necesidad de socio financista.
    anexo: 14,
    name: "Anexo 14 · Dueña · Diseño y arquitectura",
    profile: {
      age_range: "45-54",
      region: "Valparaíso",
      industry: "construccion",
      stage: "validacion",
      seeking: ["inversion", "socio"],
      skills: [
        { skill: "producto", level: 3, evidence_type: "certificado", evidence: "Arquitectura (título)" },
        { skill: "gestion", level: 2, evidence_type: "referencia", evidence: "Cliente anterior · contacto disponible" },
      ],
      project_name: "Estudio de diseño sustentable (Anexo 14)",
      problem: "Los proyectos de vivienda no incorporan soluciones de agua y energía sustentables desde el diseño.",
      solution: "Estudio de diseño y arquitectura que integra soluciones sustentables desde el anteproyecto.",
      customer: "Familias e inmobiliarias pequeñas de la V Región.",
      traction: "Primeros proyectos con clientes conocidos.",
      main_obstacle: "numeros",
    },
    durationS: 690,
    neededHelp: true,
    finance: {
      inputs: fin({ investment: 4_000_000, price: 1_200_000, units: 0, variableCost: 350_000, fixedCosts: 1_600_000 }),
      completed: false, // abandonó en el paso de ventas
      lastStep: 1,
      neededHelp: false,
      helpOpens: 2,
      durationS: 0,
    },
    ratings: [4, 3, 3, 3, 4, 3, 5, 4, 3],
    feedback: { wouldUse: true, wtp: "1-5000", comment: "Me ayudaría tener claridad de cuánto necesito antes de partir." },
    pact: null,
  },
  {
    // Anexo 15: socio y desarrollador web; dificultad para estimar costos de desarrollo y valorizar horas.
    anexo: 15,
    name: "Anexo 15 · Socio y desarrollador · Software",
    profile: {
      age_range: "25-34",
      region: "Biobío",
      industry: "tecnologia",
      stage: "primeras_ventas",
      seeking: ["socio"],
      skills: [
        { skill: "software", level: 3, evidence_type: "referencia", evidence: "Cliente de desarrollo · contacto disponible" },
        { skill: "producto", level: 2, evidence_type: "referencia", evidence: "Socio actual · contacto disponible" },
      ],
      project_name: "Desarrollo web para pymes (Anexo 15)",
      problem: "Las pymes necesitan presencia web, pero no saben cuánto cuesta ni qué pedir.",
      solution: "Sitios y sistemas web con precio cerrado por paquete y mantención mensual.",
      customer: "Pymes de servicios de la región.",
      traction: "Clientes activos; cuesta estimar los costos reales de cada desarrollo.",
      main_obstacle: "numeros",
    },
    durationS: 455,
    neededHelp: false,
    finance: {
      inputs: fin({ investment: 3_000_000, price: 900_000, units: 3, growth: 0.05, variableCost: 200_000, fixedCosts: 1_400_000 }),
      completed: true,
      lastStep: 5,
      neededHelp: true,
      helpOpens: 6,
      durationS: 840,
    },
    ratings: [5, 5, 4, 4, 4, 3, 4, 4, 3],
    feedback: { wouldUse: true, wtp: "5001-15000", comment: "Busco un socio comercial; el match por competencias es justo lo que necesito." },
    pact: {
      data: {
        projectName: "Desarrollo web para pymes (Anexo 15)",
        partners: [
          { name: "Socio técnico", role: "tecnico", capital: 1_000_000, contribution: "Desarrollo y mantención", dedication: 100, equity: 60 },
          { name: "Socio comercial", role: "comercial", capital: 2_000_000, contribution: "Ventas y relación con clientes", dedication: 60, equity: 40 },
        ],
        pool: 0,
        vestingYears: 4,
        cliffMonths: 12,
        decisions: "roles",
        leaveRules: ["devuelve_no_consolidado", "no_competencia"],
        reviewMonths: 6,
      },
      completed: false, // se quedó en el paso de reparto
      wouldUse: null,
      lastStep: 2,
    },
  },
];

// Postura de cada evaluador según su entrevista (preguntas 3, 7 y 8 del guion).
export const DEMO_EVALUATORS: DemoEvaluator[] = [
  { anexo: 1, name: "Anexo 1 · Abogado · Energía y minería", type: "ejecutivo", variant: "A", meetingScore: 2, meetingYes: false, defensibility: 2, wouldReceive: true, comment: "Sin estructura financiera clara no sé si es venture capital o deuda.", preferred: "B", preferredWhy: "Muestra credenciales y números; se puede evaluar." },
  { anexo: 2, name: "Anexo 2 · Gerente general · Tecnología", type: "ejecutivo", variant: "B", meetingScore: 5, meetingYes: true, defensibility: 4, wouldReceive: true, comment: "Tiene el flujo de caja que normalmente falta.", preferred: "B", preferredWhy: "Números exactos del modelo financiero." },
  { anexo: 3, name: "Anexo 3 · Jefe de instalaciones · Gas", type: "ejecutivo", variant: "A", meetingScore: 3, meetingYes: true, defensibility: 2, wouldReceive: false, comment: "Se ven ganas, pero falta explicar cómo entra el partner.", preferred: "A", preferredWhy: "Prefiero conversar en persona antes que leer una ficha." },
  { anexo: 5, name: "Anexo 5 · Gerente de construcción · Inmobiliaria", type: "mentor", variant: "B", meetingScore: 4, meetingYes: true, defensibility: 4, wouldReceive: true, comment: "Bien que incluya contingencia por atraso de pagos.", preferred: "B", preferredWhy: "Tiene plan de contingencia y experiencia comprobada." },
  { anexo: 6, name: "Anexo 6 · Gerente · Agrícola", type: "ejecutivo", variant: "A", meetingScore: 2, meetingYes: false, defensibility: 1, wouldReceive: true, comment: "No sé cuánto cuesta ni si es rentable.", preferred: "B", preferredWhy: "Detalla costos e impuestos." },
  { anexo: 7, name: "Anexo 7 · Planner comercial · Retail", type: "ejecutivo", variant: "B", meetingScore: 5, meetingYes: true, defensibility: 5, wouldReceive: true, comment: "Así debería ser toda postulación: directo y con VAN y TIR.", preferred: "B", preferredWhy: "Estandarizado y con indicadores clave." },
  { anexo: 8, name: "Anexo 8 · Jefe de operaciones · Minería", type: "ejecutivo", variant: "A", meetingScore: 2, meetingYes: false, defensibility: 2, wouldReceive: true, comment: "Faltan datos concretos para respaldar la propuesta.", preferred: "B", preferredWhy: "Datos concretos, sin relleno." },
  { anexo: 9, name: "Anexo 9 · Auditor de calidad · Seguridad", type: "mentor", variant: "B", meetingScore: 4, meetingYes: true, defensibility: 4, wouldReceive: true, comment: "Se entiende el problema, el cliente y quién hace qué.", preferred: "B", preferredWhy: "Muestra fortalezas y debilidades del equipo." },
  { anexo: 10, name: "Anexo 10 · Estrategia comercial · Industrial", type: "mentor", variant: "A", meetingScore: 3, meetingYes: false, defensibility: 2, wouldReceive: true, comment: "Una buena presentación genera interés, pero no veo capacidad de ejecución.", preferred: "B", preferredWhy: "Las competencias complementarias se ven de inmediato." },
  { anexo: 16, name: "Anexo 16 · Gerente de nuevos negocios · Comercial y financiera", type: "inversionista", variant: "B", meetingScore: 4, meetingYes: true, defensibility: 5, wouldReceive: true, comment: "Tiene escenario optimista, realista y pesimista.", preferred: "B", preferredWhy: "Números en todos los escenarios." },
  { anexo: 17, name: "Anexo 17 · Socio · Servicios legales", type: "academico", variant: "A", meetingScore: 2, meetingYes: false, defensibility: 2, wouldReceive: false, comment: "Falta estudio de mercado y planificación financiera.", preferred: null, preferredWhy: null },
];
