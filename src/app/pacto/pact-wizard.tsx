"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Printer, ScrollText } from "lucide-react";
import { trackEvent } from "@/app/actions/events";
import { completePact, savePactStep, startPact } from "@/app/actions/pact";
import { Chips, Question, Stepper, YesNo } from "@/components/form-bits";
import { LogoMark } from "@/components/logo";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { formatCLP, formatNumber } from "@/lib/format";
import { DECISION_RULES, equityWarning, LEAVE_RULES, PACT_ROLES, type PactData, type Partner } from "@/lib/pact";

const STEPS = ["Socios", "Aportes", "Dedicación y reparto", "Vesting y decisiones", "Si alguien sale", "Documento"];

export function PactWizard({ initial, completed, lastStep }: { initial: PactData; completed: boolean; lastStep: number }) {
  const [d, setD] = useState<PactData>(initial);
  const [step, setStep] = useState(completed ? 5 : Math.min(lastStep, 4));
  const [wouldUse, setWouldUse] = useState<boolean | null>(null);
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || completed) return;
    started.current = true;
    startPact().then(() => trackEvent("pacto", "step_view", Math.min(lastStep, 4)));
  }, [completed, lastStep]);

  const setPartner = (i: 0 | 1, patch: Partial<Partner>) =>
    setD((cur) => {
      const partners = [...cur.partners] as [Partner, Partner];
      partners[i] = { ...partners[i], ...patch };
      return { ...cur, partners };
    });

  const [a, b] = d.partners;
  const nameOf = (i: 0 | 1) => d.partners[i].name || `Socio ${i + 1}`;

  function validate(): string | null {
    if (step === 0 && (!a.name || !b.name || !a.role || !b.role)) return "Escribe el nombre y rol de ambos socios.";
    if (step === 1 && (!a.contribution || !b.contribution)) return "Cuenta qué aporta cada uno.";
    if (step === 2 && Math.round(a.equity + b.equity + d.pool) !== 100) return "El reparto debe sumar 100 %.";
    if (step === 3 && !d.decisions) return "Elige cómo toman decisiones.";
    if (step === 4 && d.leaveRules.length === 0) return "Elige al menos una regla de salida.";
    if (step === 5 && wouldUse === null) return "Responde si lo usarías.";
    return null;
  }

  function next() {
    const v = validate();
    setError(v);
    if (v) return;
    start(async () => {
      if (step < 5) {
        const res = await savePactStep(step, d);
        if (res.error) return setError(res.error);
        setStep(step + 1);
        trackEvent("pacto", "step_view", step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const res = await completePact(d, wouldUse ?? false);
        if (res.error) return setError(res.error);
        setDone(true);
      }
    });
  }

  const warning = equityWarning(d);

  return (
    <Card>
      <div className="no-print">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="space-y-8">
        {step === 0 && (
          <>
            <Field label="Nombre del proyecto">
              <input className={inputClass} value={d.projectName} maxLength={80} onChange={(e) => setD({ ...d, projectName: e.target.value })} />
            </Field>
            {([0, 1] as const).map((i) => (
              <div key={i} className="space-y-3 rounded-2xl bg-paper p-4">
                <Field label={`Socio ${i + 1}: nombre`}>
                  <input className={inputClass} value={d.partners[i].name} maxLength={80} onChange={(e) => setPartner(i, { name: e.target.value })} />
                </Field>
                <Question title="Rol principal">
                  <Chips options={PACT_ROLES} value={d.partners[i].role || null} onChange={(v) => setPartner(i, { role: v as Partner["role"] })} />
                </Question>
              </div>
            ))}
          </>
        )}

        {step === 1 &&
          ([0, 1] as const).map((i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-paper p-4">
              <p className="text-lg font-extrabold">{nameOf(i)}</p>
              <Field label="Capital que aporta">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted">$</span>
                  <input
                    inputMode="numeric"
                    className={`${inputClass} tabular pl-9`}
                    value={d.partners[i].capital ? formatNumber(d.partners[i].capital) : ""}
                    placeholder="0"
                    onChange={(e) => setPartner(i, { capital: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                  />
                </div>
              </Field>
              <Field label="Qué más aporta" hint="Trabajo, conocimiento, contactos, equipos, una marca…">
                <textarea
                  className={`${inputClass} min-h-20`}
                  maxLength={300}
                  value={d.partners[i].contribution}
                  onChange={(e) => setPartner(i, { contribution: e.target.value })}
                />
              </Field>
            </div>
          ))}

        {step === 2 && (
          <>
            <Question title="¿Qué % de su tiempo dedica cada uno?" hint="Un equipo se cayó porque no todos podían dedicar el 100 % (Anexo 11). Mejor decirlo ahora.">
              {([0, 1] as const).map((i) => (
                <Slider key={i} label={nameOf(i)} value={d.partners[i].dedication} onChange={(v) => setPartner(i, { dedication: v })} suffix="%" />
              ))}
            </Question>
            <Question title="¿Cómo se reparte la participación?">
              <Slider
                label={`Reserva para futuros socios o equipo`}
                value={d.pool}
                max={30}
                onChange={(pool) => setD((cur) => ({ ...cur, pool, partners: [{ ...cur.partners[0] }, { ...cur.partners[1], equity: Math.max(0, 100 - pool - cur.partners[0].equity) }] }))}
                suffix="%"
              />
              <Slider
                label={nameOf(0)}
                value={a.equity}
                max={100 - d.pool}
                onChange={(v) => setD((cur) => ({ ...cur, partners: [{ ...cur.partners[0], equity: v }, { ...cur.partners[1], equity: 100 - cur.pool - v }] }))}
                suffix="%"
              />
              <EquityBar a={a} b={b} pool={d.pool} />
            </Question>
            {warning && (
              <p className="flex items-start gap-2 rounded-xl bg-sun-100 p-4 text-sm font-bold text-sun-600">
                <AlertTriangle className="h-5 w-5 shrink-0" /> {warning}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Question
              title="Vesting: ¿en cuántos años se gana la participación?"
              hint="Cada socio va ganando sus acciones con el tiempo. Así, si alguien se va pronto, no se lleva todo. Lo típico: 4 años (Anexo 12)."
            >
              <Slider label="Años de vesting" value={d.vestingYears} max={6} onChange={(v) => setD({ ...d, vestingYears: v })} suffix="años" />
              <Slider label="Cliff: tiempo mínimo antes de ganar algo" value={d.cliffMonths} max={24} onChange={(v) => setD({ ...d, cliffMonths: v })} suffix="meses" />
            </Question>
            <Question title="¿Cómo toman decisiones?">
              <div className="space-y-2">
                {Object.entries(DECISION_RULES).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={d.decisions === k}
                    onClick={() => setD({ ...d, decisions: k as PactData["decisions"] })}
                    className={`block w-full rounded-2xl border-2 p-4 text-left font-bold ${d.decisions === k ? "border-brand-600 bg-brand-50" : "border-line bg-white"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Question>
          </>
        )}

        {step === 4 && (
          <>
            <Question title="Si un socio se va, ¿qué pasa?" hint="Elige todas las que acuerden.">
              <div className="space-y-2">
                {Object.entries(LEAVE_RULES).map(([k, v]) => {
                  const on = d.leaveRules.includes(k as keyof typeof LEAVE_RULES);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setD({
                          ...d,
                          leaveRules: on ? d.leaveRules.filter((r) => r !== k) : [...d.leaveRules, k as keyof typeof LEAVE_RULES],
                        })
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold ${on ? "border-brand-600 bg-brand-50" : "border-line bg-white"}`}
                    >
                      <CheckCircle2 className={`h-5 w-5 shrink-0 ${on ? "text-brand-600" : "text-line"}`} /> {v}
                    </button>
                  );
                })}
              </div>
            </Question>
            <Slider label="Revisamos este pacto cada" value={d.reviewMonths} max={24} onChange={(v) => setD({ ...d, reviewMonths: Math.max(1, v) })} suffix="meses" />
          </>
        )}

        {step === 5 && (
          <>
            <PactDocument d={d} />
            {!done ? (
              <div className="no-print">
                <Question title="¿Lo usarías con tu socio real?">
                  <YesNo value={wouldUse} onChange={setWouldUse} />
                </Question>
              </div>
            ) : (
              <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4">
                <p className="flex items-center gap-2 font-bold text-brand-800">
                  <CheckCircle2 className="h-5 w-5" /> Pacto guardado.
                </p>
                <Button type="button" variant="accent" onClick={() => window.print()}>
                  <Printer className="h-5 w-5" /> Descargar PDF
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {error && <p className="no-print mt-6 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}

      {!done && (
        <div className="no-print mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" type="button" onClick={() => (setError(null), setStep(step - 1))}>
              <ArrowLeft className="h-5 w-5" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={next} disabled={pending}>
            {pending ? "Guardando…" : step === 5 ? "Terminar pacto" : step === 4 ? "Generar documento" : "Siguiente"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
      {done && (
        <div className="no-print mt-6 text-center">
          <Button variant="ghost" type="button" onClick={() => (setDone(false), setStep(0))}>
            Editar pacto
          </Button>
        </div>
      )}
    </Card>
  );
}

function Slider({ label, value, onChange, max = 100, suffix }: { label: string; value: number; onChange: (v: number) => void; max?: number; suffix: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="tabular text-brand-700">
          {value} {suffix}
        </span>
      </span>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
    </label>
  );
}

function EquityBar({ a, b, pool }: { a: Partner; b: Partner; pool: number }) {
  const seg = (w: number, cls: string, text: string) =>
    w > 0 && (
      <div className={`flex items-center justify-center text-xs font-extrabold text-white ${cls}`} style={{ width: `${w}%` }}>
        {w >= 12 && text}
      </div>
    );
  return (
    <div className="flex h-10 overflow-hidden rounded-xl" aria-hidden="true">
      {seg(a.equity, "bg-brand-600", `${a.name || "Socio 1"} ${a.equity}%`)}
      {seg(b.equity, "bg-coral-500", `${b.name || "Socio 2"} ${b.equity}%`)}
      {seg(pool, "bg-muted", `Reserva ${pool}%`)}
    </div>
  );
}

function PactDocument({ d }: { d: PactData }) {
  const [a, b] = d.partners;
  const date = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="rounded-2xl border border-line bg-white p-6 text-sm leading-relaxed sm:p-8 print:border-0 print:p-0">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-600">Pacto de socios · resumen</p>
          <h2 className="mt-1 text-2xl font-extrabold">{d.projectName || "Proyecto"}</h2>
          <p className="text-muted">{date}</p>
        </div>
        <ScrollText className="h-10 w-10 text-brand-600" />
      </header>

      <ol className="mt-5 list-decimal space-y-4 pl-5 marker:font-extrabold marker:text-brand-600">
        <li>
          <b>Socios y roles.</b> {a.name} ({PACT_ROLES[a.role as keyof typeof PACT_ROLES] ?? "—"}) y {b.name} (
          {PACT_ROLES[b.role as keyof typeof PACT_ROLES] ?? "—"}).
        </li>
        <li>
          <b>Aportes.</b> {a.name}: {a.capital ? `${formatCLP(a.capital)} en capital; ` : ""}
          {a.contribution}. {b.name}: {b.capital ? `${formatCLP(b.capital)} en capital; ` : ""}
          {b.contribution}.
        </li>
        <li>
          <b>Dedicación.</b> {a.name} dedica el {a.dedication} % de su tiempo y {b.name} el {b.dedication} %. Si esto cambia, se avisa y se revisa el
          reparto.
        </li>
        <li>
          <b>Participación.</b> {a.name} {a.equity} %, {b.name} {b.equity} %{d.pool ? ` y ${d.pool} % reservado para futuros socios o equipo` : ""}.
        </li>
        <li>
          <b>Vesting.</b> La participación se gana durante {d.vestingYears} años, con un cliff de {d.cliffMonths} meses.
        </li>
        <li>
          <b>Decisiones.</b> {DECISION_RULES[d.decisions as keyof typeof DECISION_RULES] ?? "—"}.
        </li>
        <li>
          <b>Si un socio sale.</b>
          <ul className="mt-1 list-disc pl-5">
            {d.leaveRules.map((r) => (
              <li key={r}>{LEAVE_RULES[r]}.</li>
            ))}
          </ul>
        </li>
        <li>
          <b>Revisión.</b> Revisamos este acuerdo cada {d.reviewMonths} meses.
        </li>
      </ol>

      <div className="mt-10 grid grid-cols-2 gap-8">
        {[a, b].map((p, i) => (
          <div key={i} className="border-t border-ink pt-2 text-center text-xs">
            {p.name || `Socio ${i + 1}`}
          </div>
        ))}
      </div>
      <footer className="mt-8 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
        <LogoMark className="h-4 w-4" /> Generado con EmprendeRed. Resumen de acuerdos, no reemplaza un pacto de accionistas redactado por un abogado.
      </footer>
    </article>
  );
}
