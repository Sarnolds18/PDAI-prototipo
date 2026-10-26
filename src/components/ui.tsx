import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "accent" | "ghost" | "light";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  accent: "bg-coral-500 text-white hover:bg-coral-600 disabled:bg-coral-300",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50 border border-brand-200",
  light: "bg-white text-brand-700 hover:bg-brand-50",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-card border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "coral" | "sun" | "muted" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    coral: "bg-coral-50 text-coral-700",
    sun: "bg-sun-100 text-sun-600",
    muted: "bg-sand text-muted",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export function Stat({ value, label, tone = "brand" }: { value: ReactNode; label: ReactNode; tone?: "brand" | "coral" }) {
  return (
    <div>
      <div className={`tabular text-4xl font-extrabold leading-none sm:text-5xl ${tone === "coral" ? "text-coral-500" : "text-brand-600"}`}>
        {value}
      </div>
      <div className="mt-2 text-sm font-medium text-muted">{label}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-600">{eyebrow}</p>}
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-lg text-muted">{children}</div>}
    </header>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-sand ${className}`} />;
}
