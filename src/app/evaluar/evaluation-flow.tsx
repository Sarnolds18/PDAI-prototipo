"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { startEvaluation, submitEvaluation, submitPreference, type Variant } from "@/app/actions/evaluation";
import { Chips, Question, YesNo } from "@/components/form-bits";
import { FichaView, type FichaData } from "@/components/ficha-view";
import { Button, Card, inputClass, Skeleton } from "@/components/ui";
import { EVALUATOR_TYPES } from "@/lib/catalog";

type ColdMessage = { from: string; subject: string; body: string[] };
type Stage = "loading" | "review" | "crossover" | "done";

export function EvaluationFlow({ ficha, cold }: { ficha: FichaData; cold: ColdMessage }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [variant, setVariant] = useState<Variant | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startEvaluation().then((r) => {
      setVariant(r.variant);
      setStage(r.completed ? "done" : r.answered ? "crossover" : "review");
    });
  }, []);

  if (stage === "loading" || !variant) return <Skeleton className="h-96" />;

  const other: Variant = variant === "A" ? "B" : "A";
  const show = (v: Variant) => (v === "A" ? <ColdView msg={cold} /> : <FichaView data={ficha} />);

  if (stage === "review") {
    return (
      <div className="space-y-6">
        <p className="rounded-2xl bg-sand px-4 py-3 text-sm font-bold">
          Imagina que te llega este proyecto. Revísalo como lo harías normalmente y responde abajo.
        </p>
        {show(variant)}
        <ReviewForm onDone={() => (setStage("crossover"), window.scrollTo({ top: 0, behavior: "smooth" }))} />
      </div>
    );
  }

  if (stage === "crossover") {
    return <Crossover first={variant} second={other} render={show} onDone={() => (setStage("done"), window.scrollTo({ top: 0 }))} />;
  }

  return (
    <div className="bg-network rounded-card p-10 text-center text-white">
      <CheckCircle2 className="mx-auto h-14 w-14 text-coral-300" />
      <p className="mt-4 text-3xl font-extrabold">¡Gracias por evaluar!</p>
      <p className="mt-2 text-brand-50">Tus respuestas ayudan a validar si un perfil estandarizado cambia la decisión de quien evalúa.</p>
    </div>
  );
}

function ColdView({ msg }: { msg: ColdMessage }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand">
          <Mail className="h-5 w-5 text-muted" />
        </span>
        <div>
          <p className="font-extrabold">{msg.from}</p>
          <p className="text-sm text-muted">{msg.subject}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-ink">
        {msg.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </Card>
  );
}

function Scale({ value, onChange, low, high }: { value: number | null; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={`tabular rounded-2xl border-2 py-3 text-xl font-extrabold transition-colors ${
              value === n ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function ReviewForm({ onDone }: { onDone: () => void }) {
  const [evaluatorType, setEvaluatorType] = useState<string | null>(null);
  const [meetingScore, setMeetingScore] = useState<number | null>(null);
  const [meetingYes, setMeetingYes] = useState<boolean | null>(null);
  const [defensibility, setDefensibility] = useState<number | null>(null);
  const [wouldReceive, setWouldReceive] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="space-y-8 border-2 border-brand-600">
      <Question title="¿Desde qué rol evalúas?">
        <Chips options={EVALUATOR_TYPES} value={evaluatorType} onChange={(v) => setEvaluatorType(v as string)} />
      </Question>
      <Question title="¿Qué tan dispuesto estarías a aceptar una primera reunión?">
        <Scale value={meetingScore} onChange={setMeetingScore} low="Nada" high="Totalmente" />
      </Question>
      <Question title="¿Aceptarías la reunión?">
        <YesNo value={meetingYes} onChange={setMeetingYes} />
      </Question>
      <Question title="¿Qué tan defendible es la propuesta?" hint="¿Te convencen los argumentos y los números?">
        <Scale value={defensibility} onChange={setDefensibility} low="Nada" high="Muy defendible" />
      </Question>
      <Question title="¿Recibirías propuestas de proyectos por esta vía?" hint="Una plataforma que te envía proyectos prefiltrados en este formato.">
        <YesNo value={wouldReceive} onChange={setWouldReceive} />
      </Question>
      <Question title="Comentario (opcional)">
        <textarea className={`${inputClass} min-h-20`} maxLength={800} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Question>

      {error && <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await submitEvaluation({ evaluatorType, meetingScore, meetingYes, defensibility, wouldReceive, comment });
            if (res.error) return setError(res.error);
            onDone();
          })
        }
      >
        {pending ? "Guardando…" : "Enviar respuestas"} <ArrowRight className="h-5 w-5" />
      </Button>
    </Card>
  );
}

function Crossover({
  first,
  second,
  render,
  onDone,
}: {
  first: Variant;
  second: Variant;
  render: (v: Variant) => React.ReactNode;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<Variant>(second);
  const [preferred, setPreferred] = useState<Variant | null>(null);
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = (v: Variant) => (v === "A" ? "El mensaje" : "La ficha");

  const send = (skipped: boolean) =>
    start(async () => {
      const res = await submitPreference({ preferred, why, skipped });
      if (res.error) return setError(res.error);
      onDone();
    });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-coral-50 px-4 py-3">
        <p className="font-extrabold text-coral-700">Último paso: el mismo proyecto, presentado de otra forma.</p>
        <p className="text-sm text-ink">Tus respuestas anteriores ya quedaron guardadas y no cambian.</p>
      </div>

      <div className="inline-flex rounded-full bg-sand p-1 text-sm font-bold">
        {[second, first].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 ${tab === v ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}
          >
            {name(v)}
            {v === first ? " (la que viste)" : ""}
          </button>
        ))}
      </div>
      {render(tab)}

      <Card className="space-y-6 border-2 border-brand-600">
        <Question title="¿Con cuál aceptarías una primera reunión?">
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={preferred === v}
                onClick={() => setPreferred(v)}
                className={`rounded-2xl border-2 py-4 text-lg font-extrabold ${
                  preferred === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white"
                }`}
              >
                {name(v)}
              </button>
            ))}
          </div>
        </Question>
        <Question title="¿Por qué? (opcional)">
          <textarea className={`${inputClass} min-h-20`} maxLength={600} value={why} onChange={(e) => setWhy(e.target.value)} />
        </Question>
        {error && <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={pending} onClick={() => send(true)} className="text-sm font-bold text-muted underline underline-offset-2">
            Prefiero no comparar
          </button>
          <Button type="button" disabled={pending} onClick={() => send(false)}>
            {pending ? "Guardando…" : "Terminar"} <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
