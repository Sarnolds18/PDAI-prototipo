"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, ChartLine, FileCheck2, Lightbulb, Rocket, Timer, Trash2, TrendingUp } from "lucide-react";
import { completeProfile, saveProfileStep, startProfile } from "@/app/actions/profile";
import { Chips, OptionCards, Question, Segmented, Stepper, YesNo } from "@/components/form-bits";
import { Button, ButtonLink, Card, Field, inputClass } from "@/components/ui";
import {
  AGE_RANGES,
  EVIDENCE_TYPES,
  INDUSTRIES,
  OBSTACLES,
  REGIONS,
  SEEKING,
  SKILLS,
  type EvidenceType,
  type IndustryKey,
  type ObstacleKey,
  type SeekingKey,
  type SkillKey,
  type StageKey,
} from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import { track } from "@/lib/track";
import type { ProfileData, SkillEntry } from "@/lib/types";

const STEPS = ["Tú", "Tu proyecto", "Competencias", "Descripción", "Cierre"];

const EVIDENCE_PLACEHOLDER: Record<EvidenceType, string> = {
  linkedin: "linkedin.com/in/tu-perfil",
  certificado: "Ej: Ingeniería Comercial, U. de Chile (2022)",
  referencia: "Ej: Ana Pérez, ex jefa · +56 9 1234 5678",
};

const DESCRIPTION = [
  { key: "problem", title: "Problema", hint: "¿Qué problema resuelves y a quién le duele?", required: true },
  { key: "solution", title: "Solución", hint: "¿Cómo lo resuelves? En simple, sin jerga.", required: true },
  { key: "customer", title: "Cliente", hint: "¿Quién te paga? ¿Cuántos hay?", required: true },
  { key: "traction", title: "Avance", hint: "¿Qué llevas? Entrevistas, pilotos, ventas… (si aún nada, dilo)", required: false },
] as const;

const MAX_LEN = 280;

type Props = {
  initial: ProfileData;
  completed: boolean;
  durationS: number | null;
  profileId: string | null;
};

export function ProfileWizard({ initial, completed, durationS, profileId }: Props) {
  const [data, setData] = useState<ProfileData>(initial);
  const [step, setStep] = useState(0);
  const [neededHelp, setNeededHelp] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ duration: number; id: string } | null>(
    completed && profileId ? { duration: durationS ?? 0, id: profileId } : null,
  );
  const started = useRef(false);

  // Parte el cronómetro (una sola vez) al entrar al wizard.
  useEffect(() => {
    if (started.current || completed) return;
    started.current = true;
    startProfile().then(() => track("perfil", "step_view", 0));
  }, [completed]);

  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) => setData((d) => ({ ...d, [k]: v }));

  function validate(): string | null {
    if (step === 0 && (!data.age_range || !data.region)) return "Elige tu rango de edad y región.";
    if (step === 1) {
      if (!data.project_name) return "Ponle un nombre a tu proyecto.";
      if (!data.industry || !data.stage) return "Elige el área y la etapa.";
      if (data.seeking.length === 0) return "Elige al menos una cosa que buscas.";
    }
    if (step === 2) {
      if (data.skills.length === 0) return "Elige al menos una competencia.";
      if (data.skills.some((s) => !s.evidence.trim())) return "Agrega evidencia a cada competencia.";
    }
    if (step === 3 && DESCRIPTION.some((d) => d.required && !data[d.key]?.trim())) return "Completa problema, solución y cliente.";
    if (step === 4 && (!data.main_obstacle || neededHelp === null)) return "Responde las dos preguntas.";
    return null;
  }

  function stepFields(): Partial<ProfileData> {
    switch (step) {
      case 0:
        return { age_range: data.age_range, region: data.region };
      case 1:
        return { project_name: data.project_name, industry: data.industry, stage: data.stage, seeking: data.seeking };
      case 2:
        return { skills: data.skills };
      case 3:
        return { problem: data.problem, solution: data.solution, customer: data.customer, traction: data.traction };
      default:
        return {};
    }
  }

  function next() {
    const v = validate();
    setError(v);
    if (v) return;
    start(async () => {
      if (step < STEPS.length - 1) {
        const res = await saveProfileStep(step, stepFields());
        if (res.error) return setError(res.error);
        setStep(step + 1);
        track("perfil", "step_view", step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const res = await completeProfile({ main_obstacle: data.main_obstacle, needed_help: neededHelp ?? false });
        if (res.error || !res.ok) return setError(res.error ?? "Error");
        setDone({ duration: res.duration_s, id: res.profileId });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (done) return <Done duration={done.duration} profileId={done.id} onEdit={() => setDone(null)} />;

  return (
    <Card>
      <Stepper steps={STEPS} current={step} />

      <div className="space-y-8">
        {step === 0 && (
          <>
            <Question title="¿Qué edad tienes?">
              <Chips options={AGE_RANGES} value={data.age_range} onChange={(v) => set("age_range", v as string)} />
            </Question>
            <Question title="¿Dónde está tu proyecto?">
              <select className={inputClass} value={data.region ?? ""} onChange={(e) => set("region", e.target.value || null)}>
                <option value="">Elige una región</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Question>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Nombre del proyecto">
              <input
                className={inputClass}
                value={data.project_name ?? ""}
                maxLength={60}
                onChange={(e) => set("project_name", e.target.value)}
                placeholder="Ej: AgroRiego"
              />
            </Field>
            <Question title="Área">
              <Chips options={INDUSTRIES} value={data.industry} onChange={(v) => set("industry", v as IndustryKey)} />
            </Question>
            <Question title="Etapa">
              <OptionCards<StageKey>
                value={data.stage}
                onChange={(v) => set("stage", v)}
                options={[
                  { key: "idea", title: "Idea", text: "Aún no lo pruebo con clientes", icon: <Lightbulb className="h-6 w-6" /> },
                  { key: "validacion", title: "Validación", text: "Lo estoy probando con usuarios", icon: <TrendingUp className="h-6 w-6" /> },
                  { key: "primeras_ventas", title: "Primeras ventas", text: "Ya tengo clientes que pagan", icon: <Rocket className="h-6 w-6" /> },
                ]}
              />
            </Question>
            <Question title="¿Qué buscas?" hint="Puedes elegir más de una.">
              <Chips options={SEEKING} multiple value={data.seeking} onChange={(v) => set("seeking", v as SeekingKey[])} />
            </Question>
          </>
        )}

        {step === 2 && (
          <SkillsStep skills={data.skills} onChange={(s) => set("skills", s)} />
        )}

        {step === 3 && (
          <div className="space-y-5">
            {DESCRIPTION.map((d) => {
              const value = data[d.key] ?? "";
              return (
                <Field key={d.key} label={`${d.title}${d.required ? "" : " (opcional)"}`} hint={`${value.length}/${MAX_LEN}`}>
                  <p className="-mt-1 mb-2 text-sm text-muted">{d.hint}</p>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    maxLength={MAX_LEN}
                    value={value}
                    onChange={(e) => set(d.key, e.target.value)}
                  />
                </Field>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <>
            <Question title="Hoy, ¿cuál es tu principal obstáculo para avanzar?">
              <Chips options={OBSTACLES} value={data.main_obstacle} onChange={(v) => set("main_obstacle", v as ObstacleKey)} />
            </Question>
            <Question title="¿Necesitaste ayuda de otra persona para completar el perfil?" hint="Sé honesto: nos sirve para mejorar la plataforma.">
              <YesNo value={neededHelp} onChange={setNeededHelp} />
            </Question>
          </>
        )}
      </div>

      {error && <p className="mt-6 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setError(null);
              setStep(step - 1);
            }}
          >
            <ArrowLeft className="h-5 w-5" /> Atrás
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={next} disabled={pending}>
          {pending ? "Guardando…" : step === STEPS.length - 1 ? "Terminar perfil" : "Siguiente"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  );
}

function SkillsStep({ skills, onChange }: { skills: SkillEntry[]; onChange: (s: SkillEntry[]) => void }) {
  const keys = skills.map((s) => s.skill);
  const update = (i: number, patch: Partial<SkillEntry>) => onChange(skills.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <>
      <Question title="¿En qué eres bueno?" hint="Elige hasta 4. Lo que no elijas es lo que buscaremos en tus conexiones.">
        <Chips
          options={SKILLS}
          multiple
          max={4}
          value={keys}
          onChange={(v) => {
            const next = v as SkillKey[];
            onChange(
              next.map(
                (k) => skills.find((s) => s.skill === k) ?? { skill: k, level: 2, evidence_type: "linkedin", evidence: "" },
              ),
            );
          }}
        />
      </Question>

      {skills.length > 0 && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-700">
            <BadgeCheck className="h-5 w-5" /> Respalda cada una con evidencia simple
          </p>
          {skills.map((s, i) => (
            <div key={s.skill} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold">{SKILLS[s.skill]}</span>
                <div className="flex items-center gap-2">
                  <Segmented
                    size="sm"
                    value={s.level}
                    onChange={(level) => update(i, { level })}
                    options={[
                      { key: 1, label: "Básico" },
                      { key: 2, label: "Intermedio" },
                      { key: 3, label: "Avanzado" },
                    ]}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar ${SKILLS[s.skill]}`}
                    onClick={() => onChange(skills.filter((_, j) => j !== i))}
                    className="rounded-full p-1.5 text-muted hover:bg-coral-50 hover:text-coral-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  className={`${inputClass} sm:w-56`}
                  value={s.evidence_type}
                  onChange={(e) => update(i, { evidence_type: e.target.value as EvidenceType })}
                >
                  {Object.entries(EVIDENCE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  value={s.evidence}
                  maxLength={200}
                  placeholder={EVIDENCE_PLACEHOLDER[s.evidence_type]}
                  onChange={(e) => update(i, { evidence: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Done({ duration, profileId, onEdit }: { duration: number; profileId: string; onEdit: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-network rounded-card p-8 text-center text-white">
        <BadgeCheck className="mx-auto h-14 w-14 text-coral-300" />
        <h2 className="mt-3 text-3xl font-extrabold">¡Perfil validado!</h2>
        {duration > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-bold">
            <Timer className="h-5 w-5" /> Lo hiciste en <span className="tabular">{formatDuration(duration)}</span> min
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/finanzas" className="group rounded-card border-2 border-coral-500 bg-white p-6 transition hover:bg-coral-50">
          <ChartLine className="h-8 w-8 text-coral-500" />
          <p className="mt-3 text-xl font-extrabold">Siguiente: tus números</p>
          <p className="text-muted">Flujo de caja, VAN y TIR guiados.</p>
          <ArrowRight className="mt-3 h-5 w-5 text-coral-500 transition group-hover:translate-x-1" />
        </Link>
        <Link href={`/ficha/${profileId}`} className="group rounded-card border border-line bg-white p-6 transition hover:bg-brand-50">
          <FileCheck2 className="h-8 w-8 text-brand-600" />
          <p className="mt-3 text-xl font-extrabold">Ver mi ficha</p>
          <p className="text-muted">Lo que recibe un mentor o inversionista.</p>
          <ArrowRight className="mt-3 h-5 w-5 text-brand-600 transition group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/conexiones" variant="ghost">
          Ver conexiones sugeridas
        </ButtonLink>
        <Button variant="ghost" type="button" onClick={onEdit}>
          Editar perfil
        </Button>
      </div>
    </div>
  );
}
