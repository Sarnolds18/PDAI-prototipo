import Link from "next/link";
import { ArrowRight, BadgeCheck, ChartLine, FileCheck2, Handshake, UserRound, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const BENEFITS = [
  {
    icon: Users,
    title: "Conexiones que complementan",
    text: "Socios, mentores e inversionistas según lo que le falta a tu proyecto, no según a quién conoces.",
  },
  {
    icon: BadgeCheck,
    title: "Perfil validado",
    text: "Tus competencias con evidencia: confianza sin necesitar una referencia personal.",
  },
  {
    icon: ChartLine,
    title: "Números defendibles",
    text: "Flujo de caja, VAN, TIR y escenarios guiados paso a paso, sin saber de finanzas.",
  },
];

const STEPS = [
  { icon: UserRound, label: "Perfil", href: "/perfil" },
  { icon: ChartLine, label: "Finanzas", href: "/finanzas" },
  { icon: FileCheck2, label: "Ficha", href: "/perfil" },
  { icon: Handshake, label: "Conexiones", href: "/conexiones" },
];

export default function Home() {
  return (
    <>
      <section className="bg-network text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
              Para emprendedores en etapa inicial
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Tu proyecto abre puertas.
              <br />
              <span className="text-coral-300">No tus contactos.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-brand-50 sm:text-xl">
              Te conectamos con las personas correctas y te preparamos para que esa conexión se convierta en una oportunidad real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/perfil" variant="accent" className="px-8 py-4 text-lg">
                Crear mi perfil <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href="/evaluar" variant="light">
                Soy mentor o inversionista
              </ButtonLink>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-card bg-white p-6 text-ink">
              <div className="tabular text-6xl font-extrabold text-coral-500">16/17</div>
              <p className="mt-2 font-medium text-muted">entrevistas: el acceso a capital y mentoría depende de contactos previos</p>
            </div>
            <div className="rounded-card bg-brand-800 p-5">
              <div className="tabular text-4xl font-extrabold">46,4%</div>
              <p className="mt-2 text-sm text-brand-100">se financia con familia, amigos y colegas</p>
            </div>
            <div className="rounded-card bg-brand-800 p-5">
              <div className="tabular text-4xl font-extrabold">17/17</div>
              <p className="mt-2 text-sm text-brand-100">vio socios elegidos sin acuerdos escritos</p>
            </div>
            <p className="col-span-2 text-xs text-brand-100">Fuentes: 17 entrevistas del equipo (Hito 1) · GEM Chile 2025</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-card border border-line bg-white p-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
              <p className="mt-2 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center text-sm font-bold uppercase tracking-[0.16em] text-muted">Cómo funciona</h2>
          <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map(({ icon: Icon, label, href }, i) => (
              <li key={label}>
                <Link href={href} className="flex h-full flex-col items-center gap-3 rounded-card bg-white p-5 text-center transition hover:ring-2 hover:ring-brand-200">
                  <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral-500 text-xs font-extrabold">
                      {i + 1}
                    </span>
                  </span>
                  <span className="font-extrabold">{label}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <ButtonLink href="/perfil">
              Empezar ahora <ArrowRight className="h-5 w-5" />
            </ButtonLink>
            <p className="mt-3 text-sm text-muted">Diseñado para hacerlo solo, en menos de 10 minutos.</p>
          </div>
        </div>
      </section>
    </>
  );
}
