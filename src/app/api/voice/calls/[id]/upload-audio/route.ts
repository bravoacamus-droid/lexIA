import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/voice/calls/[id]/upload-audio
 * Recibe el audio grabado del usuario y lo sube a Supabase Storage
 * (bucket voice-recordings) en la carpeta del usuario.
 *
 * El path queda guardado en voice_calls.audio_storage_path.
 *
 * Estructura del path: {user_id}/{call_id}.webm
 * Esto cumple las policies RLS (foldername[1] = user_id).
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Validar ownership
  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, audio_storage_path')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('audio');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_audio' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'too_large', detail: `Audio supera 50 MB (recibido ${file.size}b)` },
      { status: 413 },
    );
  }

  // Determinar extensión
  const ext = file.type.includes('webm')
    ? 'webm'
    : file.type.includes('ogg')
      ? 'ogg'
      : file.type.includes('mp4')
        ? 'mp4'
        : 'audio';
  const path = `${user.id}/${ctx.params.id}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from('voice-recordings')
    .upload(path, buffer, {
      contentType: file.type || 'audio/webm',
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: 'upload_failed', detail: uploadErr.message },
      { status: 500 },
    );
  }

  // Actualizar path en BD
  await supabase
    .from('voice_calls')
    .update({ audio_storage_path: path } as never)
    .eq('id', ctx.params.id);

  return NextResponse.json({ ok: true, path });
}
