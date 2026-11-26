# A-LexIA (LexIA · Contrataciones del Estado)

SaaS de IA para contrataciones públicas del Perú (Ley N° 32069 y su Reglamento).
Lo construye Promptive. El experto de dominio y cliente es **César**: sus
"documentos" de observaciones (doc 10, 13, 14, 15…) y sus respuestas son la
especificación. Cuando una regla viene de César, el código lo dice en un
comentario con la fecha (p. ej. `// César, 27/09/2026`). Respeta esas reglas
aunque parezcan raras: son criterio jurídico, no gusto.

## Stack

- Next.js 14 App Router · React 18 · TypeScript · Tailwind · shadcn/ui
- Supabase: Auth (Google/Facebook), Postgres + pgvector (1024d), Storage, RLS
- IA: Google Gemini. `@ai-sdk/google` (Vercel AI SDK v4) para chat y
  generadores, `@google/genai` para voz (Gemini Live). Los IDs de modelo viven
  en `src/lib/ai/gemini.ts` y `src/lib/ai/voice-config.ts`. No escribas un ID
  de modelo suelto en otra parte.
- Pagos: planes con **bolsa de créditos** (`src/lib/billing/creditos.ts`,
  migraciones 0086–0087). `subscriptions`, `feature_usage`, `feature-gate.ts`,
  `tiers.ts` y Culqi son el sistema **viejo**: no construyas encima.
- Hosting: Vercel (runtime Node) + Vercel Cron (`vercel.json`).

## Mapa del código

| Dónde | Qué |
| --- | --- |
| `src/app/api/chat/route.ts` | Chat RAG: recuperación (hybrid_search + rescates + capas), prompt, streaming, cobro |
| `src/lib/ai/` | Prompts, embeddings, reescritura de consulta, búsqueda de voz, OCR, Files API |
| `src/lib/normativa/` | Formateo de normas, auditor de citas (`citas.ts`) |
| `src/lib/generadores/` | Generador de requerimientos: `plantillas/*` (una por tipo de procedimiento), `ensamblador.ts` → Word |
| `src/lib/evaluacion/` | Evaluador de ofertas y de bases: `motor.ts`, etapas, `acta.ts`, `verificacion.ts`, factores |
| `src/lib/ejecucion/` | Expedientes de ejecución contractual (ampliaciones, penalidades, liquidación…) |
| `src/lib/documentos/word.ts` | Salida .docx con la forma de los modelos de César |
| `src/lib/billing/` | Créditos, catálogo de planes, límites |
| `src/lib/voice/live-client.ts` | Cliente de Gemini Live en el navegador |
| `supabase/migrations/` | SQL numerado `NNNN_nombre.sql` (no se aplica solo en el deploy) |
| `scripts/` | Ingesta, reparaciones, diagnósticos (`diagnosticar-pregunta.ts`, `medir-*.ts`) |
| `scripts/pruebas/` | Pruebas: scripts `tsx` contra la base real, con `ok()` y ✅/❌ |
| `docs/` | Especificaciones de César y preguntas pendientes |

`*.generado.ts` (p. ej. `casos-tribunal.generado.ts`, `criterios.generado.ts`)
se generan con scripts desde documentos fuente: no los edites a mano.

## Comandos

```bash
npm run dev                 # http://localhost:3000
npm run typecheck           # tsc --noEmit (app)
npm run typecheck:scripts   # tsc de scripts/
npm run lint
npx tsx scripts/pruebas/<nombre>.ts            # una prueba
npx tsx scripts/apply-migration.ts supabase/migrations/NNNN_x.sql
npx tsx scripts/diagnosticar-pregunta.ts "pregunta"   # qué recupera el chat, sin modelo
npx tsx scripts/medir-respuestas-chat.ts --vueltas 10 --guardar tmp/antes.json
```

No hay test runner ni CI: las pruebas son scripts que imprimen ✅/❌ y usan
`.env.local` (con `override: true`, por Windows). Muchas tocan la base real y
crean usuarios temporales que borran al final.

**Nunca** ejecutes `scripts/db-push.ts` (ya no está en `package.json` y exige un
flag): reaplica todas las migraciones, incluida `0005_reset_data_v2.sql`, que
hace TRUNCATE de datos de producción.

Seguridad (migraciones 0088 y 0089): el navegador ya no escribe en `evaluations`,
`voice_calls` ni `user_surveys`, y en `profiles` solo los datos personales.
Esas escrituras van con `createAdminClient()` después de comprobar el dueño.
Prueba: `npx tsx scripts/pruebas/seguridad-rls.ts`.

## Convenciones

- Todo en español: nombres de funciones y archivos nuevos (`usarHerramienta`,
  `leerBases`), comentarios, mensajes, commits. Hay código viejo en inglés:
  no lo renombres por renombrar.
- Los comentarios explican **por qué**, con el caso que lo motivó. Escribe así.
- Commits: `feat(área): …` / `fix(área): …` en español, describiendo lo que
  nota el usuario; el cuerpo agrupa por módulo y cita el documento de César.
- Rutas API: `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, `maxDuration`
  según el trabajo, zod para el body, `supabase.auth.getUser()` al inicio.
  Ver la skill `ruta-api`.
- Cobro: `usarHerramienta(userId, herramienta, …)`; si rechaza,
  `respuestaDeRechazo(r)`. Ver la skill `ruta-api` para no cobrar mal.
- Migraciones: siguiente número libre, RLS en toda tabla nueva. Ver la skill
  `migracion-supabase`.
- Si cambias la recuperación del chat, `scripts/lib/banco-chat.ts` replica esa
  recuperación: actualízala también o las mediciones mentirán.

## Skills del proyecto (`.claude/skills/`)

Propias: `levantar-observaciones`, `migracion-supabase`, `ruta-api`,
`cambio-en-el-chat`, `prueba-de-script`.
Externas (oficiales): `supabase`, `supabase-postgres-best-practices`,
`vercel-react-best-practices`, `web-design-guidelines`. Si una skill externa
contradice este archivo (p. ej. `supabase migration new`), manda este archivo.
