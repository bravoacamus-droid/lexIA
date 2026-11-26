import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { cerrarLlamada } from '@/lib/voice/llamadas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  status: z.enum(['completed', 'failed']).optional(),
  duration_seconds: z.number().int().min(0).max(7200).optional(),
  summary: z.string().max(2000).optional(),
  user_rating: z.number().int().min(1).max(5).optional(),
  user_rating_comment: z.string().max(500).optional(),
  tokens_in: z.number().int().min(0).optional(),
  tokens_out: z.number().int().min(0).optional(),
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
 * Cierra la llamada (`status`) o guarda la calificación y el resumen.
 *
 * La duración y el cobro los decide el servidor (`cerrarLlamada`): el
 * `duration_seconds` que manda el navegador ya no cuenta.
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

  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, status, started_at')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const llamada = call as { id: string; user_id: string; status: string; started_at: string };
  if (llamada.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Lo que el usuario sí decide: su calificación y el resumen de su llamada.
  const propio: Record<string, unknown> = {};
  if (parsed.data.summary !== undefined) propio.summary = parsed.data.summary;
  if (parsed.data.user_rating !== undefined) propio.user_rating = parsed.data.user_rating;
  if (parsed.data.user_rating_comment !== undefined) propio.user_rating_comment = parsed.data.user_rating_comment;
  if (parsed.data.tokens_in !== undefined) propio.tokens_in = parsed.data.tokens_in;
  if (parsed.data.tokens_out !== undefined) propio.tokens_out = parsed.data.tokens_out;
  if (Object.keys(propio).length > 0) {
    const { error } = await admin.from('voice_calls').update(propio as never).eq('id', llamada.id);
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  if (parsed.data.status && llamada.status === 'active') {
    await cerrarLlamada(admin, llamada, { estado: parsed.data.status, fin: new Date() });
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
    .select('id, user_id, audio_storage_path, status, started_at')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const llamada = call as { id: string; user_id: string; status: string; started_at: string };
  if (llamada.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  // Una llamada en curso se cierra (y se cobra) antes de borrarla: la RLS
  // no deja borrar una `active` (migración 0089).
  if (llamada.status === 'active') {
    await cerrarLlamada(createAdminClient(), llamada, { estado: 'failed', fin: new Date() });
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
