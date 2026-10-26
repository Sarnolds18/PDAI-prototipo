# EmprendeRed · MVP

Plataforma que conecta a emprendedores chilenos en etapa inicial, sin red de contactos previa, con socios, mentores e inversionistas según lo que su proyecto necesita, y que los prepara con un perfil validado, una plantilla financiera guiada y un pacto de socios estandarizado.

Prototipo del Grupo 4 · Pensamiento de Diseño Aplicado a la Ingeniería · UANDES. Cumple dos funciones:

1. **Demo en vivo** para el pitch final.
2. **Instrumento de validación:** registra automáticamente las métricas para confirmar o rechazar las hipótesis H1–H6 del Hito 2.

## Rutas

| Ruta | Para quién | Qué hace | Hipótesis |
|---|---|---|---|
| `/` | Todos | Propuesta de valor y acceso | — |
| `/perfil` | Emprendedores | Perfil validado: competencias con evidencia y descripción estandarizada. Mide tiempo y autonomía | H6 |
| `/finanzas` | Emprendedores | Plantilla guiada: flujo de caja, VAN, TIR, equilibrio y escenarios | H3 |
| `/ficha/[id]` | Mentores e inversionistas | Ficha estandarizada imprimible / PDF | — |
| `/conexiones` | Emprendedores | Top 3 socios, mentores e inversionistas con motivo del match; calificación 1–5 | H1 |
| `/pacto` | Emprendedores con socio | Pacto de socios guiado y documento resumen | H4 |
| `/evaluar` | Evaluadores | Test A/B: contacto en frío vs ficha estandarizada | H2, H3, H5 |
| `/admin` | Equipo | Dashboard de resultados y exportación CSV (con contraseña) | todas |

## Correrlo localmente

Requisitos: Node.js 20 o superior y una cuenta gratuita de [Supabase](https://supabase.com).

1. **Base de datos.** Crea un proyecto en Supabase (región São Paulo). En **SQL Editor** ejecuta, en este orden:
   - `supabase/schema.sql` (tablas y seguridad)
   - `supabase/seed.sql` (15 perfiles de demostración y configuración)
2. **Variables de entorno.** Copia `.env.example` a `.env.local` y completa:
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: Supabase → Project Settings → API (usa la clave **service_role**).
   - `SESSION_SECRET`: genera una con `openssl rand -base64 32`.
   - `ADMIN_PASSWORD`: la contraseña del dashboard.
3. **Instalar y correr:**

   ```bash
   npm install
   npm run dev      # http://localhost:3000
   npm test         # tests de finanzas, matching e hipótesis
   npm run build    # build de producción
   ```

> El repositorio es público: `.env.local` está en `.gitignore` y nunca debe subirse.

## Desplegar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa `Sarnolds18/PDAI-prototipo`. Next.js se detecta solo.
2. En **Environment Variables**, agrega las mismas 4 variables de `.env.local`.
3. Haz clic en **Deploy**. Cada `git push` a `main` vuelve a desplegar.

Alternativa por terminal: `npx vercel` (primera vez) y `npx vercel --prod`.

## Qué links enviar

Reemplaza `TU-DOMINIO` por la URL de Vercel (ej. `emprendered.vercel.app`).

| A quién | Link | Mensaje sugerido |
|---|---|---|
| Emprendedores | `https://TU-DOMINIO/perfil` | «Crea tu perfil y arma tus números (10–15 min). Al final verás socios, mentores e inversionistas sugeridos.» |
| Emprendedores con socio | `https://TU-DOMINIO/pacto` | «Completen juntos el pacto de socios (≈10 min).» |
| Mentores, inversionistas, evaluadores | `https://TU-DOMINIO/evaluar` | «Evalúa un proyecto en 3 minutos.» |
| Demo del pitch | `https://TU-DOMINIO/perfil?demo=1` | Las sesiones con `?demo=1` quedan marcadas como prueba y **no cuentan** para la validación. |

Recorrido completo del emprendedor: `/perfil` → `/finanzas` → ficha → `/conexiones` → (opcional) `/pacto`. Cada participante recibe un código `ER-XXXX` para retomar desde cualquier dispositivo.

### Protocolo para que los datos sirvan

- **H6 y H3 miden autonomía:** no ayudes durante la prueba. Si alguien pide ayuda, anótalo; la app igual pregunta al final si necesitó ayuda de otra persona.
- **Las pruebas del equipo no cuentan:** úsalas con `?demo=1` o márcalas como «Prueba» en la tabla de participantes de `/admin`.
- **En el test A/B**, cada evaluador ve una sola versión al azar (balanceada); no le expliques la diferencia antes de que responda.
- **Meta de muestra:** 10 emprendedores y 10 evaluadores (editable en `/admin`). Bajo 5 respuestas por métrica, el dashboard muestra «Datos insuficientes».

## Cómo leer el dashboard (`/admin`)

**Avance de la muestra:** emprendedores y evaluadores reales contra la meta.

**Tarjetas H1–H6:** cada una muestra los criterios del Hito 2 (sección 6), con el valor actual, una barra con la marca del umbral y el **n** de esa métrica.

| Estado | Significa |
|---|---|
| ✅ Validada | Todos los criterios cumplen el umbral con n ≥ n mínimo |
| ❌ No validada | Hay datos suficientes y al menos un criterio no cumple |
| ⏳ Datos insuficientes | Algún criterio tiene menos respuestas que el n mínimo |

| Hipótesis | Cómo se calcula |
|---|---|
| H1 | % que responde «Sí» a «¿Usarías EmprendeRed…?» (≥ 70 %) **y** promedio de las calificaciones 1–5 de las conexiones (≥ 4) |
| H2 | % de evaluadores que, tras ver ambas versiones, prefiere la ficha (B) (≥ 60 %) |
| H3 | % de quienes empezaron la plantilla que la terminó **sin** ayuda de otra persona (≥ 70 %) **y** promedio «defendible» de B mayor que el de A (primera respuesta de cada evaluador) |
| H4 | % de quienes empezaron el pacto que lo terminó **y** dijo que lo usaría (≥ 60 %) |
| H5 | % de evaluadores que recibiría propuestas por esta vía (≥ 60 %) |
| H6 | % de quienes empezaron el perfil que lo terminó sin ayuda (≥ 80 %) **y** mediana del tiempo de creación < 10 min |

Además muestra:

- **Test A/B:** tasa de «aceptaría la reunión», disposición promedio (1–5) y «defendible» (1–5) para A y B.
- **Embudos:** hasta qué paso llegó cada persona en perfil y finanzas, y dónde abandonó.
- **Tiempos:** distribución del tiempo de creación del perfil.
- **Segmentación:** obstáculo principal, etapa, rubro, edad, región, disposición a pagar y rol de los evaluadores. Es evidencia nueva del problema y del cliente.
- **Comentarios:** citas textuales de evaluadores y emprendedores.
- **Bitácora de iteraciones:** registren qué cambiaron y por qué. Respalda la parte «mejoras realizadas con base en la validación» del pitch.

**Exportar todo (CSV)** descarga un ZIP con `00_resumen_hipotesis.csv` (lo que va a la slide), `01_comparacion_A_B.csv` y un CSV por tabla. Los CSV se abren directo en Excel (separador `;`). La columna `es_prueba` marca las sesiones excluidas.

El dashboard **solo muestra datos registrados**: no hay valores de ejemplo ni simulados.

## Datos de demostración

- **Red (`network_profiles`):** 15 perfiles ficticios (5 socios, 5 mentores, 5 inversionistas) de los rubros de las entrevistas, marcados `is_demo = true` y con la etiqueta «Perfil demo» en la UI. Para usar personas reales, insértenlas con `is_demo = false` y desactiven las de demostración: `update network_profiles set active = false where is_demo;`.
- **Proyecto del test A/B (`src/lib/example-project.ts`):** «Vigía», ficticio, inspirado en el caso del Anexo 7. Si un participante autoriza usar su proyecto real, basta con reemplazar esos datos.

## Supuestos del modelo financiero

Horizonte de 36 meses y mes 0 = inversión, sin valor terminal. Las unidades crecen a una tasa mensual constante. El impuesto se aplica sobre la utilidad, con arrastre de pérdidas. La tasa de descuento anual (12 % por defecto) se convierte a mensual. La TIR se calcula por bisección y se informa cuando no existe (sin inversión, o no se recupera). Hay tres escenarios de ventas (−30 % / 0 / +20 %, ajustables) y uno de contingencia: el escenario base con los clientes pagando 60 días tarde. «Capital necesario» es el peor saldo acumulado entre el escenario base y la contingencia.

## Estructura

```
src/
  app/            rutas (perfil, finanzas, ficha, conexiones, pacto, evaluar, admin) y server actions
  components/     UI compartida: logo, formularios, gráfico, ficha
  lib/
    finance.ts      VAN, TIR, escenarios (con tests)
    matching.ts     puntaje explicable de conexiones (con tests)
    hypotheses.ts   métricas H1–H6 vs umbrales (con tests)
    catalog.ts      competencias, rubros, etapas
supabase/         schema.sql y seed.sql
```

**Seguridad:** todas las tablas tienen RLS sin políticas públicas, y solo el servidor accede con la service role key. Las sesiones usan cookies firmadas. La ficha pública no muestra el email ni los datos de contacto de las referencias.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres), Recharts y Vercel.
