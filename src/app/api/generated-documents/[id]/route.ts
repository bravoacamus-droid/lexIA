import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  generated_content: z.string().max(120_000).optional(),
  status: z.enum(['draft', 'final']).optional(),
  input_data: z.record(z.any()).optional(),
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('generated_documents')
    .select(
      'id, document_type, title, status, input_data, generated_content, created_at, user_id',
    )
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const row = data as { user_id: string };
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ document: data });
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
    .from('generated_documents')
    .update(parsed.data as never)
    .eq('id', ctx.params.id)
    .eq('user_id', user.id)
    .select('id, title, status, generated_content')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('generated_documents')
    .delete()
    .eq('id', ctx.params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
