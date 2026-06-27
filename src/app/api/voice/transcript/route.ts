import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  call_id: z.string().uuid(),
  speaker: z.enum(['user', 'assistant']),
  timestamp_seconds: z.number().min(0),
  text: z.string().min(1).max(10000),
  citations: z
    .array(z.object({ citation: z.string(), title: z.string() }))
    .optional(),
});

/**
 * POST /api/voice/transcript
 * Persiste un turno de la transcripción de la llamada.
 * Llamado por el cliente cada vez que detecta texto del usuario o
 * del agente (vía outputTranscription de Gemini Live).
 */
export async function POST(req: Request) {
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

  // Verificar ownership
  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id')
    .eq('id', parsed.data.call_id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('voice_call_transcripts')
    .insert({
      call_id: parsed.data.call_id,
      speaker: parsed.data.speaker,
      timestamp_seconds: parsed.data.timestamp_seconds,
      text: parsed.data.text,
      citations: (parsed.data.citations || []) as never,
    } as never);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
