import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, Check, ClipboardCheck, ScrollText, Users } from "lucide-react";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { CashChart } from "@/components/cash-chart";
import { loadEntrepreneurSummary, loadEvaluatorSummary, type EntrepreneurSummary } from "@/lib/participant-summary";
import { EVALUATOR_TYPES, INDUSTRIES, label, NETWORK_KINDS, SEEKING, SKILLS, STAGES } from "@/lib/catalog";
import { IRR_STATUS_TEXT, SCENARIO_LABELS, type FinanceSummary } from "@/lib/finance";
import { formatCLPShort, formatNumber, formatPct } from "@/lib/format";
import { DECISION_RULES, LEAVE_RULES, PACT_ROLES } from "@/lib/pact";
import { SERIES_COLORS } from "@/lib/chart-colors";

function Section({ title, text, href, action, children, readOnly = false }: { readOnly?: boolean; title: string; text: string; href: string; action: string; children: ReactNode }) {
  return <Card className="min-w-0 sm:p-8"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{text}</p></div>{!readOnly && <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 underline underline-offset-4">{action}<ArrowUpRight className="h-4 w-4" /></Link>}</div>{children}</Card>;
}

function Metric({ title, value, detail }: { title: string; value: ReactNode; detail: string }) {
  return <div className="min-w-0 rounded-2xl border border-line bg-paper p-4"><p className="text-xs font-bold text-muted">{title}</p><p className="mt-2 break-words text-2xl font-extrabold tabular">{value}</p><p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p></div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-paper p-5 text-sm leading-relaxed text-muted">{children}</p>;
}

export async function EntrepreneurProfile() {
  return <EntrepreneurSummaryView data={await loadEntrepreneurSummary()} />;
}

export function EntrepreneurSummaryView({ data, readOnly = false }: { data: EntrepreneurSummary; readOnly?: boolean }) {
  const { profile, participant, finance, pact, connectionsCompleted } = data;
  const completed = [Boolean(profile?.completed), Boolean(finance?.completed), connectionsCompleted];
  const next = !completed[0] ? { href: "/perfil", title: "Completar mi proyecto" } : !completed[1] ? { href: "/finanzas", title: "Completar mis finanzas" } : !completed[2] ? { href: "/conexiones", title: "Explorar mis conexiones" } : !pact?.completed ? { href: "/pacto", title: "Crear pacto de socios (opcional)" } : null;
  return <div className="space-y-6">
    <header className="overflow-hidden rounded-card bg-network p-6 text-white sm:p-10">
      <Badge tone="muted">Mi espacio · Emprendedor</Badge>
      <h1 className="mt-5 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{profile?.project_name || "Tu próximo proyecto empieza aquí"}</h1>
      <p className="mt-2 text-brand-50">{participant.name}{profile?.industry ? ` · ${label(INDUSTRIES, profile.industry)}` : ""}{profile?.region ? ` · ${profile.region}` : ""}</p>
      <div className="mt-5 flex flex-wrap gap-2"><Badge tone="muted">{profile?.stage ? label(STAGES, profile.stage) : "Proyecto por completar"}</Badge>{profile?.seeking.map((item) => <Badge key={item} tone="muted">Busca {label(SEEKING, item).toLowerCase()}</Badge>)}</div>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-brand-50">Un resumen personal de lo que has construido. Las proyecciones y las sugerencias se basan en los datos de tu proyecto.</p>
    </header>
    {!readOnly && <Card><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-extrabold">Tu recorrido · {completed.filter(Boolean).length} de 3 pasos completados</p><p className="mt-1 text-sm text-muted">El pacto es opcional si todavía no tienes socio.</p></div>{next && <ButtonLink href={next.href}>{next.title}</ButtonLink>}</div><div className="mt-5 grid gap-2 sm:grid-cols-4">{[{ title: "Proyecto", href: "/perfil", done: completed[0] }, { title: "Finanzas", href: "/finanzas", done: completed[1] }, { title: "Conexiones", href: "/conexiones", done: completed[2] }, { title: "Pacto · opcional", href: "/pacto", done: Boolean(pact?.completed) }].map((item) => <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${item.done ? "bg-brand-50 text-brand-800" : "bg-paper text-muted"}`}>{item.done ? <Check className="h-4 w-4" /> : <span className="h-3 w-3 rounded-full border border-muted" />}{item.title}</Link>)}</div></Card>}

    <Section readOnly={readOnly} title="Tus números más importantes" text="Proyección a 36 meses. El escenario base usa los supuestos que ingresaste; los resultados no son ventas reales." href="/finanzas" action={finance?.completed ? "Revisar números" : "Completar finanzas"}>
      {finance?.completed && finance.results ? <FinanceOverview summary={finance.results} /> : <Empty><ChartNoAxesCombined className="mb-3 h-7 w-7 text-brand-600" />Completa tus ventas, costos e inversión para ver aquí la rentabilidad, el punto de equilibrio y el dinero que necesita tu proyecto.</Empty>}
    </Section>

    <Section readOnly={readOnly} title="Tu proyecto en pocas palabras" text="La idea, las personas a quienes ayudas y lo que tú aportas." href="/perfil" action="Editar proyecto">
      {profile ? <><div className="grid gap-5 sm:grid-cols-2">{[{ title: "Problema", value: profile.problem }, { title: "Solución", value: profile.solution }, { title: "Clientes", value: profile.customer }, { title: "Avances", value: profile.traction }].map((item) => <div key={item.title}><h3 className="text-sm font-bold text-muted">{item.title}</h3><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{item.value || "Aún no completado"}</p></div>)}</div><div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">{profile.skills.map((skill) => <Badge key={skill.skill}>{label(SKILLS, skill.skill)}</Badge>)}</div></> : <Empty>Cuéntanos tu idea para darle forma a este espacio.</Empty>}
    </Section>
    <ConnectionsOverview data={data} readOnly={readOnly} />
    <Section readOnly={readOnly} title="El acuerdo con tus socios" text="Un resumen del pacto que prepararon. Guardarlo aquí no equivale a que esté firmado." href="/pacto" action={pact ? "Revisar pacto" : "Crear pacto"}>
      {pact?.completed ? <><div className="grid gap-4 sm:grid-cols-2">{pact.data.partners.map((partner, i) => <div key={i} className="rounded-2xl bg-paper p-5"><p className="font-extrabold">{partner.name || `Socio ${i + 1}`}</p><p className="mt-1 text-sm text-muted">{label(PACT_ROLES, partner.role)}</p><p className="mt-4 text-xl font-extrabold text-brand-700">{partner.equity} % de participación</p><p className="mt-2 text-sm text-muted">Dedicación: {partner.dedication} % · Capital: {formatCLPShort(partner.capital)}</p><p className="mt-3 break-words text-sm">{partner.contribution}</p></div>)}</div><div className="mt-5 space-y-2 text-sm text-muted"><p>Reserva para futuros socios o equipo: {pact.data.pool} %.</p><p>Participación gradual en {pact.data.vestingYears} años; tiempo mínimo inicial de {pact.data.cliffMonths} meses.</p><p>{label(DECISION_RULES, pact.data.decisions)}.</p><p>Revisión del acuerdo cada {pact.data.reviewMonths} meses.</p><div><p className="font-bold text-ink">Reglas de salida acordadas</p><ul className="mt-2 list-disc space-y-1 pl-5">{pact.data.leaveRules.map((rule) => <li key={rule}>{label(LEAVE_RULES, rule)}</li>)}</ul></div></div></> : <Empty><ScrollText className="mb-3 h-7 w-7 text-brand-600" />{pact ? "Tienes un borrador en curso. Termínalo para ver el resumen del reparto y los acuerdos." : "Si tienes socio, definan roles, aportes, reparto y reglas de salida. Puedes dejar este paso para más adelante."}</Empty>}
    </Section>
  </div>;
}

function FinanceOverview({ summary }: { summary: FinanceSummary }) {
  const base = summary.scenarios.base;
  const capital = -Math.min(0, base.min_cumulative, summary.scenarios.contingencia.min_cumulative);
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric title="VAN · escenario base" value={formatCLPShort(base.npv)} detail={base.npv >= 0 ? "Valor estimado después de recuperar la inversión y exigir la rentabilidad que definiste." : "Con estos supuestos, el proyecto no alcanza la rentabilidad exigida en el período."} />
      <Metric title="TIR anual estimada" value={base.irr === null ? "No calculable" : formatPct(base.irr)} detail={base.irr === null ? IRR_STATUS_TEXT[base.irr_status] : "Rentabilidad anual implícita de los flujos proyectados. Compárala con tu tasa de descuento."} />
      <Metric title="Punto de equilibrio" value={summary.break_even_units === null ? "No alcanzable" : `${formatNumber(summary.break_even_units)} u/mes`} detail="Unidades mensuales para cubrir los costos operativos. No incluye recuperar la inversión inicial." />
      <Metric title="Capital necesario estimado" value={formatCLPShort(capital)} detail="Mayor déficit acumulado entre el caso base y el atraso de pagos, incluida la inversión inicial." />
    </div>
    <CashChart title="Cómo evoluciona tu caja acumulada" height={240} series={(["optimista", "base", "pesimista", "contingencia"] as const).map((key, i) => ({ key, label: SCENARIO_LABELS[key], values: summary.scenarios[key].cumulative, color: [SERIES_COLORS.blue, SERIES_COLORS.green, SERIES_COLORS.coral, "#5b6b67"][i], dashed: key === "pesimista" || key === "contingencia" }))} />
    <div className="grid gap-3 sm:grid-cols-3"><Metric title="Ventas proyectadas · año 1" value={formatCLPShort(base.revenue_by_year[0])} detail="Facturación estimada, antes de descontar costos e impuestos." /><Metric title="Recuperación de inversión" value={base.payback_month === null ? "No en 36 meses" : `Mes ${base.payback_month}`} detail="Mes desde el que el saldo acumulado se mantiene sin pérdidas dentro de la proyección." /><Metric title="Margen neto · año 1" value={base.margin_by_year[0] === null ? "Sin ventas" : formatPct(base.margin_by_year[0])} detail="Porcentaje de las ventas que queda después de costos e impuestos del modelo." /></div>
  </div>;
}

function ConnectionsOverview({ data, readOnly = false }: { data: EntrepreneurSummary; readOnly?: boolean }) {
  const ratings = new Map(data.ratings.map((row) => [row.network_profile_id, row.rating]));
  const matches = Object.values(data.matches ?? {}).flatMap((list) => [...list].sort((a, b) => (ratings.get(b.profile.id) ?? 0) - (ratings.get(a.profile.id) ?? 0) || b.score - a.score).slice(0, 1));
  return <Section readOnly={readOnly} title="Conexiones que pueden aportar" text="Una sugerencia por tipo de apoyo, priorizando tu calificación y luego la afinidad. Son sugerencias, no contactos confirmados." href="/conexiones" action="Explorar y calificar">
    {matches.length ? <div className="grid gap-4 lg:grid-cols-3">{matches.map((match) => <div key={match.profile.id} className="rounded-2xl border border-line p-5"><div className="mb-4 flex flex-wrap gap-2"><Badge>{label(NETWORK_KINDS, match.profile.kind)}</Badge>{match.profile.is_demo && <Badge tone="sun">Demostración</Badge>}</div><h3 className="font-extrabold">{match.profile.name}</h3><p className="mt-1 text-sm text-muted">{match.profile.headline}</p><p className="mt-4 text-sm leading-relaxed">{match.summary}</p><p className="mt-4 text-xs font-bold text-brand-700">Afinidad: {match.score}/100{ratings.get(match.profile.id) ? ` · Tu calificación: ${ratings.get(match.profile.id)}/5` : " · Aún sin calificar"}</p></div>)}</div> : <Empty><Users className="mb-3 h-7 w-7 text-brand-600" />{data.profile?.completed ? "No hay sugerencias disponibles en este momento." : "Completa tu proyecto y tus competencias para encontrar apoyo que complemente lo que sabes hacer."}</Empty>}
  </Section>;
}

const yesNo = (value: boolean | null) => value === null ? "Sin responder" : value ? "Sí" : "No";
const variantName = (variant: "A" | "B") => variant === "A" ? "Mensaje de contacto" : "Ficha estandarizada";

export async function EvaluatorProfile() {
  return <EvaluatorSummaryView data={await loadEvaluatorSummary()} />;
}

export function EvaluatorSummaryView({ data, readOnly = false }: { data: Awaited<ReturnType<typeof loadEvaluatorSummary>>; readOnly?: boolean }) {
  const { participant, evaluation: e } = data;
  return <div className="space-y-6">
    <header className="rounded-card bg-network p-6 text-white sm:p-10"><Badge tone="muted">Mi espacio · Evaluador</Badge><h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">Tu mirada sobre el proyecto</h1><p className="mt-3 text-brand-50">{participant.name}{e?.evaluator_type ? ` · ${label(EVALUATOR_TYPES, e.evaluator_type)}` : ""}</p><p className="mt-5 max-w-2xl text-sm leading-relaxed text-brand-50">Aquí están tus respuestas sobre Vigía, el proyecto ficticio del ejercicio. Este espacio no contiene datos de emprendedores reales.</p></header>
    <Card><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><ClipboardCheck className="h-8 w-8 text-brand-600" /><div><h2 className="font-extrabold">{e?.completed_at ? "Evaluación completada" : e?.answered_at ? "Respuestas guardadas · comparación pendiente" : "Tu evaluación está pendiente"}</h2><p className="mt-1 text-sm text-muted">{e?.answered_at ? `Primera versión: ${variantName(e.variant)}. Tus respuestas iniciales se conservan.` : "Revisa el ejemplo y comparte tu opinión para completar este resumen."}</p></div></div>{!readOnly && !e?.completed_at && <ButtonLink href="/evaluar">{e?.answered_at ? "Terminar comparación" : "Ir a evaluar"}</ButtonLink>}</div></Card>
    {e?.answered_at && <>
      <Section readOnly={readOnly} title="Lo que respondiste" text="Estas respuestas corresponden a la primera versión que viste." href="/evaluar" action="Volver al ejercicio"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Disposición a reunirte" value={e.meeting_score === null ? "Sin responder" : `${e.meeting_score}/5`} detail="1 significa ninguna disposición y 5, máxima disposición." /><Metric title="¿Aceptarías la reunión?" value={yesNo(e.meeting_yes)} detail="Tu decisión para el proyecto presentado." /><Metric title="Solidez de la propuesta" value={e.defensibility === null ? "Sin responder" : `${e.defensibility}/5`} detail="Qué tan convincentes te parecieron los argumentos y números." /><Metric title="¿Recibirías propuestas por esta vía?" value={yesNo(e.would_receive)} detail="Tu interés en recibir proyectos prefiltrados en este formato." /></div><h3 className="mt-6 text-sm font-bold text-muted">Tu comentario</h3><p className="mt-2 whitespace-pre-wrap break-words">{e.comment || "No agregaste un comentario."}</p></Section>
      <Card><h2 className="text-xl font-extrabold">Tu preferencia de presentación</h2><p className="mt-3 font-bold text-brand-700">{!e.completed_at ? "Comparación pendiente" : e.preferred ? variantName(e.preferred) : "Elegiste no comparar"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{e.preferred_why || (e.preferred ? "No agregaste un motivo." : "El mensaje y la ficha presentan el mismo proyecto con distinto nivel de detalle.")}</p></Card>
    </>}
    {!readOnly && <Link href="/mi-perfil" className="inline-block text-sm font-bold text-brand-700 underline underline-offset-4">Cambiar de espacio</Link>}
  </div>;
}
