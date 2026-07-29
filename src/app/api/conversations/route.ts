import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, pinned, created_at, updated_at, chat_messages(count)')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ocultar conversaciones VACÍAS (sin mensajes) salvo la más reciente
  // de los últimos 5 minutos (puede ser la que el usuario acaba de
  // abrir). Observación César 27/07/2026: la lista se llenaba de
  // "Nueva conversación" duplicadas al entrar y salir sin preguntar.
  const rows = (data || []) as Array<{
    id: string;
    title: string | null;
    pinned: boolean;
    created_at: string;
    updated_at: string;
    chat_messages: Array<{ count: number }>;
  }>;
  const cutoff = Date.now() - 5 * 60 * 1000;
  const conversations = rows
    .filter((r) => {
      const n = r.chat_messages?.[0]?.count ?? 0;
      if (n > 0) return true;
      return new Date(r.created_at).getTime() > cutoff;
    })
    .map(({ chat_messages: _drop, ...rest }) => rest);

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = body.title?.toString().slice(0, 80) || null;

  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ user_id: user.id, title } as never)
    .select('id, title, pinned, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversation: data });
}
