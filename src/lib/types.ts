import type { EvidenceType, IndustryKey, ObstacleKey, SeekingKey, SkillKey, StageKey } from "./catalog";

export type SkillEntry = {
  skill: SkillKey;
  level: 1 | 2 | 3;
  evidence_type: EvidenceType;
  evidence: string;
};

export type ProfileData = {
  age_range: string | null;
  region: string | null;
  industry: IndustryKey | null;
  stage: StageKey | null;
  seeking: SeekingKey[];
  skills: SkillEntry[];
  project_name: string | null;
  problem: string | null;
  solution: string | null;
  customer: string | null;
  traction: string | null;
  main_obstacle: ObstacleKey | null;
};

export type ProfileRow = ProfileData & {
  id: string;
  participant_id: string;
  started_at: string;
  completed_at: string | null;
  duration_s: number | null;
  completed: boolean;
  needed_help: boolean | null;
};

export type ModuleName = "perfil" | "finanzas" | "conexiones" | "evaluar" | "pacto";
export type EventType = "step_view" | "step_done" | "help_open" | "start" | "complete";
