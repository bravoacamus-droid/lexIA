import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { embedOne } from '@/lib/ai/embeddings';
import {
  RNP_AUMENTO_CMC_SYSTEM,
  RNP_ACTUALIZACION_FINANCIERA_SYSTEM,
} from '@/lib/ai/rnp-generator-prompts';
import { loadTemplates, composeFewShot } from '@/lib/generators/template-loader';
import type { ProfileRole } from '@/lib/auth/session';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RnpSlug = 'rnp_aumento_cmc' | 'rnp_actualizacion_financiera';

const SCHEMA = z.object({
  slug: z.enum(['rnp_aumento_cmc', 'rnp_actualizacion_financiera']),
  title: z.string().min(2).max(160),
  input_data: z.record(z.unknown()),
  base_text: z.string().optional(),
});

const SYSTEM_BY_SLUG: Record<RnpSlug, string> = {
  rnp_aumento_cmc: RNP_AUMENTO_CMC_SYSTEM,
  rnp_actualizacion_financiera: RNP_ACTUALIZACION_FINANCIERA_SYSTEM,
};

// Solo proveedores acceden a RNP (y consultor que los asista).
const ALLOWED_ROLES: ProfileRole[] = ['provider', 'consultant'];

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
      match_count: 5,
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
    console.error('[generators/rnp] RAG falló:', (e as Error).message);
    return '';
  }
}

function buildQueryForRag(slug: RnpSlug, title: string): string {
  const baseQueries: Record<RnpSlug, string> = {
    rnp_aumento_cmc:
      'Registro Nacional de Proveedores, aumento de capacidad máxima de contratación, ejecutor de obras, consultor de obras, capital social',
    rnp_actualizacion_financiera:
      'Anexo 06, información financiera, estados financieros situacionales, balance general, estado de resultados, ratios de liquidez, endeudamiento patrimonial',
  };
  return `${title}. ${baseQueries[slug]}`;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
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
  const { slug, title, input_data, base_text } = parsed.data;

  // Role gate
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;
  if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
    return NextResponse.json(
      { error: 'forbidden_for_role', allowed: ALLOWED_ROLES },
      { status: 403 },
    );
  }

  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  // Plantillas oficiales como few-shot (las fichas técnicas / Anexo 06)
  const templates = await loadTemplates({ slug, limit: 2 });
  const fewShot = composeFewShot(templates, 4000);

  const rag = await buildRagContext(buildQueryForRag(slug, title));

  const system = `${SYSTEM_BY_SLUG[slug]}

═══════════════════════════════════════════
MODELOS OFICIALES DE REFERENCIA (estructura y contenido obligatorio):
${fewShot || '(No hay modelos cargados para este generador.)'}
═══════════════════════════════════════════

CONTEXTO NORMATIVO PARA CITAS:
${rag || '(No se encontró sustento normativo específico.)'}`;

  const userPrompt = `DATOS DEL USUARIO (formulario):
\`\`\`json
${JSON.stringify(input_data, null, 2)}
\`\`\`

${base_text ? `TEXTO BASE PROVISTO:\n${base_text.slice(0, 12000)}\n\n` : ''}Genera el documento en MARKDOWN siguiendo la estructura y reglas de las instrucciones del sistema y los modelos oficiales. No incluyas texto previo ni posterior — solo el documento.`;

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
      return NextResponse.json({ error: 'empty_response' }, { status: 502 });
    }

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
    return NextResponse.json({
      content: text,
      document_id: (doc as { id: string }).id,
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[generators/rnp] LLM error:', msg);
    return NextResponse.json(
      { error: 'generation_failed', detail: msg },
      { status: 500 },
    );
  }
}
