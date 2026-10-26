// Catálogos compartidos por formularios, matching, ficha y dashboard.
// Las claves se guardan en la base de datos; las etiquetas son solo para mostrar.

export const SKILLS = {
  finanzas: "Finanzas y proyecciones",
  comercial: "Ventas y desarrollo comercial",
  marketing: "Marketing digital",
  software: "Desarrollo de software",
  producto: "Diseño de producto / UX",
  operaciones: "Operaciones y logística",
  tecnico_rubro: "Dominio técnico del rubro",
  legal: "Legal y tributario",
  gestion: "Gestión de proyectos",
  levantamiento: "Levantamiento de capital",
} as const;
export type SkillKey = keyof typeof SKILLS;

export const SKILL_LEVELS = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" } as const;

export const EVIDENCE_TYPES = {
  linkedin: "Perfil de LinkedIn",
  certificado: "Certificado o título",
  referencia: "Referencia (nombre y contacto)",
} as const;
export type EvidenceType = keyof typeof EVIDENCE_TYPES;

// Rubros de las 17 entrevistas del Hito 1, agrupados.
export const INDUSTRIES = {
  energia: "Energía",
  mineria: "Minería",
  retail: "Retail y comercio",
  agricola: "Agrícola y alimentos",
  tecnologia: "Tecnología y software",
  legal: "Servicios legales y profesionales",
  manufactura: "Manufactura",
  salud: "Salud y bienestar",
  construccion: "Construcción e inmobiliaria",
  otro: "Otro",
} as const;
export type IndustryKey = keyof typeof INDUSTRIES;

export const STAGES = {
  idea: "Idea",
  validacion: "Validación",
  primeras_ventas: "Primeras ventas",
} as const;
export type StageKey = keyof typeof STAGES;

export const SEEKING = {
  socio: "Socio",
  mentor: "Mentor",
  inversion: "Inversión",
} as const;
export type SeekingKey = keyof typeof SEEKING;

export const NETWORK_KINDS = {
  socio: "Socios",
  mentor: "Mentores",
  inversionista: "Inversionistas",
} as const;
export type NetworkKind = keyof typeof NETWORK_KINDS;

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;

export const REGIONS = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;

// Los 7 problemas identificados en el Hito 1 (sección 4.2). Sirve para levantar evidencia nueva.
export const OBSTACLES = {
  contactos: "Llegar a capital o mentoría sin contactos",
  socios: "Encontrar socios complementarios y ponerse de acuerdo",
  numeros: "Armar números y proyecciones defendibles",
  mentoria: "Falta de mentoría o acompañamiento",
  tramites: "Trámites, permisos y certificaciones",
  centralismo: "Estar lejos de donde están los recursos",
  capital_trabajo: "Capital de trabajo y costos ocultos",
  otro: "Otro",
} as const;
export type ObstacleKey = keyof typeof OBSTACLES;

export const EVALUATOR_TYPES = {
  mentor: "Mentor/a",
  inversionista: "Inversionista",
  ejecutivo: "Ejecutivo/a de empresa",
  academico: "Académico/a o evaluador/a de fondos",
  otro: "Otro",
} as const;

export const WTP_RANGES = {
  "0": "No pagaría",
  "1-5000": "Hasta $5.000",
  "5001-15000": "$5.001 – $15.000",
  "15001-30000": "$15.001 – $30.000",
  "30001+": "Más de $30.000",
} as const;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  if (!key) return "—";
  return (map as Record<string, string>)[key] ?? key;
}
