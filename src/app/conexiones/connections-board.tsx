"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Briefcase, ChevronDown, GraduationCap, HandCoins, MapPin, Send, Star, Users } from "lucide-react";
import { rateSuggestion, recordSuggestions, submitPlatformFeedback } from "@/app/actions/connections";
import { Chips, YesNo } from "@/components/form-bits";
import { Badge, Button, Card, inputClass } from "@/components/ui";
import { NETWORK_KINDS, WTP_RANGES, type NetworkKind } from "@/lib/catalog";
import type { Match } from "@/lib/matching";

const KIND_STYLE: Record<NetworkKind, { icon: typeof Users; bg: string; text: string }> = {
  socio: { icon: Users, bg: "bg-brand-600", text: "text-brand-600" },
  mentor: { icon: GraduationCap, bg: "bg-coral-500", text: "text-coral-600" },
  inversionista: { icon: HandCoins, bg: "bg-ink", text: "text-ink" },
};

type Props = {
  matches: Record<NetworkKind, Match[]>;
  order: NetworkKind[];
  initialRatings: Record<string, number>;
  feedbackDone: boolean;
};

export function ConnectionsBoard({ matches, order, initialRatings, feedbackDone }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordSuggestions();
  }, []);

  const total = order.reduce((n, k) => n + matches[k].length, 0);
  const rated = Object.keys(ratings).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand px-4 py-3 text-sm">
        <Star className="h-5 w-5 text-coral-500" />
        <span className="font-bold">Califica cada sugerencia de 1 a 5: ¿te serviría conocer a esta persona?</span>
        <span className="tabular ml-auto font-extrabold text-brand-700">
          {rated}/{total}
        </span>
      </div>

      {order.map((kind) => {
        const { icon: Icon, text } = KIND_STYLE[kind];
        return (
          <section key={kind}>
            <h2 className={`mb-4 flex items-center gap-2 text-2xl font-extrabold ${text}`}>
              <Icon className="h-6 w-6" /> {NETWORK_KINDS[kind]}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {matches[kind].map((m) => (
                <MatchCard
                  key={m.profile.id}
                  match={m}
                  rating={ratings[m.profile.id] ?? null}
                  onRate={(r) => setRatings((cur) => ({ ...cur, [m.profile.id]: r }))}
                />
              ))}
            </div>
          </section>
        );
      })}

      <FeedbackPanel done={feedbackDone} />
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(" ");
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function MatchCard({ match, rating, onRate }: { match: Match; rating: number | null; onRate: (r: number) => void }) {
  const { profile: p } = match;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const { bg } = KIND_STYLE[p.kind];

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white ${bg}`}>
          {initials(p.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight">{p.name}</p>
          <p className="text-sm text-muted">{p.headline}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" /> {p.region}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-2xl font-extrabold text-brand-600">{match.score}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">afinidad</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${match.score}%` }} />
      </div>

      <p className="mt-4 flex-1 text-sm text-ink">{match.summary}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-bold text-brand-700"
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /> Cómo se calculó
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 text-xs">
          {match.parts.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span className={`tabular w-12 shrink-0 rounded-full px-2 py-0.5 text-center font-extrabold ${part.points > 0 ? "bg-brand-50 text-brand-700" : "bg-sand text-muted"}`}>
                +{part.points}
              </span>
              <span className="text-muted">{part.text}</span>
            </li>
          ))}
          <li className="pt-1 text-muted">{p.bio}</li>
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5" role="radiogroup" aria-label={`Calificar sugerencia de ${p.name}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} de 5`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const prev = rating;
                    onRate(n);
                    const res = await rateSuggestion(p.id, n);
                    setError(Boolean(res.error));
                    if (res.error && prev) onRate(prev);
                  })
                }
                className="p-1"
              >
                <Star className={`h-7 w-7 transition ${rating && n <= rating ? "fill-sun-400 text-sun-400" : "text-line hover:text-sun-400"}`} />
              </button>
            ))}
          </div>
          {p.is_demo && <Badge tone="muted">Perfil demo</Badge>}
        </div>
        {error && <p className="mt-1 text-xs font-bold text-coral-700">No se guardó. Intenta de nuevo.</p>}
      </div>
    </Card>
  );
}

function FeedbackPanel({ done }: { done: boolean }) {
  const [wouldUse, setWouldUse] = useState<boolean | null>(null);
  const [wtp, setWtp] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(done);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="bg-network rounded-card p-8 text-center text-white">
        <Briefcase className="mx-auto h-10 w-10 text-coral-300" />
        <p className="mt-3 text-2xl font-extrabold">¡Gracias! Tu respuesta quedó guardada.</p>
        <p className="mt-1 text-brand-50">Puedes seguir calificando las sugerencias.</p>
      </div>
    );
  }

  return (
    <Card className="border-2 border-brand-600">
      <p className="text-2xl font-extrabold">¿Usarías EmprendeRed para encontrar socios, mentores o inversión?</p>
      <div className="mt-4 max-w-sm">
        <YesNo value={wouldUse} onChange={setWouldUse} />
      </div>

      <div className="mt-6 space-y-2">
        <p className="font-extrabold">
          ¿Cuánto pagarías al mes? <span className="text-sm font-bold text-muted">(opcional)</span>
        </p>
        <Chips options={WTP_RANGES} value={wtp} onChange={(v) => setWtp(v as string)} />
      </div>

      <div className="mt-6">
        <p className="mb-2 font-extrabold">
          ¿Algo que mejorarías? <span className="text-sm font-bold text-muted">(opcional)</span>
        </p>
        <textarea className={`${inputClass} min-h-20`} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      {error && <p className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm font-bold text-coral-700">{error}</p>}
      <Button
        type="button"
        className="mt-6"
        disabled={pending}
        onClick={() => {
          if (wouldUse === null) return setError("Responde sí o no.");
          start(async () => {
            const res = await submitPlatformFeedback({ wouldUse, wtp, comment });
            if (res.error) return setError(res.error);
            setSent(true);
          });
        }}
      >
        <Send className="h-5 w-5" /> {pending ? "Enviando…" : "Enviar"}
      </Button>
    </Card>
  );
}
