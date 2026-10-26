"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleHelp, FileCheck2, Handshake, Timer } from "lucide-react";
import { trackEvent } from "@/app/actions/events";
import { completeFinance, recordFinanceHelp, saveFinanceStep, startFinance } from "@/app/actions/finance";
import { CashChart, SERIES_COLORS } from "@/components/cash-chart";
import { Question, Stepper, YesNo } from "@/components/form-bits";
import { Button, Card, inputClass } from "@/components/ui";
import { computeFinance, IRR_STATUS_TEXT, type FinanceInputs, type FinanceResults } from "@/lib/finance";
import { formatCLP, formatCLPShort, formatDuration, formatNumber, formatPct } from "@/lib/format";

const STEPS = ["Inversión", "Ventas", "Costos", "Impuestos y tasa", "Escenarios", "Resultados"];

type Key = keyof FinanceInputs;
type FieldDef = { key: Key; label: string; kind: "clp" | "pct" | "num" | "days"; help: string; suffix?: string };

// Ayudas cortas. Cuando corresponde, citan lo que dijeron los entrevistados del Hito 1.
const FIELDS: Record<number, FieldDef[]> = {
  0: [
    {
      key: "investment",
      label: "Inversión inicial",
      kind: "clp",
      help: "Todo lo que gastas antes de vender: equipos, desarrollo, permisos, stock inicial. En Chile la mediana que requiere un emprendimiento es $4 millones (GEM 2025).",
    },
  ],
  1: [
    { key: "price", label: "Precio por unidad", kind: "clp", help: "Lo que te paga un cliente por cada unidad (producto, servicio o mes de suscripción), sin IVA." },
    {
      key: "units",
      label: "Unidades vendidas el primer mes",
      kind: "num",
      help: "Sé conservador. Los evaluadores desconfían de las proyecciones sobre-optimistas sin un caso base honesto (Anexo 12).",
    },
    { key: "growth", label: "Crecimiento mensual de ventas", kind: "pct", suffix: "% al mes", help: "Cuánto crecen tus unidades cada mes. 3 % al mes ≈ 43 % al año." },
  ],
  2: [
    { key: "variableCost", label: "Costo variable por unidad", kind: "clp", help: "Lo que cuesta producir y entregar cada unidad: materiales, envío, comisiones." },
    { key: "fixedCosts", label: "Costos fijos mensuales", kind: "clp", help: "Lo que pagas cada mes vendas o no: arriendo, sueldos, software, contador." },
  ],
  3: [
    {
      key: "taxRate",
      label: "Impuesto sobre las utilidades",
      kind: "pct",
      suffix: "%",
      help: "Muchos presupuestos olvidan los impuestos (Anexo 6). Usa la tasa de tu régimen tributario (SII). Si pones 0 verás el caso sin impuestos.",
    },
    {
      key: "discountRate",
      label: "Tasa de descuento anual",
      kind: "pct",
      suffix: "% al año",
      help: "Lo mínimo que te exiges ganar al año por tu dinero y el riesgo. Se usa para el VAN. Por defecto, 12 %.",
    },
  ],
  4: [
    {
      key: "pessimistic",
      label: "Escenario pesimista: ventas",
      kind: "pct",
      suffix: "%",
      help: "Los inversionistas piden ver los números en escenario optimista, realista y pesimista (Anexo 16).",
    },
    { key: "optimistic", label: "Escenario optimista: ventas", kind: "pct", suffix: "%", help: "Cuánto más venderías si todo sale bien." },
    {
      key: "paymentDelayDays",
      label: "Contingencia: atraso en pagos",
      kind: "days",
      suffix: "días",
      help: "Puedes vender y aun así quedarte sin caja si te pagan tarde. Un error frecuente es no tener plan para el retraso en el pago de facturas (Anexo 5).",
    },
  ],
};

const toForm = (inp: FinanceInputs): Record<Key, string> =>
  Object.fromEntries(
    (Object.keys(inp) as Key[]).map((k) => {
      const def = Object.values(FIELDS).flat().find((f) => f.key === k);
      const v = inp[k];
      if (def?.kind === "pct") return [k, String(Math.round(v * 1000) / 10)];
      // Montos y unidades en 0 se muestran vacíos para que el usuario los complete.
      if ((def?.kind === "clp" || def?.kind === "num") && v === 0) return [k, ""];
      return [k, String(v)];
    }),
  ) as Record<Key, string>;

function fromForm(form: Record<Key, string>): FinanceInputs {
  const out = {} as FinanceInputs;
  for (const k of Object.keys(form) as Key[]) {
    const def = Object.values(FIELDS).flat().find((f) => f.key === k);
    const n = Number(String(form[k]).replace(/\./g, "").replace(",", "."));
    const v = Number.isFinite(n) ? n : 0;
    out[k] = def?.kind === "pct" ? v / 100 : v;
  }
  return out;
}

type Props = { initial: FinanceInputs; completed: boolean; durationS: number | null; lastStep: number; profileId: string | null };

export function FinanceWizard({ initial, completed, durationS, lastStep, profileId }: Props) {
  const [form, setForm] = useState(() => toForm(initial));
  const [taxTouched, setTaxTouched] = useState(lastStep > 3);
  const [step, setStep] = useState(completed ? 5 : Math.min(lastStep, 4));
  const [neededHelp, setNeededHelp] = useState<boolean | null>(null);
  const [openHelp, setOpenHelp] = useState<Key | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ duration: number; profileId: string | null } | null>(
    completed ? { duration: durationS ?? 0, profileId } : null,
  );
  const helpSeen = useRef(new Set<Key>());
  const started = useRef(false);

  useEffect(() => {
    if (started.current || completed) return;
    started.current = true;
    startFinance().then(() => trackEvent("finanzas", "step_view", Math.min(lastStep, 4)));
  }, [completed, lastStep]);

  const inputs = useMemo(() => fromForm(form), [form]);
  const results = useMemo(() => computeFinance(inputs), [inputs]);

  function toggleHelp(f: FieldDef) {
    setOpenHelp((cur) => (cur === f.key ? null : f.key));
    if (!helpSeen.current.has(f.key)) {
      helpSeen.current.add(f.key);
      recordFinanceHelp(step, f.key);
    }
  }

  function validate(): string | null {
    const empty = (k: Key) => form[k].trim() === "";
    if (step === 0 && empty("investment")) return "Ingresa la inversión inicial (puede ser 0).";
    if (step === 1 && (inputs.price <= 0 || inputs.units <= 0)) return "Ingresa un precio y unidades mayores a 0.";
    if (step === 2 && (empty("variableCost") || empty("fixedCosts"))) return "Completa ambos costos (pueden ser 0).";
    if (step === 3 && (!taxTouched || empty("taxRate"))) return "Ingresa la tasa de impuesto (0 si no aplica).";
    if (step === 5 && neededHelp === null) return "Cuéntanos si necesitaste ayuda.";
    return null;
  }

  function next() {
    const v = validate();
    setError(v);
    if (v) return;
    start(async () => {
      if (step < 5) {
        const res = await saveFinanceStep(step, inputs);
        if (res.error) return setError(res.error);
        setStep(step + 1);
        setOpenHelp(null);
        trackEvent("finanzas", "step_view", step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const res = await completeFinance(inputs, neededHelp ?? false);
        if (res.error || !res.ok) return setError(res.error ?? "Error");
        setDone({ duration: res.duration_s, profileId: res.profileId });
      }
    });
  }

  return (
    <Card>
      <Stepper steps={STEPS} current={step} />

      {step < 5 && (
        <div className="space-y-6">
          {FIELDS[step].map((f) => (
            <div key={f.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor={f.key} className="text-lg font-extrabold">
                  {f.label}
                </label>
                <button
                  type="button"
                  onClick={() => toggleHelp(f)}
                  aria-expanded={openHelp === f.key}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50"
                >
                  <CircleHelp className="h-4 w-4" /> ¿Qué es?
                </button>
              </div>
              {openHelp === f.key && <p className="mb-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">{f.help}</p>}
              <NumberInput
                id={f.key}
                def={f}
                value={form[f.key]}
                onChange={(v) => {
                  if (f.key === "taxRate") setTaxTouched(true);
                  setForm((cur) => ({ ...cur, [f.key]: v }));
                }}
              />
            </div>
          ))}
          {step >= 1 && inputs.price > 0 && inputs.units > 0 && <LivePreview results={results} />}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-8">
          <Results results={results} inputs={inputs} />
          {!done && (
            <Question title="¿Necesitaste ayuda de otra persona para completar la plantilla?" hint="Las ayudas de la pantalla no cuentan.">
              <YesNo value={neededHelp} onChange={setNeededHelp} />
            </Question>
          )}
          {done && <DoneLinks duration={done.duration} profileId={done.profileId} />}
        </div>
      )}

      {error && <p className="mt-6 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}

      {!(step === 5 && done) && (
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" type="button" onClick={() => (setError(null), setStep(step - 1))}>
              <ArrowLeft className="h-5 w-5" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={next} disabled={pending}>
            {pending ? "Guardando…" : step === 5 ? "Guardar mis números" : step === 4 ? "Ver resultados" : "Siguiente"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
      {step === 5 && done && (
        <div className="mt-6 text-center">
          <Button variant="ghost" type="button" onClick={() => (setDone(null), setStep(0))}>
            Editar supuestos
          </Button>
        </div>
      )}
    </Card>
  );
}

function NumberInput({ id, def, value, onChange }: { id: string; def: FieldDef; value: string; onChange: (v: string) => void }) {
  const isMoney = def.kind === "clp";
  const display = isMoney && value !== "" ? formatNumber(Number(value.replace(/\./g, "")) || 0) : value;
  return (
    <div className="relative">
      {isMoney && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">$</span>}
      <input
        id={id}
        inputMode={def.kind === "pct" ? "decimal" : "numeric"}
        className={`${inputClass} tabular text-xl font-bold ${isMoney ? "pl-9" : ""} ${def.suffix ? "pr-28" : ""}`}
        value={display}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          if (isMoney || def.kind === "num" || def.kind === "days") onChange(raw.replace(/[^\d]/g, ""));
          else onChange(raw.replace(/[^\d,.-]/g, ""));
        }}
      />
      {def.suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{def.suffix}</span>}
    </div>
  );
}

function LivePreview({ results }: { results: FinanceResults }) {
  const b = results.scenarios.base;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sand p-4 text-sm">
      <div>
        <p className="font-bold text-muted">Ventas año 1</p>
        <p className="tabular text-lg font-extrabold">{formatCLPShort(b.revenueByYear[0])}</p>
      </div>
      <div>
        <p className="font-bold text-muted">Equilibrio</p>
        <p className="tabular text-lg font-extrabold">
          {results.breakEvenUnits === null ? "Sin margen" : `${formatNumber(results.breakEvenUnits)} u/mes`}
        </p>
      </div>
    </div>
  );
}

function Results({ results, inputs }: { results: FinanceResults; inputs: FinanceInputs }) {
  const { base, pesimista, optimista, contingencia } = results.scenarios;
  const npvPositive = base.npv >= 0;
  const capital = -Math.min(base.minCumulative, contingencia.minCumulative);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="VAN (3 años)" value={formatCLPShort(base.npv)} tone={npvPositive ? "good" : "bad"} note={npvPositive ? "Crea valor" : "No cubre la tasa exigida"} />
        <Kpi
          label="TIR anual"
          value={base.irr.value === null ? "—" : formatPct(base.irr.value)}
          tone={base.irr.value !== null && base.irr.value >= inputs.discountRate ? "good" : "bad"}
          note={base.irr.value === null ? IRR_STATUS_TEXT[base.irr.status] : `vs ${formatPct(inputs.discountRate)} exigida`}
        />
        <Kpi
          label="Recuperas la inversión"
          value={base.paybackMonth ? `Mes ${base.paybackMonth}` : "—"}
          tone={base.paybackMonth ? "good" : "bad"}
          note={base.paybackMonth ? "Escenario base" : "No en 36 meses"}
        />
        <Kpi
          label="Punto de equilibrio"
          value={results.breakEvenUnits === null ? "—" : `${formatNumber(results.breakEvenUnits)} u`}
          tone={results.breakEvenUnits === null ? "bad" : "neutral"}
          note={results.breakEvenUnits === null ? "El precio no cubre el costo variable" : "unidades al mes"}
        />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <CashChart
          title="Flujo de caja acumulado por escenario"
          series={[
            { key: "optimista", label: "Optimista", color: SERIES_COLORS.blue, values: optimista.cumulative },
            { key: "base", label: "Base", color: SERIES_COLORS.green, values: base.cumulative },
            { key: "pesimista", label: "Pesimista", color: SERIES_COLORS.coral, dashed: true, values: pesimista.cumulative },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line p-4">
          <CashChart
            title={`Contingencia: te pagan con ${inputs.paymentDelayDays} días de atraso`}
            height={220}
            series={[
              { key: "base", label: "Base", color: SERIES_COLORS.green, values: base.cumulative },
              { key: "contingencia", label: "Con atraso", color: SERIES_COLORS.coral, dashed: true, values: contingencia.cumulative },
            ]}
          />
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-coral-50 p-5">
          <p className="text-sm font-bold text-coral-700">Capital que necesitas tener</p>
          <p className="tabular mt-1 text-4xl font-extrabold text-coral-600">{formatCLPShort(capital)}</p>
          <p className="mt-2 text-sm text-ink">El peor saldo de caja entre el escenario base y el atraso de pagos. Es lo mínimo que deberías levantar.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[520px] text-sm tabular">
          <thead className="bg-sand text-left">
            <tr>
              <th className="px-4 py-2">Escenario</th>
              <th className="px-4 py-2 text-right">VAN</th>
              <th className="px-4 py-2 text-right">TIR</th>
              <th className="px-4 py-2 text-right">Ventas año 1 / 2 / 3</th>
              <th className="px-4 py-2 text-right">Recupera</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Pesimista", pesimista],
                ["Base", base],
                ["Optimista", optimista],
                ["Contingencia", contingencia],
              ] as const
            ).map(([name, s]) => (
              <tr key={name} className="border-t border-line">
                <td className="px-4 py-2 font-bold">{name}</td>
                <td className={`px-4 py-2 text-right ${s.npv < 0 ? "text-coral-700" : ""}`}>{formatCLP(s.npv)}</td>
                <td className="px-4 py-2 text-right">{s.irr.value === null ? "—" : formatPct(s.irr.value)}</td>
                <td className="px-4 py-2 text-right">{s.revenueByYear.map(formatCLPShort).join(" / ")}</td>
                <td className="px-4 py-2 text-right">{s.paybackMonth ? `Mes ${s.paybackMonth}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Supuestos: 36 meses, sin valor terminal; crecimiento mensual constante; impuesto con arrastre de pérdidas; tasa anual convertida a mensual.
      </p>
    </div>
  );
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note: string; tone: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-brand-600" : tone === "bad" ? "text-coral-600" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`tabular mt-1 text-2xl font-extrabold sm:text-3xl ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

function DoneLinks({ duration, profileId }: { duration: number; profileId: string | null }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center justify-center gap-2 rounded-2xl bg-brand-50 p-4 font-bold text-brand-800">
        <Timer className="h-5 w-5" /> ¡Números listos! {duration > 0 && <>Te tomó {formatDuration(duration)} min.</>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {profileId ? (
          <Link href={`/ficha/${profileId}`} className="rounded-card border-2 border-coral-500 bg-white p-5 transition hover:bg-coral-50">
            <FileCheck2 className="h-7 w-7 text-coral-500" />
            <p className="mt-2 text-lg font-extrabold">Ver mi ficha</p>
            <p className="text-sm text-muted">Perfil + indicadores, lista para enviar.</p>
          </Link>
        ) : (
          <Link href="/perfil" className="rounded-card border-2 border-coral-500 bg-white p-5 transition hover:bg-coral-50">
            <FileCheck2 className="h-7 w-7 text-coral-500" />
            <p className="mt-2 text-lg font-extrabold">Completa tu perfil</p>
            <p className="text-sm text-muted">Lo necesitas para generar la ficha.</p>
          </Link>
        )}
        <Link href="/conexiones" className="rounded-card border border-line bg-white p-5 transition hover:bg-brand-50">
          <Handshake className="h-7 w-7 text-brand-600" />
          <p className="mt-2 text-lg font-extrabold">Ver conexiones sugeridas</p>
          <p className="text-sm text-muted">Socios, mentores e inversionistas para ti.</p>
        </Link>
      </div>
    </div>
  );
}
