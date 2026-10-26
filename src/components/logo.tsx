// Logo: una "E" formada por tres conexiones que salen de un mismo tronco.
// El nodo central en coral es el emprendedor conectado a la red.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--color-brand-600)" />
      <path d="M13 10v20M13 10h12M13 20h9M13 30h12" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="27.5" cy="10" r="3.4" fill="#fff" />
      <circle cx="25" cy="20" r="3.8" fill="var(--color-coral-500)" />
      <circle cx="27.5" cy="30" r="3.4" fill="#fff" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight text-ink">
        Emprende<span className="text-brand-600">Red</span>
      </span>
    </span>
  );
}
