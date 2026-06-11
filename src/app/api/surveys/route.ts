import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const SCHEMA = z.object({
  survey_slug: z.enum(['provider', 'entity', 'consultant']),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  skipped: z.boolean().optional().default(false),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ completed: false }, { status: 401 });

  const { data } = await supabase
    .from('user_surveys')
    .select('id, survey_slug, completed_at, skipped')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ completed: Boolean(data), survey: data || null });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Upsert por unique (user_id)
  const { data: existing } = await supabase
    .from('user_surveys')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_surveys')
      .update({
        survey_slug: parsed.data.survey_slug,
        answers: parsed.data.answers as never,
        skipped: parsed.data.skipped,
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', (existing as { id: string }).id);
  } else {
    await supabase.from('user_surveys').insert({
      user_id: user.id,
      survey_slug: parsed.data.survey_slug,
      answers: parsed.data.answers as never,
      skipped: parsed.data.skipped,
    } as never);
  }

  return NextResponse.json({ ok: true });
}
