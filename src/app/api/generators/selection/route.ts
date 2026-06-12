import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { recordAiUsage } from '@/lib/ai/usage-log';
import {
  CONSULTAS_OBSERVACIONES_SYSTEM,
  PLIEGO_ABSOLUCION_SYSTEM,
  BASES_ESTANDAR_SYSTEM,
  APELACIONES_SYSTEM,
} from '@/lib/ai/selection-generator-prompts';
import {
  loadTemplates,
  composeFewShot,
  type ProcurementObject,
} from '@/lib/generators/template-loader';
import type { ProfileRole } from '@/lib/auth/session';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Slugs que despacha este endpoint (los 4 de Selección). */
type SelectionSlug =
  | 'consultas_observaciones'
  | 'pliego_absolucion'
  | 'bases_estandar'
  | 'apelaciones';

const SCHEMA = z.object({
  slug: z.enum([
    'consultas_observaciones',
    'pliego_absolucion',
    'bases_estandar',
    'apelaciones',
  ]),
  title: z.string().min(2).max(160),
  object_type: z
    .enum([
      'bienes',
      'servicios',
      'obras',
      'consultoria_obras',
      'consultoria_general',
      'mixto',
    ])
    .optional(),
  /** Data específica del form de cada generador. Opaco para el endpoint. */
  input_data: z.record(z.unknown()),
  /** Texto base que se subió como contexto (Bases, consultas recibidas, etc.) */
  base_text: z.string().optional(),
});

const SYSTEM_BY_SLUG: Record<SelectionSlug, string> = {
  consultas_observaciones: CONSULTAS_OBSERVACIONES_SYSTEM,
  pliego_absolucion: PLIEGO_ABSOLUCION_SYSTEM,
  bases_estandar: BASES_ESTANDAR_SYSTEM,
  apelaciones: APELACIONES_SYSTEM,
};

const ROLE_BY_SLUG: Record<SelectionSlug, ProfileRole[]> = {
  consultas_observaciones: ['provider', 'consultant'],
  pliego_absolucion: ['entity', 'consultant'],
  bases_estandar: ['entity', 'consultant'],
  apelaciones: ['provider', 'consultant'],
};

interface HybridRow {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

async function buildRagContext(query: string): Promise<string> {
  try {
    const embedding = await embedOne(query, 'RETRIEVAL_QUERY');
    const supabase = createClient();
    const { data } = await supabase.rpc('hybrid_search', {
      query_text: query,
      query_embedding: embedding as unknown as number[],
      match_count: 6,
      filter_type: null,
    });
    const rows = (data || []) as HybridRow[];
    if (rows.length === 0) return '';
    return rows
      .map((r, i) => {
        const docLabel = `${r.doc_type}${r.doc_number ? ' ' + r.doc_number : ''}`;
        return `[${i + 1}] ${docLabel} — ${r.doc_title}\n${r.content.slice(0, 1500)}`;
      })
      .join('\n\n---\n\n');
  } catch (e) {
    console.error('[generators/selection] RAG falló:', (e as Error).message);
    return '';
  }
}

function buildQueryForRag(slug: SelectionSlug, title: string): string {
  const baseQueries: Record<SelectionSlug, string> = {
    consultas_observaciones:
      'direccionamiento a marca, principios de libre concurrencia y trato justo, requisitos de calificación proporcionales, factores de evaluación objetivos, Ley 32069',
    pliego_absolucion:
      'procedimiento de selección, pliego de absolución, bases integradas, integración de bases, Reglamento DS 09-2025',
    bases_estandar:
      'estructura de bases estándar, requisitos de calificación, factores de evaluación, valor referencial',
    apelaciones:
      'recurso de apelación contrataciones, competencia Tribunal OECE, garantía 3% UIT, plazo 8 días hábiles, art. 49 Ley 32069',
  };
  return `${title}. ${baseQueries[slug]}`;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'missing_env' },
      { status: 500 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { slug, title, object_type, input_data, base_text } = parsed.data;

  // Role gate
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;
  const allowed = ROLE_BY_SLUG[slug];
  if (!userRole || !allowed.includes(userRole)) {
    return NextResponse.json(
      { error: 'forbidden_for_role', allowed },
      { status: 403 },
    );
  }

  // Feature gate por plan
  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  // Cargar plantillas oficiales como few-shot
  const templates = await loadTemplates({
    slug,
    objectType: object_type as ProcurementObject | undefined,
    limit: 2,
  });
  const fewShot = composeFewShot(templates, 3500);

  // Contexto RAG de la base normativa
  const rag = await buildRagContext(buildQueryForRag(slug, title));

  // System prompt completo
  const system = `${SYSTEM_BY_SLUG[slug]}

═══════════════════════════════════════════
MODELOS OFICIALES DE REFERENCIA (estilo y estructura):
${fewShot || '(No hay modelos cargados para este generador.)'}
═══════════════════════════════════════════

CONTEXTO NORMATIVO PARA CITAS:
${rag || '(No se encontró sustento normativo específico.)'}`;

  // Prompt del usuario: pasamos input_data como JSON estructurado para que el
  // LLM lo lea y arme el documento.
  const userPrompt = `DATOS DEL USUARIO (formulario):
\`\`\`json
${JSON.stringify(input_data, null, 2)}
\`\`\`

${base_text ? `TEXTO BASE PROVISTO POR EL USUARIO (Bases / consultas recibidas / acto impugnado):\n${base_text.slice(0, 12000)}\n\n` : ''}Genera el documento en MARKDOWN siguiendo la estructura indicada en las instrucciones del sistema y el estilo de los MODELOS de referencia. No incluyas texto previo ni posterior — solo el documento.`;

  try {
    const startedAt = Date.now();
    const result = await generateText({
      model: chatModel,
      system,
      prompt: userPrompt,
      temperature: 0.3,
    });
    const { text } = result;
    void recordAiUsage({
      userId: user.id,
      feature: `generator_${slug}`,
      model: CHAT_MODEL_ID,
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
      latencyMs: Date.now() - startedAt,
      metadata: { slug, title },
    });

    if (!text || text.trim().length < 200) {
      return NextResponse.json(
        { error: 'empty_response', detail: 'El modelo no devolvió contenido suficiente.' },
        { status: 502 },
      );
    }

    // Persistir en generated_documents (reutilizamos la tabla existente)
    const { data: doc, error: insertErr } = await supabase
      .from('generated_documents')
      .insert({
        user_id: user.id,
        document_type: slug,
        title,
        input_data: input_data as never,
        generated_content: text,
      } as never)
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: 'persist_failed', detail: insertErr.message },
        { status: 500 },
      );
    }

    await recordUsage(user.id, 'generator_call');
    return NextResponse.json({ content: text, document_id: (doc as { id: string }).id });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[generators/selection] LLM error:', msg);
    return NextResponse.json(
      { error: 'generation_failed', detail: msg },
      { status: 500 },
    );
  }
}
