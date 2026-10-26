"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${i <= current ? "bg-brand-500" : "bg-sand"}`} />
        ))}
      </div>
      <p className="mt-2 text-sm font-bold text-muted">
        Paso {current + 1} de {steps.length} · <span className="text-ink">{steps[current]}</span>
      </p>
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  max,
}: {
  options: Record<T, string> | readonly T[];
  value: T[] | T | null;
  onChange: (v: T[] | T) => void;
  multiple?: boolean;
  max?: number;
}) {
  const entries: [T, string][] = Array.isArray(options)
    ? (options as readonly T[]).map((o) => [o, o])
    : (Object.entries(options) as [T, string][]);
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const full = multiple && max !== undefined && selected.size >= max;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, text]) => {
        const on = selected.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => {
              if (!multiple) return onChange(key);
              const next = new Set(selected);
              if (on) next.delete(key);
              else next.add(key);
              onChange([...next]);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${
              on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink hover:border-brand-300"
            }`}
          >
            {on && <Check className="h-4 w-4" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; title: string; text?: string; icon?: ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              on ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:border-brand-200"
            }`}
          >
            {o.icon && <span className={`mb-2 block ${on ? "text-brand-600" : "text-muted"}`}>{o.icon}</span>}
            <span className="block font-extrabold">{o.title}</span>
            {o.text && <span className="mt-1 block text-sm text-muted">{o.text}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { key: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap rounded-full bg-sand p-1">
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full font-bold transition-colors ${size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} ${
            value === o.key ? "bg-white text-brand-700 shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-2xl border-2 py-3 text-lg font-extrabold transition-colors ${
            value === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white"
          }`}
        >
          {v ? "Sí" : "No"}
        </button>
      ))}
    </div>
  );
}

export function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-extrabold">{title}</legend>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}
