import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "EmprendeRed", template: "%s · EmprendeRed" },
  description:
    "Conectamos a emprendedores sin red de contactos con socios, mentores e inversionistas según lo que su proyecto necesita.",
};

export const viewport: Viewport = {
  themeColor: "#0b6e5f",
};

const NAV = [
  { href: "/perfil", label: "Perfil" },
  { href: "/finanzas", label: "Finanzas" },
  { href: "/conexiones", label: "Conexiones" },
  { href: "/pacto", label: "Pacto" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${jakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" aria-label="EmprendeRed, inicio">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-4 py-2 text-sm font-bold text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 sm:hidden">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-muted ring-1 ring-line"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-line/70 py-6 text-center text-xs text-muted">
          Prototipo académico · Pensamiento de Diseño Aplicado a la Ingeniería · UANDES · Grupo 4
        </footer>
      </body>
    </html>
  );
}
