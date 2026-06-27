import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { CHAT_MODEL_ID } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/voice/calls/[id]/summarize
 * Genera el resumen ejecutivo de la llamada cuando el usuario cuelga.
 * Toma la transcripción completa y produce 2-4 oraciones que el usuario
 * pueda ver en su historial.
 */
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, duration_seconds, cited_documents, summary')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Si ya tiene resumen, devolver el existente
  if ((call as { summary: string | null }).summary) {
    return NextResponse.json({
      summary: (call as { summary: string }).summary,
      cached: true,
    });
  }

  const { data: turns } = await supabase
    .from('voice_call_transcripts')
    .select('speaker, text')
    .eq('call_id', ctx.params.id)
    .order('timestamp_seconds', { ascending: true });

  const transcript = ((turns || []) as Array<{ speaker: string; text: string }>)
    .map((t) => `${t.speaker === 'user' ? 'Usuario' : 'Abogada Virtual'}: ${t.text}`)
    .join('\n');

  if (!transcript.trim()) {
    return NextResponse.json({
      summary: 'Llamada sin transcripción registrada.',
      cached: false,
    });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });

  const genai = new GoogleGenAI({ apiKey });
  const startedAt = Date.now();
  try {
    const res = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Resume la siguiente llamada entre un usuario y un abogado virtual sobre contrataciones públicas en 2 a 4 oraciones cortas. Enfócate en QUÉ PREGUNTÓ el usuario y QUÉ NORMA O ARTÍCULO se mencionó como respuesta. Sin viñetas ni emojis. Español formal peruano.\n\nTranscripción:\n${transcript.slice(0, 15000)}`,
      config: { temperature: 0.3, maxOutputTokens: 300 },
    });
    const summary = (res.text || '').trim();

    // Persistir
    await supabase
      .from('voice_calls')
      .update({ summary } as never)
      .eq('id', ctx.params.id);

    // Log de uso
    void recordAiUsage({
      userId: user.id,
      feature: 'voice_summary',
      model: CHAT_MODEL_ID,
      inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - startedAt,
      metadata: { call_id: ctx.params.id },
    });

    return NextResponse.json({ summary, cached: false });
  } catch (e) {
    return NextResponse.json(
      { error: 'summarize_failed', detail: (e as Error).message.slice(0, 200) },
      { status: 500 },
    );
  }
}
