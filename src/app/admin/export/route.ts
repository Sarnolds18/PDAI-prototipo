import { isAdmin } from "@/lib/admin";
import { flattenFinance, loadAdminData } from "@/lib/admin-data";
import { toCSV } from "@/lib/csv";
import { zipStore } from "@/lib/zip";

// Descarga un ZIP con un CSV por tabla + el resumen de hipótesis. Solo para el admin.
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });

  const view = new URL(req.url).searchParams.get("vista") === "demo" ? "demo" : "real";
  const d = await loadAdminData(view);
  const testIds = new Set(d.participants.filter((p) => p.is_test).map((p) => p.id));
  const tag = <T extends Record<string, unknown>>(rows: T[]) =>
    rows.map((r) => ({ ...r, es_prueba: testIds.has(r.participant_id as string) }));

  const resumen = d.results.flatMap((h) =>
    h.criteria.map((c) => ({
      hipotesis: h.id,
      titulo: h.title,
      estado: h.status,
      criterio: c.label,
      valor: c.value,
      umbral: `${c.comparator} ${c.threshold}`,
      cumple: c.pass,
      n: c.n,
    })),
  );
  const ab = (["A", "B"] as const).map((v) => ({ version: v, ...d.extras.meetingByVariant[v] }));

  const files = [
    ...(view === "demo"
      ? [{ name: "LEEME_DATOS_DEMO.txt", content: "DATOS DE DEMOSTRACIÓN simulados a partir de las entrevistas del Hito 1. No son resultados de validación.\r\n" }]
      : []),
    { name: "00_resumen_hipotesis.csv", content: toCSV(resumen) },
    { name: "01_comparacion_A_B.csv", content: toCSV(ab) },
    { name: "participantes.csv", content: toCSV(d.raw.participants) },
    { name: "perfiles.csv", content: toCSV(tag(d.raw.profiles)) },
    { name: "finanzas.csv", content: toCSV(tag(flattenFinance(d.raw.finance))) },
    { name: "conexiones_calificaciones.csv", content: toCSV(tag(d.raw.suggestions)) },
    { name: "feedback_plataforma.csv", content: toCSV(tag(d.raw.feedback)) },
    { name: "evaluaciones_ab.csv", content: toCSV(tag(d.raw.evaluations)) },
    { name: "pactos.csv", content: toCSV(tag(d.raw.pacts)) },
    { name: "eventos.csv", content: toCSV(tag(d.raw.events as unknown as Record<string, unknown>[])) },
    { name: "iteraciones.csv", content: toCSV(d.iterations) },
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(Buffer.from(zipStore(files)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="emprendered-${view === "demo" ? "DEMO" : "validacion"}-${date}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
