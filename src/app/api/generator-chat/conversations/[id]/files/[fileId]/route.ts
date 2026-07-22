import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGeminiFile } from '@/lib/ai/gemini-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE — remueve un archivo adjunto de la conversación. También
 * borra el archivo remoto de Gemini para liberar cuota.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: { id: string; fileId: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('generator_files')
    .select('id, gemini_file_name, user_id')
    .eq('id', ctx.params.fileId)
    .eq('conversation_id', ctx.params.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const r = row as { id: string; gemini_file_name: string; user_id: string };
  if (r.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Best-effort delete en Gemini (si falla, el archivo expira solo en 48h)
  void deleteGeminiFile(r.gemini_file_name).catch((e) => {
    console.warn('[generator-chat] gemini delete failed:', (e as Error).message);
  });

  await supabase.from('generator_files').delete().eq('id', r.id);
  return NextResponse.json({ ok: true });
}
