# LexIA · Contrataciones del Estado

> Inteligencia artificial especializada en Contrataciones del Estado peruano.
> Una herramienta de **Promptive**.

LexIA es una plataforma SaaS que aplica IA conversacional, búsqueda semántica y
generación documental sobre el marco normativo peruano de Contrataciones del Estado
(Ley N° 32069, Reglamento, Opiniones del OSCE, Resoluciones del Tribunal).

## Módulos

| # | Módulo | Descripción |
| - | --- | --- |
| 1 | **Landing pública** | Hero, diferenciadores, features, casos de uso, FAQ |
| 2 | **Auth** | Magic link (Supabase Auth), middleware de protección |
| 3 | **Panel del suscriptor** | Dashboard con stats reales (consultas, docs guardados, normativa total) |
| 4 | **Chat LexIA** | Streaming con citaciones verificables `[1] [2] [3]`, sidebar de conversaciones agrupadas, preguntas sugeridas |
| 5 | **Biblioteca normativa** | Búsqueda híbrida (semántica + FTS), visor con TOC, highlights persistentes, carpetas |
| 6 | **Evaluador IA** | Wizard de upload, comparación de ofertas vs Bases con matriz, export DOCX |
| 7 | **Generador** | Solicitud de ampliación de plazo con TipTap editor, autosave, export DOCX |

## Stack

- **Frontend**: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · shadcn/ui · Framer Motion
- **State**: Zustand · TanStack Query · react-hook-form + zod
- **IA**:
  - Gemini 2.0 Flash (chat + análisis) vía Vercel AI SDK
  - Gemini Embedding 001 (1024 dims) para embeddings
- **Backend**: Supabase (Postgres + pgvector + Auth + Storage) con RLS
- **Search**: función SQL `hybrid_search` con Reciprocal Rank Fusion (k=50)
- **Editor**: TipTap (rich-text con autosave)
- **Export**: `docx` (Word) con conversión desde markdown
- **PDF**: `unpdf` para extracción de texto serverless-safe

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local
cp .env.example .env.local
# Llena las credenciales

# 3. Aplicar migraciones SQL al proyecto Supabase
npm run db:push

# 4. (Opcional) Sembrar documentos normativos de muestra
npx tsx scripts/seed-normativa.ts

# 5. Dev server
npm run dev
```

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica las migraciones SQL en `supabase/migrations/` |
| `npx tsx scripts/seed-normativa.ts` | Carga 10 documentos normativos curados con embeddings |
| `npx tsx scripts/test-search.ts` | Valida el pipeline RAG con 3 consultas |
| `npx tsx scripts/cleanup-orphan-docs.ts` | Elimina documentos sin chunks |

## Schema de BD

10 tablas (todas con RLS habilitado):

- `profiles` — perfil del usuario (extiende `auth.users`)
- `normative_documents` — documentos normativos (Ley, Reglamento, Opiniones, etc.)
- `normative_chunks` — fragmentos vectorizados (vector(1024))
- `chat_conversations` / `chat_messages` — historial de chat con sources jsonb
- `user_folders` / `user_saved_documents` / `user_annotations` — biblioteca personal y highlights
- `evaluations` — evaluaciones de ofertas vs Bases (`result` jsonb)
- `generated_documents` — documentos generados (input_data + generated_content markdown)

## Variables de entorno

Ver [`.env.example`](./.env.example).

En **Vercel**, configura todas las variables en *Settings → Environment Variables* antes
del primer deploy. El proyecto NO requiere edge functions: todo corre en Node.js
serverless functions.

## Deploy

1. Push a GitHub (este repo)
2. Vercel: New Project → Import from GitHub → seleccionar el repo
3. Configurar las variables de entorno de `.env.example`
4. Actualizar `NEXT_PUBLIC_APP_URL` con la URL final de Vercel
5. En Supabase Dashboard → Auth → URL Configuration:
   - Site URL: `https://tu-dominio.vercel.app`
   - Redirect URLs: añadir `https://tu-dominio.vercel.app/auth/callback`

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js cliente)                              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────┴──────────────────────────────────┐
│  Vercel · Next.js 14 App Router                         │
│  · SSR/RSC pages                                        │
│  · API routes (Node.js runtime)                         │
│    /api/chat, /api/search, /api/evaluations/[id]/...    │
└──┬───────────┬─────────────────┬────────────────────────┘
   │           │                 │
   ▼           ▼                 ▼
┌──────┐  ┌────────┐  ┌─────────────────────────────────┐
│Gemini│  │Voyage  │  │Supabase                          │
│Chat +│  │(opc.)  │  │· Postgres + pgvector            │
│Embed │  │        │  │· Auth magic link                │
│      │  │        │  │· Storage (bucket 'uploads')     │
└──────┘  └────────┘  └─────────────────────────────────┘
```

## Licencia

Propiedad de Promptive. Todos los derechos reservados.
