# LexIA · Contrataciones del Estado · v2

> SaaS de IA especializada en Contrataciones Públicas del Perú.
> Construido por **Promptive** para el ciclo completo: Actuaciones
> Preparatorias, Selección y Ejecución Contractual.

LexIA cubre los tres perfiles del ecosistema (Entidad pública, Proveedor,
Consultor/Capacitador) con un chat fundado en la Ley N° 32069 vigente,
una biblioteca normativa, un Evaluador IA de ofertas, **11 generadores
de documentos especializados**, **2 asistentes de trámites RNP** y un
**Bot de scraping** que mantiene la base normativa al día.

---

## Estructura del producto

### Módulos transversales (todos los perfiles)
- **Chat LexIA** — respuestas con citas verificables, vocabulario adaptado al perfil.
- **Biblioteca normativa** — Ley 32069, Reglamento, Directivas, Opiniones DTN, Pronunciamientos, Resoluciones TCE.
- **Onboarding por perfil** — wizard de 3 pasos; el perfil define qué módulos ve el usuario.

### Para perfil **Entidad pública**
- Evaluador IA de Ofertas
- Generador de **Bases Estándar OECE**
- Generador de **Pliego de Absolución** (Bases Integradas)
- Generador de **TDR / EETT**
- Generador de **Estrategia de Contratación**
- Generador de **Resolución de Contrato** (apercibimiento + resolución)
- Generador de **Solicitud de Sanción al Tribunal del OECE**

### Para perfil **Proveedor**
- Generador de **Consultas y Observaciones** a las Bases
- Generador de **Recurso de Apelación**
- Generador de **Ampliación de Plazo**
- Generador de **Cambio de Personal Clave**
- Generador de **Cambio de Bienes Ofertados**
- Generador de **Descargo por Penalidades**
- **Trámites RNP**: Aumento de CMC + Actualización de Información Financiera + Viewer de requisitos oficiales

### Para perfil **Consultor/Capacitador**
- Acceso transversal: puede operar tanto los módulos de Entidad como de Proveedor (asistencia profesional).

### Infraestructura
- **Suscripciones Culqi** con 30 días de prueba (sin tarjeta), tiers Starter/Pro/Enterprise.
- **Feature gate** con cuotas mensuales por feature (chat, generación, evaluación).
- **Bot de scraping** que actualiza la base normativa semanalmente (4 fuentes oficiales OECE/TCE).
- **Cron diario** que vence trials y los marca `past_due`.
- **Panel admin** `/admin/scraping` para monitorear el bot.

---

## Stack

- **Frontend**: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · shadcn/ui · Framer Motion · TipTap
- **Auth**: Supabase Auth con OAuth (Google + Facebook)
- **Datos**: Supabase Postgres + pgvector + Storage. RLS habilitado en todas las tablas.
- **IA**: Google Gemini (chat + embeddings 1024d) vía Vercel AI SDK
- **Pagos**: Culqi (SaaS recurrente PE)
- **Scraping**: cheerio + unpdf
- **Documentos**: docx, exceljs, mammoth
- **Branding**: paleta `#0583F2` / `#021D40` / blanco · Plus Jakarta Sans · logo compuesto + minimalista
- **Hosting**: Vercel (Node.js runtime) + Vercel Cron

---

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo>
cd LexIa
npm install

# 2. Configurar .env.local — copia las variables del bloque más abajo
cp .env.example .env.local

# 3. Aplicar migraciones SQL
#    Las migraciones están en supabase/migrations/0001..0013.
#    Puedes aplicarlas con scripts/apply-migration.ts o desde el SQL Editor.
npx tsx scripts/apply-migration.ts supabase/migrations/0001_init.sql
# (repite para cada una)

# 4. Sembrar la base normativa con los PDFs de data/normativa/
npx tsx scripts/ingest-normativa-v2.ts

# 5. Cargar plantillas oficiales de los generadores
npx tsx scripts/parse-templates.ts

# 6. Sembrar fuentes de scraping
npx tsx scripts/seed-scraping-sources.ts

# 7. Dev server
npm run dev
```

---

## Variables de entorno

Crítica (sin estas la app no arranca):
```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=           # Personal Access Token para apply-migration.ts
SUPABASE_PROJECT_REF=

# Gemini (IA)
GOOGLE_GENERATIVE_AI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

Para el bot de scraping y crons:
```ini
CRON_SECRET=                     # Vercel Cron usa esto para autenticarse
```

Para suscripciones Culqi (opcional hasta activar facturación):
```ini
CULQI_PUBLIC_KEY=
CULQI_PRIVATE_KEY=
CULQI_PLAN_STARTER=              # plan_id creado en el dashboard Culqi
CULQI_PLAN_PRO=
```

---

## Scripts

| Script | Función |
| --- | --- |
| `npm run dev` | Dev server (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |
| `npx tsx scripts/v2-reset.ts` | Resetea BD + Auth + Storage (orden Etapa 0) |
| `npx tsx scripts/apply-migration.ts <ruta-sql>` | Aplica una migración vía Management API |
| `npx tsx scripts/ingest-normativa-v2.ts` | Re-ingesta los PDFs de `data/normativa/` |
| `npx tsx scripts/parse-templates.ts` | Carga las plantillas oficiales en `generator_templates` |
| `npx tsx scripts/seed-scraping-sources.ts` | Siembra fuentes del bot |
| `npx tsx scripts/test-rag-query.ts "consulta"` | Smoke test del RAG |
| `npx tsx scripts/verify-rls.ts` | Audita policies RLS de todas las tablas |
| `npx tsx scripts/count-db.ts` | Conteos por tabla |

---

## Schema de BD (resumen)

13 migraciones aplicadas en este orden. Todas las tablas tienen RLS.

| Migración | Contenido |
| --- | --- |
| `0001_init` | profiles, normative_documents, normative_chunks (vector 1024), chat, evaluaciones, generador, biblioteca |
| `0002_rls` | RLS policies de las tablas v1 |
| `0003_hybrid_search` | función SQL `hybrid_search` (cosine + FTS español) |
| `0004_storage` | Buckets de storage |
| `0005_reset_data_v2` | TRUNCATE inicial v2 |
| `0006_profiles_v2_subscriptions` | profile_role, onboarding_completed, organization, subscriptions + events |
| `0007_generator_templates` | catálogo de plantillas oficiales con slug enum |
| `0008_preparatorias_slugs` | enum + tdr_eett, estrategia_contratacion |
| `0009_ejecucion_slugs` | enum + 5 slugs de ejecución contractual |
| `0010_rnp_slugs` | enum + rnp_aumento_cmc, rnp_actualizacion_financiera |
| `0011_scraping` | scraping_sources, scraping_runs, profiles.is_admin |
| `0012_feature_usage` | feature_usage (cuotas mensuales) + columnas Culqi extra |
| `0013_user_surveys` | encuestas post-onboarding |

---

## Cron jobs

Configurados en `vercel.json` (Vercel ejecuta automáticamente):

| Path | Schedule | Función |
| --- | --- | --- |
| `/api/scraping/run` | `0 3 * * 0` (dom 03:00 UTC) | Bot de scraping de normativa |
| `/api/billing/trial-sweep` | `0 4 * * *` (diario 04:00 UTC) | Vence trials a `past_due` |

Auth de crons: cabecera `Authorization: Bearer ${CRON_SECRET}`.

---

## Runbook operativo

### Cómo desplegar a producción

1. Push a `main` → Vercel deploya automáticamente.
2. Migraciones SQL pendientes: aplicarlas con `scripts/apply-migration.ts` (NO se aplican solas en deploy).
3. Si cambiaron variables de entorno: redeploy desde Vercel Dashboard.

### Cómo rotar credenciales

| Credencial | Dónde rotarla | Después |
| --- | --- | --- |
| Gemini API key | Google AI Studio | actualizar `GOOGLE_GENERATIVE_AI_API_KEY` en Vercel + redeploy |
| Supabase service role | NO se rota (solo si compromiso) | actualizar en Vercel + redeploy |
| Culqi keys | Dashboard Culqi → API Keys | actualizar `CULQI_*` en Vercel + redeploy |
| CRON_SECRET | generar nuevo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | actualizar en Vercel + redeploy |

### Cómo agregar una nueva fuente al bot de scraping

```sql
-- desde Supabase SQL Editor o con scripts/apply-migration
insert into scraping_sources (label, url, doc_type, link_selector, link_filter_regex, cadence_days, notes)
values (
  'OECE — Otra fuente nueva',
  'https://ejemplo.com/pagina-indice',
  'opinion',
  'a[href*=".pdf"]',
  '\.pdf$',
  7,
  'Notas internas...'
);
```

Luego desde `/admin/scraping` → "Ejecutar" para probar la fuente nueva.

### Cómo promover un usuario a admin

```sql
update profiles
set is_admin = true
where id in (select id from auth.users where email = 'cliente@empresa.pe');
```

### Cómo verificar la base normativa

```bash
npx tsx scripts/test-rag-query.ts "tu consulta de prueba"
# o
npx tsx scripts/count-db.ts
```

### Logs y observabilidad

- Logs de runtime: Vercel Dashboard → Project → Logs
- Logs de SQL: Supabase Dashboard → Logs → Postgres / API / Auth
- Errores del bot de scraping: tabla `scraping_runs.error_message`
- Eventos de billing: tabla `subscription_events`

---

## OAuth setup (necesario para login)

### Google
1. https://console.cloud.google.com → APIs & Services → Credentials
2. Create Credentials → OAuth client ID → Web application
3. Authorized redirect URI: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Copia client ID + secret
5. Supabase Dashboard → Authentication → Providers → Google → Enable + paste

### Facebook
1. https://developers.facebook.com → My Apps → Create App (Consumer)
2. Add Product → Facebook Login → Web
3. Settings → Basic: copia App ID + secret
4. Facebook Login → Settings → Valid OAuth Redirect URIs: el mismo de arriba
5. Supabase Dashboard → Providers → Facebook → Enable + paste

---

## Verificación de seguridad

```bash
# Audita que todas las tablas tengan RLS habilitado y al menos una policy
npx tsx scripts/verify-rls.ts
```

Tablas que deben estar bajo RLS (con policies por owner o admin):
- `profiles`, `subscriptions`, `subscription_events`
- `chat_conversations`, `chat_messages`
- `evaluations`, `generated_documents`
- `user_folders`, `user_saved_documents`, `user_annotations`
- `user_surveys`, `feature_usage`
- `generator_templates` (lectura autenticada, sin escritura desde cliente)
- `scraping_sources`, `scraping_runs` (solo admin)

---

## Licencia

Propiedad de Promptive. Todos los derechos reservados.
