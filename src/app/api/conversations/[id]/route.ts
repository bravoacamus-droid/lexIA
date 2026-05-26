import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  pinned: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: convo, error } = await supabase
    .from('chat_conversations')
    .select('id, title, pinned, created_at, updated_at, user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !convo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const c = convo as { user_id: string };
  if (c.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', ctx.params.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ conversation: convo, messages: messages || [] });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .update(parsed.data as never)
    .eq('id', ctx.params.id)
    .eq('user_id', user.id)
    .select('id, title, pinned, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversation: data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('chat_conversations')
    .delete()
    .eq('id', ctx.params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
