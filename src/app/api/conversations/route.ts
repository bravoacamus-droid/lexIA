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
    .select('id, title, pinned, created_at, updated_at')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversations: data || [] });
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
