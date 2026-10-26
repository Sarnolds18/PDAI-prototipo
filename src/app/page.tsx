import { ButtonLink } from "@/components/ui";

export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-extrabold">EmprendeRed</h1>
      <ButtonLink href="/perfil" className="mt-6">Crear mi perfil</ButtonLink>
    </section>
  );
}
