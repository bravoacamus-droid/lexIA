/**
 * Wrapper de `generateText` (Vercel AI SDK) que captura `usage` y registra
 * tokens / latencia / costo en `ai_usage_log`. Fire-and-forget: si el log
 * falla, no rompe el endpoint.
 */
import { generateText } from 'ai';
import { recordAiUsage } from './usage-log';

type GenerateTextOpts = Parameters<typeof generateText>[0];
type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;

export interface LoggingOpts {
  userId: string | null;
  feature: string;
  modelId: string;
  metadata?: Record<string, unknown>;
}

export async function generateTextLogged(
  opts: GenerateTextOpts,
  log: LoggingOpts,
): Promise<GenerateTextResult> {
  const startedAt = Date.now();
  let result: GenerateTextResult;
  let status: 'ok' | 'error' = 'ok';
  try {
    result = await generateText(opts);
    return result;
  } catch (err) {
    status = 'error';
    throw err;
  } finally {
    const latencyMs = Date.now() - startedAt;
    void recordAiUsage({
      userId: log.userId,
      feature: log.feature,
      model: log.modelId,
      inputTokens:
        // @ts-expect-error result puede no estar definido si error fue lanzado antes
        result?.usage?.promptTokens ?? 0,
      // @ts-expect-error idem
      outputTokens: result?.usage?.completionTokens ?? 0,
      latencyMs,
      status,
      metadata: log.metadata,
    });
  }
}
