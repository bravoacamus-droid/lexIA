import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    title: z.string().min(2).max(160),
    bases_file_path: z.string().min(1),
    offer_files: z
      .array(z.object({ name: z.string(), path: z.string() }))
      .max(5)
      .optional()
      .default([]),
    mode: z
      .enum(['committee', 'self_review', 'tdr_audit'])
      .optional()
      .default('committee'),
  })
  .refine(
    (v) => v.mode === 'tdr_audit' || (v.offer_files && v.offer_files.length >= 1),
    {
      message:
        'committee y self_review requieren al menos una oferta; tdr_audit no usa ofertas.',
      path: ['offer_files'],
    },
  );

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select('id, title, status, offer_files, mode, created_at, completed_at')
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

  // Feature gate: 1 evaluación consume 1 unidad de la cuota mensual.
  const guard = await ensureCanUse(user.id, 'evaluation_run');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  const { data, error } = await supabase
    .from('evaluations')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      status: 'pending',
      bases_file_path: parsed.data.bases_file_path,
      offer_files: parsed.data.offer_files as never,
      mode: parsed.data.mode,
    } as never)
    .select('id, title, status, created_at, mode')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordUsage(user.id, 'evaluation_run');
  return NextResponse.json({ evaluation: data });
}
