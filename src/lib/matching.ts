// Matching por reglas con puntaje explicable (0–100). Funciones puras: se prueban en matching.test.ts.
//
// Componentes del puntaje:
//   Complementariedad  hasta 45  competencias que el candidato aporta y el emprendedor no tiene (o tiene en nivel básico)
//   Área               hasta 25  el candidato trabaja en el rubro del proyecto
//   Etapa              hasta 15  el candidato trabaja con proyectos en esa etapa
//   Lo que busca       hasta 15  el tipo de candidato coincide con lo que pidió (socio / mentor / inversión)
//   Región             bonus 5   misma región (el centralismo apareció en las entrevistas), tope total 100

import { INDUSTRIES, label, SKILLS, STAGES, type NetworkKind } from "./catalog";
import { formatCLPShort } from "./format";
import type { SkillEntry } from "./types";

export type NetworkProfile = {
  id: string;
  kind: NetworkKind;
  name: string;
  headline: string;
  bio: string;
  region: string;
  industries: string[];
  stages: string[];
  skills: string[];
  ticket_min: number | null;
  ticket_max: number | null;
  is_demo: boolean;
};

export type Entrepreneur = {
  industry: string | null;
  stage: string | null;
  region: string | null;
  seeking: string[];
  skills: SkillEntry[];
};

export type ScorePart = { key: "complementariedad" | "area" | "etapa" | "busca" | "region"; points: number; max: number; text: string };

export type Match = {
  profile: NetworkProfile;
  score: number;
  parts: ScorePart[];
  summary: string; // "Te sugerimos a X porque…"
};

const SEEKING_FOR_KIND: Record<NetworkKind, string> = { socio: "socio", mentor: "mentor", inversionista: "inversion" };

const joinEs = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

export function scoreMatch(e: Entrepreneur, c: NetworkProfile): Match {
  const own = new Map(e.skills.map((s) => [s.skill as string, s.level]));
  const fills = c.skills.filter((s) => !own.has(s));
  const strengthens = c.skills.filter((s) => own.get(s) === 1);
  const compPoints = Math.min(45, fills.length * 15 + strengthens.length * 8);

  const parts: ScorePart[] = [];
  parts.push({
    key: "complementariedad",
    points: compPoints,
    max: 45,
    text:
      fills.length > 0
        ? `aporta ${joinEs(fills.map((s) => label(SKILLS, s).toLowerCase()))}, que no está en tu perfil`
        : strengthens.length > 0
          ? `refuerza ${joinEs(strengthens.map((s) => label(SKILLS, s).toLowerCase()))}, donde tienes nivel básico`
          : "tiene competencias parecidas a las tuyas",
  });

  const sameArea = e.industry !== null && c.industries.includes(e.industry);
  parts.push({
    key: "area",
    points: sameArea ? 25 : 0,
    max: 25,
    text: sameArea ? `conoce el rubro ${label(INDUSTRIES, e.industry).toLowerCase()}` : "viene de otro rubro",
  });

  const sameStage = e.stage !== null && c.stages.includes(e.stage);
  parts.push({
    key: "etapa",
    points: sameStage ? 15 : 0,
    max: 15,
    text: sameStage ? `trabaja con proyectos en etapa de ${label(STAGES, e.stage).toLowerCase()}` : "suele trabajar con proyectos en otra etapa",
  });

  const wanted = e.seeking.includes(SEEKING_FOR_KIND[c.kind]);
  const ticket =
    c.kind === "inversionista" && c.ticket_min && c.ticket_max
      ? ` (invierte entre ${formatCLPShort(c.ticket_min)} y ${formatCLPShort(c.ticket_max)})`
      : "";
  parts.push({
    key: "busca",
    points: wanted ? 15 : 0,
    max: 15,
    text: wanted ? `es el tipo de apoyo que buscas${ticket}` : `no marcaste que buscas ${c.kind === "inversionista" ? "inversión" : c.kind}${ticket}`,
  });

  const sameRegion = e.region !== null && e.region === c.region;
  if (sameRegion) parts.push({ key: "region", points: 5, max: 5, text: `está en tu región (${c.region})` });

  const score = Math.min(100, parts.reduce((a, p) => a + p.points, 0));
  const positives = parts.filter((p) => p.points > 0).sort((a, b) => b.points - a.points);
  const first = c.name.split(" ")[0];
  const summary =
    positives.length > 0
      ? `Te sugerimos a ${first} porque ${joinEs(positives.slice(0, 2).map((p) => p.text))}.`
      : `${first} tiene un perfil distinto al tuyo; puede darte otra mirada.`;

  return { profile: c, score, parts, summary };
}

/** Top N por tipo, ordenado por puntaje (empate: nombre, para que sea estable). */
export function topMatches(e: Entrepreneur, candidates: NetworkProfile[], perKind = 3): Record<NetworkKind, Match[]> {
  const out: Record<NetworkKind, Match[]> = { socio: [], mentor: [], inversionista: [] };
  for (const c of candidates) out[c.kind]?.push(scoreMatch(e, c));
  for (const k of Object.keys(out) as NetworkKind[]) {
    out[k] = out[k].sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name)).slice(0, perKind);
  }
  return out;
}
