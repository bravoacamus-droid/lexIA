import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  document_type: z.enum(['ampliacion_plazo']),
  title: z.string().min(2).max(160),
  input_data: z.record(z.any()),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, document_type, title, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      user_id: user.id,
      document_type: parsed.data.document_type,
      title: parsed.data.title,
      input_data: parsed.data.input_data as never,
      status: 'draft',
    } as never)
    .select('id, document_type, title, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
