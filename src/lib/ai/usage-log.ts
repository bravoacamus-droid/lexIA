/**
 * Bitácora de consumo de tokens para medir gasto y calibrar precios.
 *
 * Se llama después de cada invocación a un modelo LLM/embedding. Idempotente
 * por convención (no por ID). La operación es fire-and-forget: si falla,
 * se loguea a consola pero no rompe el endpoint.
 */
import { createClient as createAdmin } from '@supabase/supabase-js';

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Tabla de precios oficial de Google AI (USD / millón de tokens).
 * Actualizar cuando Google cambie tarifas.
 * @see https://ai.google.dev/pricing
 */
export const MODEL_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number; provider: string }
> = {
  // Gemini Flash (latest)
  'gemini-flash-latest': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    provider: 'google',
  },
  'gemini-2.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    provider: 'google',
  },
  'gemini-2.0-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    provider: 'google',
  },
  'gemini-flash-lite-latest': {
    inputPerMillion: 0.038,
    outputPerMillion: 0.15,
    provider: 'google',
  },
  'gemini-2.5-flash-lite': {
    inputPerMillion: 0.038,
    outputPerMillion: 0.15,
    provider: 'google',
  },
  // Gemini Pro
  'gemini-2.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
    provider: 'google',
  },
  // Embeddings
  'gemini-embedding-001': {
    inputPerMillion: 0.15,
    outputPerMillion: 0,
    provider: 'google',
  },
  'text-embedding-004': {
    inputPerMillion: 0.025,
    outputPerMillion: 0,
    provider: 'google',
  },
  // Voyage embeddings (fallback)
  'voyage-3': {
    inputPerMillion: 0.06,
    outputPerMillion: 0,
    provider: 'voyage',
  },
};

export function estimateCostMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  const inputUsd = (inputTokens / 1_000_000) * p.inputPerMillion;
  const outputUsd = (outputTokens / 1_000_000) * p.outputPerMillion;
  return Math.round((inputUsd + outputUsd) * 1_000_000);
}

export interface AiUsageInput {
  userId: string | null;
  feature: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status?: 'ok' | 'error';
  metadata?: Record<string, unknown>;
}

export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  try {
    const admin = adminClient();
    const inputTokens = input.inputTokens ?? 0;
    const outputTokens = input.outputTokens ?? 0;
    const costMicros = estimateCostMicros(input.model, inputTokens, outputTokens);
    const provider = MODEL_PRICING[input.model]?.provider ?? 'google';

    await admin.from('ai_usage_log').insert({
      user_id: input.userId,
      feature: input.feature,
      model: input.model,
      provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_micros: costMicros,
      latency_ms: input.latencyMs ?? null,
      status: input.status ?? 'ok',
      metadata: input.metadata ?? {},
    } as never);
  } catch (err) {
    console.error('[ai-usage] insert failed', err);
  }
}
