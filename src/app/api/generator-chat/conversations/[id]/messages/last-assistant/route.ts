import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — devuelve el ID UUID (BD) del último mensaje del assistant de
 * la conversación. Se usa después del streaming del useChat porque los
 * IDs locales del useChat NO son los UUIDs de BD; el botón "Descargar
 * Word" necesita el UUID real para armar el endpoint /export.
 *
 * Race condition posible: el streaming del frontend termina ANTES que
 * el insert del backend (que se hace en onFinish). El cliente hace
 * polling con backoff hasta 3 intentos.
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: convo } = await supabase
    .from('generator_conversations')
    .select('user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!convo || (convo as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: msg } = await supabase
    .from('generator_messages')
    .select('id, created_at')
    .eq('conversation_id', ctx.params.id)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    messageId: (msg as { id: string } | null)?.id ?? null,
    createdAt: (msg as { created_at: string } | null)?.created_at ?? null,
  });
}
