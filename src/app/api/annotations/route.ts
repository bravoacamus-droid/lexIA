import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  document_id: z.string().uuid(),
  highlighted_text: z.string().min(1).max(8000),
  position: z.object({
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().min(0),
  }),
  color: z.enum(['yellow', 'green', 'blue']).default('yellow'),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const docId = url.searchParams.get('document');
  if (!docId) {
    return NextResponse.json({ error: 'missing_document' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_annotations')
    .select('id, document_id, highlighted_text, position, color, created_at')
    .eq('user_id', user.id)
    .eq('document_id', docId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotations: data || [] });
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
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_annotations')
    .insert({
      user_id: user.id,
      document_id: parsed.data.document_id,
      highlighted_text: parsed.data.highlighted_text,
      position: parsed.data.position as never,
      color: parsed.data.color,
    } as never)
    .select('id, document_id, highlighted_text, position, color, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotation: data });
}
