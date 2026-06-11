import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import {
  CAMBIO_PERSONAL_CLAVE_SYSTEM,
  RESOLUCION_CONTRATO_SYSTEM,
  CAMBIO_BIENES_SYSTEM,
  DESCARGO_PENALIDADES_SYSTEM,
  SOLICITUD_SANCION_SYSTEM,
} from '@/lib/ai/ejecucion-generator-prompts';
import { loadTemplates, composeFewShot } from '@/lib/generators/template-loader';
import type { ProfileRole } from '@/lib/auth/session';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const maxDuration = 60;

type EjecucionSlug =
  | 'cambio_personal_clave'
  | 'resolucion_contrato'
  | 'cambio_bienes'
  | 'descargo_penalidades'
  | 'solicitud_sancion';

const SCHEMA = z.object({
  slug: z.enum([
    'cambio_personal_clave',
    'resolucion_contrato',
    'cambio_bienes',
    'descargo_penalidades',
    'solicitud_sancion',
  ]),
  title: z.string().min(2).max(160),
  input_data: z.record(z.unknown()),
  base_text: z.string().optional(),
});

const SYSTEM_BY_SLUG: Record<EjecucionSlug, string> = {
  cambio_personal_clave: CAMBIO_PERSONAL_CLAVE_SYSTEM,
  resolucion_contrato: RESOLUCION_CONTRATO_SYSTEM,
  cambio_bienes: CAMBIO_BIENES_SYSTEM,
  descargo_penalidades: DESCARGO_PENALIDADES_SYSTEM,
  solicitud_sancion: SOLICITUD_SANCION_SYSTEM,
};

const ROLE_BY_SLUG: Record<EjecucionSlug, ProfileRole[]> = {
  cambio_personal_clave: ['provider', 'consultant'],
  resolucion_contrato: ['entity', 'consultant'],
  cambio_bienes: ['provider', 'consultant'],
  descargo_penalidades: ['provider', 'consultant'],
  solicitud_sancion: ['entity', 'consultant'],
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
    console.error('[generators/ejecucion] RAG falló:', (e as Error).message);
    return '';
  }
}

function buildQueryForRag(slug: EjecucionSlug, title: string): string {
  const baseQueries: Record<EjecucionSlug, string> = {
    cambio_personal_clave:
      'sustitución de personal clave, profesional acreditado, equivalencia técnica, modificación contractual',
    resolucion_contrato:
      'resolución de contrato por incumplimiento, carta notarial de apercibimiento, ejecución de garantías, procedimiento sancionador',
    cambio_bienes:
      'sustitución de bienes ofertados, equivalencia técnica, modificación contractual, especificaciones técnicas',
    descargo_penalidades:
      'descargo a penalidades, caso fortuito, fuerza mayor, hecho atribuible a la entidad, ampliación de plazo',
    solicitud_sancion:
      'procedimiento administrativo sancionador, Tribunal del OECE, inhabilitación, infracciones tipificadas, documentación falsa, art. 49 Ley 32069',
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
  const allowed = ROLE_BY_SLUG[slug];
  if (!userRole || !allowed.includes(userRole)) {
    return NextResponse.json(
      { error: 'forbidden_for_role', allowed },
      { status: 403 },
    );
  }

  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  // Few-shot — solo los slugs con modelo oficial cargado
  const templates = await loadTemplates({ slug, limit: 2 });
  const fewShot = composeFewShot(templates, 3500);

  // RAG
  const rag = await buildRagContext(buildQueryForRag(slug, title));

  const system = `${SYSTEM_BY_SLUG[slug]}

═══════════════════════════════════════════
MODELOS OFICIALES DE REFERENCIA (estilo y estructura):
${fewShot || '(Este generador opera sin modelo oficial; se apoya únicamente en el sustento normativo y la estructura indicada.)'}
═══════════════════════════════════════════

CONTEXTO NORMATIVO PARA CITAS:
${rag || '(No se encontró sustento normativo específico.)'}`;

  const userPrompt = `DATOS DEL USUARIO (formulario):
\`\`\`json
${JSON.stringify(input_data, null, 2)}
\`\`\`

${base_text ? `TEXTO BASE PROVISTO (oficio de penalidad / contrato / acto a impugnar):\n${base_text.slice(0, 12000)}\n\n` : ''}Genera el documento en MARKDOWN siguiendo la estructura indicada en las instrucciones del sistema y el estilo de los MODELOS de referencia. No incluyas texto previo ni posterior — solo el documento.`;

  try {
    const { text } = await generateText({
      model: chatModel,
      system,
      prompt: userPrompt,
      temperature: 0.3,
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
    console.error('[generators/ejecucion] LLM error:', msg);
    return NextResponse.json(
      { error: 'generation_failed', detail: msg },
      { status: 500 },
    );
  }
}
