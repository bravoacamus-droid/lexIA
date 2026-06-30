import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { generateDocumentSummary, type DocumentSummary } from '@/lib/ai/document-summary';
import { recordAiUsage } from '@/lib/ai/usage-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/normativa/[id]/summary
 * Devuelve el resumen ejecutivo guardado en BD. Null si no se ha
 * generado todavía. La UI usa esto para decidir si pedir
 * generación (POST) o mostrar lo guardado.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: doc } = await supabase
    .from('normative_documents')
    .select('id, ai_summary, ai_summary_generated_at, ai_summary_model')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const d = doc as {
    id: string;
    ai_summary: DocumentSummary | null;
    ai_summary_generated_at: string | null;
    ai_summary_model: string | null;
  };

  return NextResponse.json({
    summary: d.ai_summary,
    generated_at: d.ai_summary_generated_at,
    model: d.ai_summary_model,
  });
}

/**
 * POST /api/normativa/[id]/summary
 * Genera (o re-genera) el resumen ejecutivo. Por defecto idempotente:
 * si ya existe lo devuelve sin regenerar. Pasa `?force=true` o
 * `{ force: true }` en el body para forzar regeneración.
 *
 * El cliente admin (service role) hace el UPDATE porque la tabla es
 * read-only para usuarios normales — los resúmenes son contenido
 * compartido (no por usuario).
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const forceFromQuery = url.searchParams.get('force') === 'true';
  const body = await req.json().catch(() => ({}));
  const force = forceFromQuery || (body as { force?: boolean }).force === true;

  const { data: doc } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, raw_text, ai_summary, ai_summary_generated_at, ai_summary_model')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const d = doc as {
    id: string;
    type: string;
    number: string | null;
    title: string;
    raw_text: string | null;
    ai_summary: DocumentSummary | null;
    ai_summary_generated_at: string | null;
    ai_summary_model: string | null;
  };

  // Idempotencia: si ya hay summary y no se forzó, devolver el actual.
  if (d.ai_summary && !force) {
    return NextResponse.json({
      summary: d.ai_summary,
      generated_at: d.ai_summary_generated_at,
      model: d.ai_summary_model,
      cached: true,
    });
  }

  if (!d.raw_text || d.raw_text.length < 100) {
    return NextResponse.json(
      { error: 'no_text', detail: 'Documento sin texto para resumir.' },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await generateDocumentSummary({
      type: d.type,
      number: d.number,
      title: d.title,
      raw_text: d.raw_text,
    });
  } catch (e) {
    console.error('[summary] generate failed:', e);
    return NextResponse.json(
      { error: 'generation_failed', detail: (e as Error).message },
      { status: 502 },
    );
  }

  if (!result.summary) {
    return NextResponse.json(
      { error: 'parse_failed', detail: 'El modelo no devolvió JSON válido.' },
      { status: 502 },
    );
  }

  // Persistir con admin client (la tabla no acepta UPDATE desde RLS de usuarios)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const generatedAt = new Date().toISOString();
  await admin
    .from('normative_documents')
    .update({
      ai_summary: result.summary,
      ai_summary_generated_at: generatedAt,
      ai_summary_model: result.model,
    } as never)
    .eq('id', ctx.params.id);

  // Bitácora de tokens (consumo de IA)
  void recordAiUsage({
    userId: user.id,
    feature: 'document_summary',
    model: result.model,
    inputTokens: result.tokens.in,
    outputTokens: result.tokens.out,
    latencyMs: result.latencyMs,
    metadata: { document_id: ctx.params.id, type: d.type, forced: force },
  });

  return NextResponse.json({
    summary: result.summary,
    generated_at: generatedAt,
    model: result.model,
    cached: false,
  });
}
