import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { recordAiUsage } from '@/lib/ai/usage-log';
import {
  getClauseCatalog,
  OBJETO_ANEXO_TITULOS,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Schema = z.object({
  clause_id: z.string(),
  user_input: z.string().min(3).max(8000),
});

interface HybridRow {
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
        return `[${i + 1}] ${docLabel} — ${r.doc_title}\n${r.content.slice(0, 1200)}`;
      })
      .join('\n\n---\n\n');
  } catch (e) {
    console.error('[enhance-clause] RAG falló:', (e as Error).message);
    return '';
  }
}

/**
 * POST /api/requerimientos/[id]/enhance-clause
 * Body: { clause_id: string, user_input: string }
 *
 * Toma la información puntual del usuario, recupera contexto normativo
 * relevante (Ley 32069 + Reglamento + manuales SEACE) y genera el
 * texto profesional final para esa cláusula específica.
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { clause_id, user_input } = parsed.data;

  // Cargar el requirement para conocer el contexto (objeto + denominación)
  const { data: req_data } = await supabase
    .from('entity_requirements')
    .select('user_id, objeto, denominacion, area_usuaria, organo_unidad_organica')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!req_data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const r = req_data as {
    user_id: string;
    objeto: ObjectoContractual;
    denominacion: string;
    area_usuaria: string | null;
    organo_unidad_organica: string | null;
  };
  if (r.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Encontrar la definición de la cláusula en el catálogo
  const catalog = getClauseCatalog(r.objeto);
  const clauseDef = catalog.find((c) => c.id === clause_id);
  if (!clauseDef) {
    return NextResponse.json(
      { error: 'unknown_clause', detail: clause_id },
      { status: 400 },
    );
  }

  // Recuperar contexto normativo relevante a la cláusula + objeto
  const ragQuery = `${clauseDef.label} ${r.denominacion} ${OBJETO_ANEXO_TITULOS[r.objeto]}`;
  const rag = await buildRagContext(ragQuery);

  const systemPrompt = `Eres LexIA, asistente jurídico especializado en Contrataciones del Estado peruano (Ley N° 32069 + DS N° 009-2025-EF).

Tu tarea es escribir UNA cláusula específica de un Anexo (${OBJETO_ANEXO_TITULOS[r.objeto]}) para una contratación de la Entidad. NO escribas el documento completo — solo el texto que va dentro de la cláusula indicada.

CLÁUSULA A REDACTAR: "${clauseDef.label}"

INSTRUCCIONES DE ESTA CLÁUSULA:
${clauseDef.aiHint}

CONTEXTO DEL REQUERIMIENTO:
- Denominación: ${r.denominacion}
- Objeto contractual: ${OBJETO_ANEXO_TITULOS[r.objeto]}
${r.area_usuaria ? `- Área usuaria: ${r.area_usuaria}` : ''}
${r.organo_unidad_organica ? `- Órgano/Unidad: ${r.organo_unidad_organica}` : ''}

CONTEXTO NORMATIVO PARA CITAS:
${rag || '(No se encontró sustento normativo específico para esta consulta.)'}

REGLAS:
- Devuelve SOLO el contenido HTML de la cláusula (sin <html>, sin el título de la cláusula, sin envoltura).
- Usa etiquetas <p>, <strong>, <em>, <ul>, <li>, <ol>, <table>, <thead>, <tbody>, <tr>, <th>, <td> según convenga.
- Si el usuario provee datos puntuales, INCORPÓRALOS sin cambiar su sentido.
- Si el usuario provee información insuficiente, deja placeholders en cursiva *[Pendiente: completar X]* en lugar de inventar.
- Cita normas con artículo y numeral exacto cuando aplique.
- Mantén el formalismo del derecho administrativo peruano.
- NO incluyas saludos, explicaciones ni comentarios fuera del HTML.`;

  const userPrompt = `Información puntual provista por el área usuaria para esta cláusula:
"""
${user_input}
"""

Redacta el HTML de la cláusula "${clauseDef.label}" profesionalizando esta información.`;

  try {
    const startedAt = Date.now();
    const result = await generateText({
      model: chatModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });
    const { text } = result;
    const latencyMs = Date.now() - startedAt;

    void recordAiUsage({
      userId: user.id,
      feature: `requerimiento_enhance_${clause_id}`,
      model: CHAT_MODEL_ID,
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
      latencyMs,
      metadata: {
        requirement_id: ctx.params.id,
        clause_id,
        document_id: ctx.params.id,
      },
    });

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'empty_response' },
        { status: 502 },
      );
    }

    // Limpiar wrappers comunes que el modelo a veces incluye aunque le digamos que no
    const cleaned = text
      .replace(/^```html\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return NextResponse.json({
      content: cleaned,
      tokens: {
        input: result.usage?.promptTokens ?? 0,
        output: result.usage?.completionTokens ?? 0,
        total:
          (result.usage?.promptTokens ?? 0) +
          (result.usage?.completionTokens ?? 0),
      },
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[enhance-clause] LLM error:', msg);
    return NextResponse.json(
      { error: 'generation_failed', detail: msg },
      { status: 500 },
    );
  }
}
