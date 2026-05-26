import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select(
      'id, title, status, bases_file_path, offer_files, result, created_at, completed_at, user_id',
    )
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const evalRow = data as { user_id: string };
  if (evalRow.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ evaluation: data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', ctx.params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
