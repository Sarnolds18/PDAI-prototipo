# EmprendeRed · MVP

Plataforma que conecta a emprendedores chilenos en etapa inicial, sin red de contactos previa, con socios, mentores e inversionistas según lo que su proyecto necesita, y que los prepara con un perfil validado, una plantilla financiera guiada y un pacto de socios estandarizado.

Prototipo del Grupo 4 · Pensamiento de Diseño Aplicado a la Ingeniería · UANDES. Cumple dos funciones:

1. **Demo en vivo** para el pitch final.
2. **Instrumento de validación:** registra automáticamente las métricas para confirmar o rechazar las hipótesis H1–H6 del Hito 2.

## Rutas

| Ruta | Para quién | Qué hace | Hipótesis |
|---|---|---|---|
| `/` | Todos | Propuesta de valor y acceso | — |
| `/mi-perfil` | Participantes | Acceso al resumen propio según rol | — |
| `/mi-perfil/emprendedor` | Emprendedor | Proyecto, finanzas, conexiones destacadas y pacto propios | — |
| `/mi-perfil/evaluador` | Evaluador | Respuestas y preferencia de su evaluación del ejemplo | — |
| `/perfil` | Emprendedores | Perfil validado: competencias con evidencia y descripción estandarizada. Mide tiempo y autonomía | H6 |
| `/finanzas` | Emprendedores | Plantilla guiada: flujo de caja, VAN, TIR, equilibrio y escenarios | H3 |
| `/ficha/[id]` | Equipo administrador | Ficha privada imprimible / PDF (requiere sesión de admin) | — |
| `/conexiones` | Emprendedores | Top 3 socios, mentores e inversionistas con motivo del match; calificación 1–5 | H1 |
| `/pacto` | Emprendedores con socio | Pacto de socios guiado y documento resumen | H4 |
| `/evaluar` | Evaluadores | Test A/B: contacto en frío vs ficha estandarizada | H2, H3, H5 |
| `/equipo` | Equipo | Ingreso con correo autorizado y clave compartida | — |
| `/admin` | Equipo | Dashboard de resultados y exportación CSV (requiere sesión; sin sesión muestra página no encontrada) | todas |

## Correrlo localmente

Requisitos: Node.js 20 o superior y una cuenta gratuita de [Supabase](https://supabase.com).

1. **Base de datos.** Crea un proyecto en Supabase (región São Paulo). En **SQL Editor** ejecuta, en este orden:
   - `supabase/schema.sql` (tablas y seguridad)
   - `supabase/seed.sql` (15 perfiles de demostración y configuración)
2. **Variables de entorno.** Copia `.env.example` a `.env.local` y completa:
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: del mismo proyecto de Supabase, para leer y escribir datos solo en el servidor.
   - `SUPABASE_ANON_KEY`: opcional mientras el envío automático esté apagado. Se usa solo si se activa el OTP por correo.
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
2. En **Environment Variables**, agrega las variables necesarias de `.env.local`.
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

Recorrido completo del emprendedor: `/perfil` → `/finanzas` → `/conexiones` → (opcional) `/pacto`. Cada registro tiene un código `ER-XXXX` interno, visible solo en administración. No permite iniciar sesión. Los participantes conservan su sesión en el navegador. Para recuperar un perfil, contactan a sarnolds@miuandes.cl y el equipo entrega un código temporal. El ID `ER-XXXX` no permite ingresar.

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

**Seguridad:** todas las tablas tienen RLS sin políticas públicas, y solo el servidor accede con la service role key. Las sesiones usan cookies firmadas. Las fichas reales requieren una sesión de administrador, con correo autorizado (`sarnolds@miuandes.cl` o `admin@example.cl`) y la clave compartida configurada en `ADMIN_PASSWORD`. El ingreso está en `/equipo`, sin enlaces en las pantallas de participantes. Sin sesión, `/admin` y `/ficha/[id]` muestran página no encontrada antes de consultar datos. El correo es un filtro junto a la clave compartida, no una verificación de la propiedad del buzón. Las sesiones caducan a las 12 horas; las cookies antiguas de contraseña dejan de valer. Las fichas se abren desde la tabla de participantes del panel. Los evaluadores en `/evaluar` siguen viendo exclusivamente el proyecto ficticio. En el modo del pitch, el registro abre una sesión para el registro nuevo, sin verificar el correo declarado. Recuperar un registro anterior exige un código emitido por un administrador tras revisar la solicitud. No hay ingreso mediante el identificador interno.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres), Recharts y Vercel.


## Resúmenes personales

La navegación «Mi perfil» abre el resumen del rol con sesión activa. Si una persona tiene ambos roles, elige cuál consultar. Los resúmenes requieren la sesión correspondiente y filtran por su participante; no aceptan un ID de otra persona. Los formularios siguen en sus rutas habituales y enlazan al resumen al terminar. Los evaluadores continúan usando solo el caso ficticio.

El resumen del emprendedor destaca los resultados financieros guardados al finalizar la plantilla, una conexión por tipo (primero por calificación propia y luego por afinidad), y el pacto completado. Los módulos pendientes muestran cómo continuarlos; el pacto es opcional. Las sugerencias de demostración se identifican como tales. Guardar un pacto no significa firmarlo.

Los campos financieros incluyen explicaciones visibles y ejemplos desplegables. Los ejemplos no se guardan como respuestas. Las preguntas del perfil, pacto, evaluación y conexiones incluyen ayudas sobre qué responder.


## Consulta administrativa y códigos internos

Desde `/admin`, pulsa el nombre del participante para abrir `/admin/participantes/[id]`. El equipo puede leer el resumen completo según su rol; no se crea una sesión a nombre de esa persona ni aparecen acciones para responder por ella. Esta ruta verifica la sesión de administrador antes de consultar cualquier dato. Los códigos se conservan para identificación interna y exportaciones; ya no se muestran a participantes ni sirven para recuperar sesiones. Las sesiones de versiones antiguas dejan de ser válidas con esta versión. La persona solicita recuperar un perfil al equipo, que selecciona el registro correcto y emite un código. Las sesiones nuevas llevan rol y vencimiento firmados (90 días); las sesiones del equipo administrador no cambian.

Para proteger las direcciones generadas de despliegues (incluidas versiones anteriores con el ingreso por código), configura en Vercel → proyecto → Settings → Deployment Protection → Vercel Authentication → Standard Protection → Save. Este alcance protege los dominios de despliegue y deja públicos los dominios de producción. Usa el dominio estable de producción para participantes. No selecciones All Deployments si el sitio de producción debe seguir abierto. Esta configuración de hosting no se modifica desde el repositorio. `/equipo` en producción sigue siendo una pantalla de ingreso; conocer su dirección no concede acceso a datos.


## Modo del pitch: registro simple y recuperación con ayuda del equipo

El envío automático de correos queda **desactivado por defecto**. No necesitas SMTP, contraseñas de Gmail ni nuevos cambios SQL para el pitch. `PARTICIPANT_EMAIL_OTP_ENABLED=false` (o variable ausente) mantiene este modo. Aunque alguien intente llamar a las acciones de envío/verificación, el servidor las rechaza mientras estén apagadas.

1. La persona se registra con nombre, correo y consentimiento. Su sesión abre únicamente el registro nuevo; escribir el correo de otra persona no recupera sus datos.
2. Si pierde la sesión, selecciona **Recuperar acceso** y escribe manualmente a `sarnolds@miuandes.cl` con su nombre, correo usado y rol.
3. El equipo ingresa por `/equipo`, abre `/admin` y pulsa el nombre del participante para revisar el perfil correcto.
4. En **Recuperación de acceso**, confirma que verificó la solicitud y pulsa **Generar código de recuperación**.
5. Copia el código `REC-…` y envíalo manualmente a la persona. Dura una hora, funciona una sola vez y generar otro invalida el anterior.
6. La persona ingresa su correo y ese código en **Recuperar acceso**. Se abre únicamente el perfil que seleccionó el administrador.

Los códigos se generan en el servidor con aleatoriedad criptográfica. Solo se guarda su hash en una fila privada de `settings` por participante; no se incluyen en la configuración pública ni se necesita una tabla adicional. El consumo usa un borrado atómico con el hash como condición para impedir dos usos simultáneos. Los identificadores `ER-XXXX` siguen siendo internos y no sirven para ingresar. Los registros nuevos no tienen contraseña de participante; se recupera el acceso, no una contraseña.

## En espera: activar códigos automáticos por correo más adelante

Este flujo está conservado en `participant-access.ts` y `email-otp-form.tsx`. Para activarlo, completa primero la configuración siguiente y luego define `PARTICIPANT_EMAIL_OTP_ENABLED=true` en Vercel. El acceso del equipo por `/equipo` conserva la clave actual.

1. En Vercel → proyecto → Settings → Environment Variables, añade `SUPABASE_ANON_KEY` con la clave **anon o publishable** del mismo proyecto de Supabase. Añádela también a `.env.local` para probar en local. No uses la service_role en esta variable.
2. En Supabase → Authentication → Sign In / Providers → Email, activa el proveedor de correo y la confirmación de correo. Mantén habilitada la creación de usuarios de Auth: los participantes históricos aún no tienen usuario en Auth. Configura **Email OTP expiration = 600 segundos**. El navegador también debe completar la solicitud dentro de 10 minutos.
3. En Authentication → Email Templates, coloca el contenido de [supabase/otp-email.html](supabase/otp-email.html) en las plantillas **Confirm signup** y **Magic Link**. Deben contener `{{ .Token }}` para enviar un código, en lugar de solo un enlace. No se necesita una ruta de callback para este flujo.
4. En Authentication → configuración de SMTP, configura un proveedor de envío con remitente autorizado. El SMTP de prueba de Supabase solo permite destinatarios del equipo del proyecto; no sirve para enviar códigos a todos los participantes. Sigue la [guía oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
5. Despliega y prueba con un correo que controles: Primera vez → recibir código → verificar → completar perfil → salir → Ya participé → solicitar un código nuevo → recuperar el mismo perfil. Comprueba también el otro rol. No se requiere ejecutar SQL adicional.

El código se verifica con Supabase Auth mediante un cliente nuevo por operación. No se autentica el cliente compartido con service_role. El servidor vincula el perfil al correo verificado y al rol, nunca a un ID enviado sin autorización. No se guardan OTP en la base del prototipo ni se devuelven tokens de Auth al navegador. Supabase aplica sus límites de envío y verificación; si un reenvío se rechaza, la pantalla permite seguir verificando la solicitud anterior. Los registros de participantes solo se crean después de verificar el correo y aceptar el consentimiento. El modo Ya participé no crea un registro de participante si no encuentra coincidencias.

No se ha comprobado entrega real de correo desde este entorno; las pruebas automatizadas simulan el servicio de Auth. Para probar con participantes debe completarse la configuración anterior. Referencia del flujo: [Email OTP en Supabase](https://supabase.com/docs/guides/auth/auth-email-passwordless).
