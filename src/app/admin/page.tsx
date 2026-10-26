import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { CheckCircle2, Download, Hourglass, Lock, Users, XCircle } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import { isAdmin } from "@/lib/admin";
import { loadAdminData, type AdminData } from "@/lib/admin-data";
import { AGE_RANGES, EVALUATOR_TYPES, INDUSTRIES, label, OBSTACLES, STAGES, WTP_RANGES } from "@/lib/catalog";
import { formatDuration, formatPct } from "@/lib/format";
import type { Criterion, HypothesisResult, Status } from "@/lib/hypotheses";
import { isDbConfigured, missingEnv } from "@/lib/supabase";
import { DeleteIteration, IterationForm, LoginForm, LogoutButton, SettingsForm, TestToggle } from "./forms";

export const metadata: Metadata = { title: "Resultados de validación", robots: { index: false } };

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <AdminGate />
      </Suspense>
    </section>
  );
}

async function AdminGate() {
  await connection();
  if (!isDbConfigured()) return <Card className="bg-sun-100">Faltan variables de entorno: {missingEnv().join(", ")}.</Card>;
  if (!(await isAdmin())) {
    return (
      <Card className="py-10">
        <Lock className="mx-auto h-10 w-10 text-brand-600" />
        <p className="mb-6 mt-2 text-center text-xl font-extrabold">Dashboard de validación</p>
        <LoginForm />
      </Card>
    );
  }
  const data = await loadAdminData();
  return <Dashboard d={data} />;
}

// ---------------------------------------------------------------------------

const STATUS: Record<Status, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  validada: { label: "Validada", icon: CheckCircle2, cls: "bg-brand-600 text-white" },
  no_validada: { label: "No validada", icon: XCircle, cls: "bg-coral-500 text-white" },
  insuficiente: { label: "Datos insuficientes", icon: Hourglass, cls: "bg-sun-100 text-sun-600" },
};

function display(c: Criterion, v: number | null = c.value) {
  if (v === null) return "—";
  if (c.kind === "pct") return formatPct(v);
  if (c.kind === "avg5") return `${v.toLocaleString("es-CL", { maximumFractionDigits: 2 })}/5`;
  if (c.kind === "seconds") return `${formatDuration(v)} min`;
  return `${v > 0 ? "+" : ""}${v.toLocaleString("es-CL", { maximumFractionDigits: 2 })}`;
}

// Posición (0–1) de un valor en la barra según el tipo de métrica.
function position(c: Criterion, v: number) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  if (c.kind === "pct") return clamp(v);
  if (c.kind === "avg5") return clamp((v - 1) / 4);
  if (c.kind === "seconds") return clamp(v / 1200);
  return clamp((v + 4) / 8);
}

function Dashboard({ d }: { d: AdminData }) {
  const updated = new Date().toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });
  const ab = d.extras.meetingByVariant;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-600">Hito 3 · Validación</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Resultados en vivo</h1>
          <p className="text-sm text-muted">
            Solo datos reales registrados · sesiones de prueba excluidas ({d.counts.test}) · {updated}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/export"
            className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-3 font-bold text-white hover:bg-coral-600"
          >
            <Download className="h-5 w-5" /> Exportar todo (CSV)
          </a>
          <LogoutButton />
        </div>
      </header>

      {/* Avance de la muestra */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SampleBar label="Emprendedores" n={d.counts.emprendedores} target={d.settings.target_n.emprendedores} />
        <SampleBar label="Evaluadores" n={d.counts.evaluadores} target={d.settings.target_n.evaluadores} />
      </div>

      {/* Hipótesis */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">Hipótesis vs umbrales del Hito 2</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {d.results.map((h) => (
            <HypothesisCard key={h.id} h={h} minN={d.settings.min_n} />
          ))}
        </div>
      </section>

      {/* A vs B */}
      <section>
        <h2 className="mb-1 text-xl font-extrabold">Test A/B: contacto en frío (A) vs ficha estandarizada (B)</h2>
        <p className="mb-4 text-sm text-muted">Primera respuesta de cada evaluador, antes de ver la otra versión.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <CompareCard
            title="Aceptaría la reunión"
            a={ab.A.n ? ab.A.yes / ab.A.n : null}
            b={ab.B.n ? ab.B.yes / ab.B.n : null}
            nA={ab.A.n}
            nB={ab.B.n}
            fmt={(v) => formatPct(v)}
            max={1}
          />
          <CompareCard title="Disposición a reunirse (1–5)" a={ab.A.avgScore} b={ab.B.avgScore} nA={ab.A.n} nB={ab.B.n} fmt={(v) => v.toFixed(1)} max={5} />
          <CompareCard title="Defendible (1–5)" a={ab.A.avgDefensibility} b={ab.B.avgDefensibility} nA={ab.A.n} nB={ab.B.n} fmt={(v) => v.toFixed(1)} max={5} />
        </div>
      </section>

      {/* Uso: embudos y tiempos */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="font-extrabold">Perfil: hasta qué paso llegan</h3>
          <Funnel data={d.funnels.perfil} />
        </Card>
        <Card>
          <h3 className="font-extrabold">Finanzas: hasta qué paso llegan</h3>
          <Funnel data={d.funnels.finanzas} />
          <p className="mt-3 text-xs text-muted">Ayudas abiertas en la plantilla: {d.helpOpens}</p>
        </Card>
        <Card>
          <h3 className="font-extrabold">Tiempo de creación del perfil</h3>
          <Durations seconds={d.extras.durations} />
        </Card>
      </section>

      {/* Segmentación */}
      <section>
        <h2 className="mb-1 text-xl font-extrabold">Quiénes participaron</h2>
        <p className="mb-4 text-sm text-muted">Evidencia nueva del problema y del perfil del cliente (feedback del Hito 2).</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Distribution title="Principal obstáculo hoy" rows={d.segments.obstacle} map={OBSTACLES} />
          <Distribution title="Etapa" rows={d.segments.stage} map={STAGES} />
          <Distribution title="Rubro" rows={d.segments.industry} map={INDUSTRIES} />
          <Distribution title="Edad" rows={[...d.segments.age].sort((a, b) => AGE_RANGES.indexOf(a[0] as never) - AGE_RANGES.indexOf(b[0] as never))} />
          <Distribution title="Región" rows={d.segments.region} />
          <Distribution title="Disposición a pagar (mensual)" rows={d.segments.wtp} map={WTP_RANGES} />
          <Distribution title="Rol de los evaluadores" rows={d.segments.evaluatorType} map={EVALUATOR_TYPES} />
        </div>
      </section>

      {/* Comentarios */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">Lo que dijeron ({d.comments.length})</h2>
        {d.comments.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay comentarios.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {d.comments.map((c, i) => (
              <blockquote key={i} className="rounded-2xl border-l-4 border-brand-500 bg-white p-4">
                <p className="text-ink">“{c.text}”</p>
                <footer className="mt-2 text-xs font-bold text-muted">{c.who}</footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {/* Iteraciones */}
      <section>
        <h2 className="mb-1 text-xl font-extrabold">Bitácora de iteraciones</h2>
        <p className="mb-4 text-sm text-muted">Mejoras hechas a partir de la validación (lo pide la pauta del pitch).</p>
        <Card>
          <IterationForm />
          {d.iterations.length > 0 && (
            <ul className="mt-5 divide-y divide-line">
              {d.iterations.map((it) => (
                <li key={it.id} className="flex items-start gap-3 py-3 text-sm">
                  <Badge tone="brand">{it.module}</Badge>
                  <div className="flex-1">
                    <p className="font-bold">{it.change}</p>
                    <p className="text-muted">{it.reason}</p>
                  </div>
                  <span className="text-xs text-muted">{it.date}</span>
                  <DeleteIteration id={it.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Participantes */}
      <section>
        <h2 className="mb-1 text-xl font-extrabold">Participantes ({d.participants.length})</h2>
        <p className="mb-4 text-sm text-muted">Marca como «Prueba» las sesiones del equipo para excluirlas de la validación.</p>
        <ParticipantsTable d={d} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-extrabold">Configuración</h2>
        <Card>
          <SettingsForm emp={d.settings.target_n.emprendedores} ev={d.settings.target_n.evaluadores} minN={d.settings.min_n} />
        </Card>
      </section>
    </div>
  );
}

function SampleBar({ label: name, n, target }: { label: string; n: number; target: number }) {
  return (
    <Card className="flex items-center gap-4">
      <Users className="h-8 w-8 shrink-0 text-brand-600" />
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <p className="font-extrabold">{name}</p>
          <p className="tabular text-2xl font-extrabold">
            {n}
            <span className="text-base text-muted">/{target}</span>
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (n / target) * 100)}%` }} />
        </div>
      </div>
    </Card>
  );
}

function HypothesisCard({ h, minN }: { h: HypothesisResult; minN: number }) {
  const s = STATUS[h.status];
  const Icon = s.icon;
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular text-sm font-extrabold text-coral-600">{h.id}</p>
          <p className="text-lg font-extrabold leading-tight">{h.title}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${s.cls}`}>
          <Icon className="h-4 w-4" /> {s.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">Umbral: {h.rule}</p>

      <div className="mt-4 space-y-5">
        {h.criteria.map((c) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold">{c.label}</p>
              <p className={`tabular text-2xl font-extrabold ${c.pass === null ? "text-muted" : c.pass ? "text-brand-600" : "text-coral-600"}`}>
                {display(c)}
              </p>
            </div>
            <div className="relative mt-2 h-3 rounded-full bg-sand" aria-hidden="true">
              {c.value !== null && (
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${c.pass === null ? "bg-line" : c.pass ? "bg-brand-500" : "bg-coral-500"}`}
                  style={{ width: `${position(c, c.value) * 100}%` }}
                />
              )}
              <div className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${position(c, c.threshold) * 100}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span className="tabular">n = {c.n}</span>
              <span>
                umbral {c.comparator === "<" ? "<" : c.comparator === ">" ? ">" : "≥"} {display(c, c.threshold)}
                {c.pass === null && ` · faltan datos (mín. ${c.kind === "diff" ? "por versión" : minN})`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// A = coral, B = verde: par validado con el script de la guía de visualización; además van rotulados.
function CompareCard({
  title,
  a,
  b,
  nA,
  nB,
  fmt,
  max,
}: {
  title: string;
  a: number | null;
  b: number | null;
  nA: number;
  nB: number;
  fmt: (v: number) => string;
  max: number;
}) {
  const row = (name: string, v: number | null, n: number, color: string) => (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-bold">{name}</span>
        <span className="tabular font-extrabold">
          {v === null ? "—" : fmt(v)} <span className="text-xs font-bold text-muted">n={n}</span>
        </span>
      </div>
      <div className="mt-1 h-3 rounded-full bg-sand">
        {v !== null && <div className="h-full rounded-full" style={{ width: `${Math.max(2, (v / max) * 100)}%`, background: color }} />}
      </div>
    </div>
  );
  return (
    <Card className="space-y-3">
      <p className="font-extrabold">{title}</p>
      {row("A · contacto en frío", a, nA, "#e9502f")}
      {row("B · ficha estandarizada", b, nB, "#00876c")}
    </Card>
  );
}

function Funnel({ data }: { data: AdminData["funnels"]["perfil"] }) {
  const max = Math.max(1, ...data.reached.map((r) => r.n));
  return (
    <div className="mt-3 space-y-2">
      {data.reached.map((r, i) => (
        <div key={r.label} className="text-xs">
          <div className="flex justify-between">
            <span className="font-bold">{r.label}</span>
            <span className="tabular text-muted">
              {r.n}
              {data.abandoned[i].n > 0 && <span className="text-coral-700"> · {data.abandoned[i].n} abandonó aquí</span>}
            </span>
          </div>
          <div className="mt-0.5 h-2 rounded-full bg-sand">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs font-bold text-muted">
        Iniciaron {data.started} · completaron {data.completed}
      </p>
    </div>
  );
}

function Durations({ seconds }: { seconds: number[] }) {
  const buckets = [
    { label: "< 5 min", test: (s: number) => s < 300 },
    { label: "5–10 min", test: (s: number) => s >= 300 && s < 600 },
    { label: "10–15 min", test: (s: number) => s >= 600 && s < 900 },
    { label: "≥ 15 min", test: (s: number) => s >= 900 },
  ].map((b) => ({ ...b, n: seconds.filter(b.test).length }));
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <div className="mt-3 space-y-2">
      {buckets.map((b, i) => (
        <div key={b.label} className="text-xs">
          <div className="flex justify-between">
            <span className="font-bold">{b.label}</span>
            <span className="tabular text-muted">{b.n}</span>
          </div>
          <div className="mt-0.5 h-2 rounded-full bg-sand">
            <div className={`h-full rounded-full ${i < 2 ? "bg-brand-500" : "bg-coral-500"}`} style={{ width: `${(b.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted">Perfiles completados: {seconds.length} · meta: menos de 10 min</p>
    </div>
  );
}

function Distribution({ title, rows, map }: { title: string; rows: [string, number][]; map?: Record<string, string> }) {
  const total = rows.reduce((a, r) => a + r[1], 0);
  return (
    <Card>
      <p className="font-extrabold">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Sin datos aún.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 8).map(([k, n]) => (
            <div key={k} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-bold">{map ? label(map, k) : k}</span>
                <span className="tabular shrink-0 text-muted">
                  {n} · {formatPct(n / total)}
                </span>
              </div>
              <div className="mt-0.5 h-2 rounded-full bg-sand">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ParticipantsTable({ d }: { d: AdminData }) {
  const done = (rows: Record<string, unknown>[], key = "completed") =>
    new Set(rows.filter((r) => r[key]).map((r) => r.participant_id as string));
  const perfil = done(d.raw.profiles);
  const fin = done(d.raw.finance);
  const fb = new Set(d.raw.feedback.map((r) => r.participant_id as string));
  const ev = done(d.raw.evaluations, "answered_at");
  const pacto = done(d.raw.pacts);
  const mark = (on: boolean) => (on ? "✓" : "·");

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-sand text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2">Código</th>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Rol</th>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2 text-center">Perfil</th>
            <th className="px-4 py-2 text-center">Finanzas</th>
            <th className="px-4 py-2 text-center">Conexiones</th>
            <th className="px-4 py-2 text-center">Pacto</th>
            <th className="px-4 py-2 text-center">Evaluó</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {[...d.participants].reverse().map((p) => (
            <tr key={p.id} className={`border-t border-line ${p.is_test ? "bg-sun-100/50 text-muted" : ""}`}>
              <td className="tabular px-4 py-2 font-bold tracking-wider">{p.code}</td>
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.role}</td>
              <td className="px-4 py-2 text-xs">{new Date(p.created_at).toLocaleDateString("es-CL")}</td>
              <td className="px-4 py-2 text-center">{mark(perfil.has(p.id))}</td>
              <td className="px-4 py-2 text-center">{mark(fin.has(p.id))}</td>
              <td className="px-4 py-2 text-center">{mark(fb.has(p.id))}</td>
              <td className="px-4 py-2 text-center">{mark(pacto.has(p.id))}</td>
              <td className="px-4 py-2 text-center">{mark(ev.has(p.id))}</td>
              <td className="px-4 py-2">
                <TestToggle id={p.id} isTest={p.is_test} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
