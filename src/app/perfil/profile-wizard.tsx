"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, ChartLine, Check, ShieldCheck, Lightbulb, Rocket, Timer, Trash2, TrendingUp } from "lucide-react";
import { completeProfile, saveProfileStep, startProfile } from "@/app/actions/profile";
import { Chips, OptionCards, Question, Segmented, YesNo } from "@/components/form-bits";
import { Button, ButtonLink, Card, Field, inputClass } from "@/components/ui";
import {
  AGE_RANGES,
  EVIDENCE_TYPES,
  INDUSTRIES,
  OBSTACLES,
  REGIONS,
  SEEKING,
  SKILLS,
  STAGES,
  label,
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

const STEPS = ["Sobre ti", "Tu proyecto", "Tus competencias", "La idea", "Para terminar"];
const STEP_INTROS = [
  { title: "Partamos por ti", text: "Dos datos para conocer el contexto de tu proyecto." },
  { title: "Dale contexto a tu proyecto", text: "Cuéntanos en qué estás trabajando y qué necesitas para avanzar." },
  { title: "Lo que aportas al equipo", text: "Selecciona tus competencias y agrega una referencia que las respalde." },
  { title: "Cuéntanos tu idea", text: "No necesitas un pitch perfecto. Escribe respuestas breves y concretas." },
  { title: "Una última cosa", text: "Estas respuestas nos ayudan a entender tus necesidades y mejorar la experiencia." },
];

const EVIDENCE_PLACEHOLDER: Record<EvidenceType, string> = {
  linkedin: "linkedin.com/in/tu-perfil",
  certificado: "Ej: Ingeniería Comercial, U. de Chile (2022)",
  referencia: "Ej: Ana Pérez, ex jefa · +56 9 1234 5678",
};

const DESCRIPTION = [
  { key: "problem", title: "Problema", hint: "Describe una dificultad concreta y quién la tiene. Ejemplo: agricultores que gastan agua porque no saben cuándo regar.", required: true },
  { key: "solution", title: "Solución", hint: "Cuenta qué ofreces y cómo ayuda. Ejemplo: sensores que avisan cuándo regar y cuánta agua usar.", required: true },
  { key: "customer", title: "Cliente", hint: "Describe quién compraría tu solución. Si quien la usa y quien paga son distintos, acláralo. Ejemplo: dueños de pequeños predios agrícolas.", required: true },
  { key: "traction", title: "Avance", hint: "Cuenta lo que ya hiciste, no lo que esperas hacer. Ejemplo: entrevisté a 10 agricultores y probé un prototipo con 2. Si aún no comienzas, puedes decirlo.", required: false },
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

  if (done) return <Done data={data} duration={done.duration} onEdit={() => setDone(null)} />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Tu perfil de proyecto</p>
        <ol className="mt-4 hidden space-y-4 lg:block" aria-label="Progreso del perfil">
          {STEPS.map((name, index) => (
            <li key={name} aria-current={step === index ? "step" : undefined} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${index <= step ? "border-brand-600 bg-brand-600 text-white" : "border-line text-muted"}`}>
                {index < step ? <Check className="h-4 w-4" aria-label="Completado" /> : index + 1}
              </span>
              <span className={`text-sm ${index === step ? "font-extrabold text-brand-800" : "text-muted"}`}>{name}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 lg:hidden">
          <p className="mb-2 text-sm font-bold text-brand-700">Paso {step + 1} de {STEPS.length} · {STEPS[step]}</p>
          <div role="progressbar" aria-label="Progreso del perfil" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={step + 1} className="h-1.5 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <p className="mt-6 hidden text-sm leading-relaxed text-muted lg:block">Guardamos cada paso al continuar. Puedes volver con tu código de participante.</p>
      </aside>
      <Card className="min-w-0 sm:p-8">
        <header className="mb-7 border-b border-line pb-6">
          <h2 className="text-2xl font-extrabold tracking-tight">{STEP_INTROS[step].title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{STEP_INTROS[step].text}</p>
        </header>
        <div className="space-y-7" aria-busy={pending}>
          {step === 0 && (
            <>
              <Question title="Tu rango de edad" hint="Selecciona el tramo al que perteneces. Lo usamos para describir a los participantes del estudio.">
                <Chips options={AGE_RANGES} value={data.age_range} onChange={(v) => set("age_range", v as string)} />
              </Question>
              <Question title="¿Dónde está tu proyecto?" hint="Elige la región donde operas o planeas comenzar. Si todavía no partes, usa la región desde la que trabajarás.">
                <select aria-label="Región del proyecto" className={inputClass} value={data.region ?? ""} onChange={(e) => set("region", e.target.value || null)}>
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
              <Field label="Rubro del proyecto">
                <select className={inputClass} value={data.industry ?? ""} onChange={(e) => set("industry", e.target.value as IndustryKey || null)}>
                  <option value="">Selecciona un rubro</option>
                  {Object.entries(INDUSTRIES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </Field>
              <Question title="Etapa" hint="Elige la situación actual de tu proyecto, aunque todavía solo sea una idea.">
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
              <Question title="¿Qué buscas?" hint="Socio: alguien que construya el negocio contigo. Mentor: orientación y experiencia. Inversión: financiamiento. Puedes elegir más de una.">
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
              <Question title="Hoy, ¿cuál es tu principal obstáculo para avanzar?" hint="Elige la dificultad que más te frena hoy, aunque tengas otras. No hay una respuesta correcta.">
                <Chips options={OBSTACLES} value={data.main_obstacle} onChange={(v) => set("main_obstacle", v as ObstacleKey)} />
              </Question>
              <Question title="¿Necesitaste ayuda de otra persona para completar el perfil?" hint="Sé honesto: nos sirve para mejorar la plataforma.">
                <YesNo value={neededHelp} onChange={setNeededHelp} />
              </Question>
            </>
          )}
        </div>

        {error && <p role="alert" className="mt-6 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}

        <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          {step > 0 ? (
            <Button
              variant="ghost"
              type="button"
              disabled={pending}
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
    </div>
  );
}

function SkillsStep({ skills, onChange }: { skills: SkillEntry[]; onChange: (s: SkillEntry[]) => void }) {
  const keys = skills.map((s) => s.skill);
  const update = (i: number, patch: Partial<SkillEntry>) => onChange(skills.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <>
      <Question title="¿En qué eres bueno?" hint="Elige de 1 a 4 áreas en las que puedas aportar al proyecto. Después indica tu nivel y una evidencia. Buscaremos conexiones que complementen esas áreas.">
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
          <p className="text-sm leading-relaxed text-muted">Básico: necesitas apoyo. Intermedio: puedes hacerlo por tu cuenta. Avanzado: puedes guiar a otros. La evidencia puede ser tu LinkedIn, el nombre de un certificado o una referencia que respalde esa experiencia.</p>
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
                  aria-label={`Tipo de evidencia para ${SKILLS[s.skill]}`}
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
                  aria-label={`Evidencia de ${SKILLS[s.skill]}`}
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

function Done({ data, duration, onEdit }: { data: ProfileData; duration: number; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-brand-700"><Check className="h-4 w-4" /> Perfil completado</p>
            <h2 className="break-words text-3xl font-extrabold tracking-tight">{data.project_name || "Tu proyecto"}</h2>
            <p className="mt-2 text-muted">{label(INDUSTRIES, data.industry)} · {label(STAGES, data.stage)}{data.region ? ` · ${data.region}` : ""}</p>
          </div>
          <Button variant="ghost" type="button" onClick={onEdit}>Editar perfil</Button>
        </div>
        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div><h3 className="text-sm font-bold text-muted">El problema</h3><p className="mt-2 break-words leading-relaxed">{data.problem || "Sin descripción"}</p></div>
          <div><h3 className="text-sm font-bold text-muted">Tu solución</h3><p className="mt-2 break-words leading-relaxed">{data.solution || "Sin descripción"}</p></div>
        </div>
        <div className="space-y-4 border-t border-line pt-6">
          <div><h3 className="mb-2 text-sm font-bold text-muted">Lo que aportas</h3><div className="flex flex-wrap gap-2">{data.skills.map((skill) => <span key={skill.skill} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-800">{SKILLS[skill.skill]}</span>)}</div></div>
          <p className="text-sm text-muted"><span className="font-bold">Buscas: </span>{data.seeking.map((item) => label(SEEKING, item)).join(", ") || "Sin especificar"}</p>
        </div>
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-paper p-4 text-sm leading-relaxed text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Tus datos están guardados para la revisión del equipo. Los evaluadores trabajan con un ejemplo ficticio.</p>
        {duration > 0 && <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Timer className="h-3.5 w-3.5" /> Completado en {formatDuration(duration)} min</p>}
      </Card>
      <Link href="/finanzas" className="group flex flex-wrap items-center justify-between gap-4 rounded-card bg-brand-600 p-6 text-white transition hover:bg-brand-700 sm:p-8">
        <div className="flex items-center gap-4"><ChartLine className="h-8 w-8 shrink-0 text-brand-100" /><div><p className="text-xs font-bold uppercase tracking-widest text-brand-100">Siguiente paso</p><p className="mt-1 text-xl font-extrabold">Ponle números a tu proyecto</p><p className="mt-1 text-sm text-brand-50">Completa tus ventas y costos con una guía paso a paso.</p></div></div>
        <ArrowRight className="h-6 w-6 transition group-hover:translate-x-1" />
      </Link>
      <div className="flex flex-wrap justify-center gap-3"><ButtonLink href="/mi-perfil/emprendedor">Ver mi perfil completo</ButtonLink><ButtonLink href="/conexiones" variant="ghost">Ver conexiones sugeridas</ButtonLink></div>
    </div>
  );
}
