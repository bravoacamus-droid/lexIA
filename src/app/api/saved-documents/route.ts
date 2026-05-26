import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const saveSchema = z.object({
  document_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const folderId = url.searchParams.get('folder');

  let q = supabase
    .from('user_saved_documents')
    .select(
      'id, saved_at, folder_id, document_id, normative_documents(id, type, number, title, summary, date)',
    )
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false });

  if (folderId && folderId !== 'all') {
    if (folderId === 'unfiled') {
      q = q.is('folder_id', null);
    } else {
      q = q.eq('folder_id', folderId);
    }
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  // Upsert: si ya existe, actualizar folder_id; si no, crear
  const { data: existing } = await supabase
    .from('user_saved_documents')
    .select('id')
    .eq('user_id', user.id)
    .eq('document_id', parsed.data.document_id)
    .maybeSingle();

  if (existing) {
    const e = existing as { id: string };
    const { data, error } = await supabase
      .from('user_saved_documents')
      .update({ folder_id: parsed.data.folder_id ?? null } as never)
      .eq('id', e.id)
      .select('id, folder_id, saved_at, document_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ saved: data });
  }

  const { data, error } = await supabase
    .from('user_saved_documents')
    .insert({
      user_id: user.id,
      document_id: parsed.data.document_id,
      folder_id: parsed.data.folder_id ?? null,
    } as never)
    .select('id, folder_id, saved_at, document_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data });
}
