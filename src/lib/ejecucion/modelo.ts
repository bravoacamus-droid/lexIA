/**
 * Una llamada al modelo que devuelve JSON, con un reintento si la
 * respuesta no se deja leer, y el consumo apuntado.
 */
import { generateText } from 'ai';
import { generatorModel, GENERATOR_MODEL_ID } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { recordAiUsage } from '@/lib/ai/usage-log';

export interface OpcionesDelModelo {
  temperatura?: number;
  /** Para el registro de consumo. */
  usuario?: string | null;
  funcion: string;
}

export async function pedirJSON<T>(prompt: string, o: OpcionesDelModelo): Promise<T> {
  let ultimo: Error | null = null;
  for (let intento = 0; intento < 2; intento++) {
    const inicio = Date.now();
    try {
      const { text, usage } = await generateText({
        model: generatorModel,
        prompt,
        temperature: o.temperatura ?? 0.1,
      });
      void recordAiUsage({
        userId: o.usuario ?? null,
        feature: o.funcion,
        model: GENERATOR_MODEL_ID,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        latencyMs: Date.now() - inicio,
        status: 'ok',
      });
      return parseJsonLoose<T>(text);
    } catch (e) {
      ultimo = e as Error;
      console.error(`[ejecucion] ${o.funcion}: intento ${intento + 1} falló:`, ultimo.message);
    }
  }
  throw ultimo ?? new Error('El modelo no respondió');
}
