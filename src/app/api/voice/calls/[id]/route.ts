import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recordUsage } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  status: z.enum(['completed', 'failed']).optional(),
  duration_seconds: z.number().int().min(0).max(7200).optional(),
  summary: z.string().max(2000).optional(),
  user_rating: z.number().int().min(1).max(5).optional(),
  user_rating_comment: z.string().max(500).optional(),
});

/**
 * GET /api/voice/calls/[id]
 * Detalle de una llamada con su transcripción.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: call } = await supabase
    .from('voice_calls')
    .select('*')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (!call) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: transcripts } = await supabase
    .from('voice_call_transcripts')
    .select('id, speaker, timestamp_seconds, text, citations')
    .eq('call_id', ctx.params.id)
    .order('timestamp_seconds', { ascending: true });

  return NextResponse.json({
    call,
    transcripts: transcripts || [],
  });
}

/**
 * PATCH /api/voice/calls/[id]
 * Cierra la llamada o actualiza calificación.
 */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verificar ownership
  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, status')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  // Al marcar 'completed' o 'failed', registrar ended_at
  if (parsed.data.status && parsed.data.status !== (call as { status: string }).status) {
    update.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('voice_calls')
    .update(update as never)
    .eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si la llamada se cerró con duración, descontar de la cuota mensual.
  // Redondeamos hacia arriba: una llamada de 0:01 a 0:59 consume 1 minuto.
  // Llamada de 1:00 a 1:59 consume 2 min, etc.
  if (
    parsed.data.status === 'completed' &&
    typeof parsed.data.duration_seconds === 'number' &&
    parsed.data.duration_seconds > 0 &&
    (call as { status: string }).status === 'active'
  ) {
    const minutes = Math.ceil(parsed.data.duration_seconds / 60);
    void recordUsage(user.id, 'voice_call_minute', minutes);
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/voice/calls/[id]
 * Borra la llamada y todos sus datos (transcripción + audio si existe).
 * Implementa el derecho de eliminación del Art. 18 de la Ley 29733.
 */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, audio_storage_path')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Borrar audio del Storage si existe
  const audioPath = (call as { audio_storage_path: string | null }).audio_storage_path;
  if (audioPath) {
    await supabase.storage.from('voice-recordings').remove([audioPath]);
  }

  // El delete CASCADE de la tabla se encarga de las transcripciones
  const { error } = await supabase
    .from('voice_calls')
    .delete()
    .eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
