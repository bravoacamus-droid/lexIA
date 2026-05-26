import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(2).max(160),
  bases_file_path: z.string().min(1),
  offer_files: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
      }),
    )
    .min(1)
    .max(5),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select('id, title, status, offer_files, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evaluations: data || [] });
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
    .from('evaluations')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      status: 'pending',
      bases_file_path: parsed.data.bases_file_path,
      offer_files: parsed.data.offer_files as never,
    } as never)
    .select('id, title, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evaluation: data });
}
