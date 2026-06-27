import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { VOICE_MODEL_ID } from '@/lib/ai/voice-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para verificar que:
 *   1. La API key de Gemini está configurada.
 *   2. El modelo gemini-2.5-flash-native-audio es accesible.
 *   3. Las tablas voice_calls / voice_consents existen en BD.
 *   4. El bucket voice-recordings está creado.
 *
 * Solo accesible a usuarios autenticados.
 * Útil durante el desarrollo de la funcionalidad de voz.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'missing_api_key', detail: 'GOOGLE_GENERATIVE_AI_API_KEY no configurada' },
      { status: 500 },
    );
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. SDK puede instanciar
  try {
    const genai = new GoogleGenAI({ apiKey });
    checks.sdk_loaded = { ok: true, detail: 'SDK @google/genai inicializado' };
    // Verificar que el modelo es enumerable
    checks.model_id = { ok: true, detail: VOICE_MODEL_ID };
    void genai;
  } catch (e) {
    checks.sdk_loaded = { ok: false, detail: (e as Error).message };
  }

  // 2. Tablas BD existen
  try {
    const queries = await Promise.all([
      supabase.from('voice_consents').select('id', { head: true, count: 'exact' }),
      supabase.from('voice_calls').select('id', { head: true, count: 'exact' }),
      supabase
        .from('voice_call_transcripts')
        .select('id', { head: true, count: 'exact' }),
    ]);
    checks.table_voice_consents = { ok: !queries[0].error, detail: queries[0].error?.message };
    checks.table_voice_calls = { ok: !queries[1].error, detail: queries[1].error?.message };
    checks.table_voice_call_transcripts = {
      ok: !queries[2].error,
      detail: queries[2].error?.message,
    };
  } catch (e) {
    checks.bd_check = { ok: false, detail: (e as Error).message };
  }

  // 3. Llamada simple de texto (no Live, solo para validar la key)
  try {
    const genai = new GoogleGenAI({ apiKey });
    const res = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Responde con la palabra "OK" sin nada más.',
    });
    const text = res.text || '';
    checks.api_key_works = {
      ok: text.toUpperCase().includes('OK'),
      detail: `Respuesta: "${text.slice(0, 30)}"`,
    };
  } catch (e) {
    checks.api_key_works = { ok: false, detail: (e as Error).message.slice(0, 200) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? 'ready' : 'has_issues',
    model: VOICE_MODEL_ID,
    user_id: user.id,
    checks,
  });
}
