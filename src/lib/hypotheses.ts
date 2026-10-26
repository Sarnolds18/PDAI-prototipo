// Cálculo de las métricas de validación H1–H6 contra los umbrales del Hito 2 (sección 6).
// Función pura: recibe filas de la base y devuelve el estado de cada hipótesis. Se prueba en hypotheses.test.ts.
// Solo usa datos registrados; las sesiones marcadas como prueba (is_test) se excluyen.

export type Rows = {
  participants: { id: string; role: string; is_test: boolean }[];
  profiles: { participant_id: string; completed: boolean; needed_help: boolean | null; duration_s: number | null }[];
  finance: { participant_id: string; completed: boolean; needed_help: boolean | null }[];
  suggestions: { participant_id: string; rating: number | null }[];
  feedback: { participant_id: string; would_use: boolean }[];
  evaluations: {
    participant_id: string;
    variant: "A" | "B";
    meeting_score: number | null;
    meeting_yes: boolean | null;
    defensibility: number | null;
    would_receive: boolean | null;
    preferred: "A" | "B" | null;
    answered_at: string | null;
  }[];
  pacts: { participant_id: string; completed: boolean; would_use: boolean | null }[];
};

export type Status = "validada" | "no_validada" | "insuficiente";

export type Criterion = {
  label: string;
  value: number | null; // fracción (0–1), promedio o segundos según `kind`
  kind: "pct" | "avg5" | "seconds" | "diff";
  threshold: number;
  comparator: ">=" | "<" | ">";
  n: number;
  pass: boolean | null; // null = datos insuficientes
};

export type HypothesisResult = {
  id: "H1" | "H2" | "H3" | "H4" | "H5" | "H6";
  title: string;
  rule: string;
  status: Status;
  n: number;
  criteria: Criterion[];
};

export type Extras = {
  meetingByVariant: Record<"A" | "B", { n: number; yes: number; avgScore: number | null; avgDefensibility: number | null }>;
  durations: number[]; // perfiles completados, segundos
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function criterion(c: Omit<Criterion, "pass">, minN: number): Criterion {
  if (c.n < minN || c.value === null) return { ...c, pass: null };
  const pass = c.comparator === ">=" ? c.value >= c.threshold : c.comparator === ">" ? c.value > c.threshold : c.value < c.threshold;
  return { ...c, pass };
}

function statusOf(criteria: Criterion[]): Status {
  if (criteria.some((c) => c.pass === null)) return "insuficiente";
  return criteria.every((c) => c.pass) ? "validada" : "no_validada";
}

export function computeHypotheses(raw: Rows, minN: number): { results: HypothesisResult[]; extras: Extras } {
  const test = new Set(raw.participants.filter((p) => p.is_test).map((p) => p.id));
  const real = <T extends { participant_id: string }>(rows: T[]) => rows.filter((r) => !test.has(r.participant_id));

  const profiles = real(raw.profiles);
  const finance = real(raw.finance);
  const suggestions = real(raw.suggestions);
  const feedback = real(raw.feedback);
  const evaluations = real(raw.evaluations);
  const answered = evaluations.filter((e) => e.answered_at);
  const pacts = real(raw.pacts);

  // H1 · ≥70 % usaría la plataforma y la calificación promedio de las conexiones es ≥ 4/5
  const ratings = suggestions.map((s) => s.rating).filter((r): r is number => r !== null);
  const raters = new Set(suggestions.filter((s) => s.rating !== null).map((s) => s.participant_id)).size;
  const h1 = [
    criterion(
      { label: "Usaría EmprendeRed", value: feedback.length ? feedback.filter((f) => f.would_use).length / feedback.length : null, kind: "pct", threshold: 0.7, comparator: ">=", n: feedback.length },
      minN,
    ),
    criterion({ label: "Calificación promedio de conexiones", value: mean(ratings), kind: "avg5", threshold: 4, comparator: ">=", n: raters }, minN),
  ];

  // H2 · ≥60 % de los evaluadores prefiere la versión B
  const prefs = evaluations.filter((e) => e.preferred);
  const h2 = [
    criterion(
      { label: "Prefiere la ficha (B)", value: prefs.length ? prefs.filter((e) => e.preferred === "B").length / prefs.length : null, kind: "pct", threshold: 0.6, comparator: ">=", n: prefs.length },
      minN,
    ),
  ];

  // H3 · ≥70 % completa la plantilla sin ayuda y B es más defendible que A
  const byVariant = (v: "A" | "B") => answered.filter((e) => e.variant === v);
  const defA = mean(byVariant("A").map((e) => e.defensibility).filter((x): x is number => x !== null));
  const defB = mean(byVariant("B").map((e) => e.defensibility).filter((x): x is number => x !== null));
  const perArm = Math.max(2, Math.ceil(minN / 2));
  const armsN = Math.min(byVariant("A").length, byVariant("B").length);
  const h3 = [
    criterion(
      {
        label: "Completa la plantilla sin ayuda",
        value: finance.length ? finance.filter((f) => f.completed && f.needed_help === false).length / finance.length : null,
        kind: "pct",
        threshold: 0.7,
        comparator: ">=",
        n: finance.length,
      },
      minN,
    ),
    criterion(
      { label: "Defendible: B − A (puntos)", value: defA !== null && defB !== null ? defB - defA : null, kind: "diff", threshold: 0, comparator: ">", n: armsN },
      perArm,
    ),
  ];

  // H4 · ≥60 % termina el pacto y declara que lo usaría
  const h4 = [
    criterion(
      { label: "Termina el pacto y lo usaría", value: pacts.length ? pacts.filter((p) => p.completed && p.would_use).length / pacts.length : null, kind: "pct", threshold: 0.6, comparator: ">=", n: pacts.length },
      minN,
    ),
  ];

  // H5 · ≥60 % de los evaluadores recibiría propuestas por esta vía
  const h5 = [
    criterion(
      { label: "Recibiría propuestas por esta vía", value: answered.length ? answered.filter((e) => e.would_receive).length / answered.length : null, kind: "pct", threshold: 0.6, comparator: ">=", n: answered.length },
      minN,
    ),
  ];

  // H6 · ≥80 % completa el perfil solo y la mediana del tiempo es < 10 minutos
  const durations = profiles.filter((p) => p.completed && p.duration_s !== null).map((p) => p.duration_s as number);
  const h6 = [
    criterion(
      { label: "Completa el perfil solo", value: profiles.length ? profiles.filter((p) => p.completed && p.needed_help === false).length / profiles.length : null, kind: "pct", threshold: 0.8, comparator: ">=", n: profiles.length },
      minN,
    ),
    criterion({ label: "Mediana del tiempo de perfil", value: median(durations), kind: "seconds", threshold: 600, comparator: "<", n: durations.length }, minN),
  ];

  const make = (id: HypothesisResult["id"], title: string, rule: string, criteria: Criterion[]): HypothesisResult => ({
    id,
    title,
    rule,
    criteria,
    status: statusOf(criteria),
    n: Math.max(...criteria.map((c) => c.n)),
  });

  const variantStats = (v: "A" | "B") => {
    const rows = byVariant(v);
    return {
      n: rows.length,
      yes: rows.filter((e) => e.meeting_yes).length,
      avgScore: mean(rows.map((e) => e.meeting_score).filter((x): x is number => x !== null)),
      avgDefensibility: v === "A" ? defA : defB,
    };
  };

  return {
    results: [
      make("H1", "Conexiones útiles", "≥ 70 % usaría la plataforma y califica las conexiones con ≥ 4/5", h1),
      make("H2", "Un perfil validado genera confianza", "≥ 60 % de los evaluadores prefiere la versión validada", h2),
      make("H3", "Las plantillas mejoran las propuestas", "≥ 70 % completa la plantilla sin ayuda y B es más defendible que A", h3),
      make("H4", "El pacto de socios se usaría", "≥ 60 % termina el pacto y declara que lo usaría", h4),
      make("H5", "Mentores e inversionistas participarían", "≥ 60 % de los evaluadores recibiría propuestas por esta vía", h5),
      make("H6", "Uso autónomo y validación simple", "≥ 80 % completa el perfil solo y la mediana es < 10 min", h6),
    ],
    extras: { meetingByVariant: { A: variantStats("A"), B: variantStats("B") }, durations },
  };
}
