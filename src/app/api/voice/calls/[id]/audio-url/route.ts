import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/voice/calls/[id]/audio-url
 * Devuelve una signed URL de 1 hora para descargar el audio de la
 * llamada. Solo el dueño puede pedirla.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
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
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  if ((call as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const path = (call as { audio_storage_path: string | null }).audio_storage_path;
  if (!path) {
    return NextResponse.json({ error: 'no_audio', detail: 'Esta llamada no tiene audio guardado' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from('voice-recordings')
    .createSignedUrl(path, 3600);
  if (error || !data) {
    return NextResponse.json(
      { error: 'signed_url_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl, expires_in: 3600 });
}
