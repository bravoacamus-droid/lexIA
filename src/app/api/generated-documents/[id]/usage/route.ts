import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { MODEL_PRICING } from '@/lib/ai/usage-log';

export const runtime = 'nodejs';

/**
 * Devuelve el consumo de tokens / costo del documento generado.
 *
 * Suma todas las llamadas a IA (ai_usage_log) asociadas a este document_id
 * en `metadata.document_id` y devuelve tokens, costo en USD y aproximado
 * en soles.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Verificar ownership del documento
  const { data: doc, error: docErr } = await supabase
    .from('generated_documents')
    .select('id, user_id, document_type, title, created_at')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (docErr || !doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const d = doc as {
    id: string;
    user_id: string;
    document_type: string;
    title: string;
    created_at: string;
  };
  if (d.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Admin client para leer ai_usage_log (RLS deja select solo al owner;
  // como sabemos que las filas son del mismo user, esto pasa igual con el
  // cliente normal, pero usamos admin por consistencia con el filtro JSON.)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: logs } = await admin
    .from('ai_usage_log')
    .select(
      'id, feature, model, provider, input_tokens, output_tokens, total_tokens, cost_micros, latency_ms, status, metadata, created_at',
    )
    .eq('user_id', d.user_id)
    .order('created_at', { ascending: true });

  type LogRow = {
    id: string;
    feature: string;
    model: string;
    provider: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_micros: number;
    latency_ms: number | null;
    status: string;
    metadata: { document_id?: string } | null;
    created_at: string;
  };
  const all = (logs || []) as LogRow[];
  const docLogs = all.filter(
    (r) => r.metadata && r.metadata.document_id === d.id,
  );

  const totalInputTokens = docLogs.reduce((s, r) => s + (r.input_tokens || 0), 0);
  const totalOutputTokens = docLogs.reduce(
    (s, r) => s + (r.output_tokens || 0),
    0,
  );
  const totalTokens = totalInputTokens + totalOutputTokens;
  const totalCostMicros = docLogs.reduce((s, r) => s + (r.cost_micros || 0), 0);
  const totalCostUsd = totalCostMicros / 1_000_000;
  // Estimación a soles (tipo de cambio aproximado 3.75)
  const USD_TO_PEN = 3.75;
  const totalCostPen = totalCostUsd * USD_TO_PEN;
  const totalLatencyMs = docLogs.reduce(
    (s, r) => s + (r.latency_ms || 0),
    0,
  );

  const modelsUsed = Array.from(new Set(docLogs.map((r) => r.model))).map(
    (m) => ({
      model: m,
      provider: MODEL_PRICING[m]?.provider || 'google',
      inputPerMillionUsd: MODEL_PRICING[m]?.inputPerMillion || 0,
      outputPerMillionUsd: MODEL_PRICING[m]?.outputPerMillion || 0,
    }),
  );

  return NextResponse.json({
    document: {
      id: d.id,
      document_type: d.document_type,
      title: d.title,
      created_at: d.created_at,
    },
    summary: {
      calls: docLogs.length,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      total_tokens: totalTokens,
      cost_usd: Number(totalCostUsd.toFixed(6)),
      cost_pen: Number(totalCostPen.toFixed(4)),
      latency_ms: totalLatencyMs,
      models_used: modelsUsed,
    },
    calls: docLogs.map((r) => ({
      id: r.id,
      feature: r.feature,
      model: r.model,
      input_tokens: r.input_tokens,
      output_tokens: r.output_tokens,
      total_tokens: r.total_tokens,
      cost_usd: Number((r.cost_micros / 1_000_000).toFixed(6)),
      latency_ms: r.latency_ms,
      status: r.status,
      created_at: r.created_at,
    })),
  });
}
