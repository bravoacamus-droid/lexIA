import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/[id]/last-sources
 *
 * Devuelve las `sources` del ÚLTIMO mensaje `assistant` de la
 * conversación. Se usa como fallback del header `x-lexia-sources` en
 * el chat, porque Vercel trunca headers > ~16 KB y las respuestas con
 * 15 chunks fácilmente llegan a 40-50 KB (bug reportado 08/07/2026 —
 * las citas [N] aparecían en el texto pero al hover el tooltip decía
 * "Cita no disponible" y el panel "Fuentes consultadas" no aparecía).
 *
 * El frontend hace polling con backoff porque hay una race condition:
 * el stream del LLM termina ANTES que el `insert` del mensaje en BD
 * (que ocurre en el `onFinish` del backend). 2-3 reintentos son
 * suficientes en la práctica.
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Verificar que la conversación pertenece al usuario (RLS también lo
  // hace, pero devolvemos 404 en lugar de vacío para diagnóstico).
  const { data: convo } = await supabase
    .from('chat_conversations')
    .select('user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!convo || (convo as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('id, sources, created_at')
    .eq('conversation_id', ctx.params.id)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = msg as {
    id: string;
    sources: unknown[] | null;
    created_at: string;
  } | null;

  return NextResponse.json({
    messageId: row?.id ?? null,
    sources: row?.sources ?? [],
    createdAt: row?.created_at ?? null,
  });
}
