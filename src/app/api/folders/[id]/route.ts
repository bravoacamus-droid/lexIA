import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(30).optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data, error } = await supabase
    .from('user_folders')
    .update(parsed.data as never)
    .eq('id', ctx.params.id)
    .eq('user_id', user.id)
    .select('id, name, color, icon')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('user_folders')
    .delete()
    .eq('id', ctx.params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
