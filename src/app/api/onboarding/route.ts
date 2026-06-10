import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  profile_role: z.enum(['entity', 'provider', 'consultant']),
  full_name: z.string().trim().min(1).max(120),
  organization_name: z.string().trim().min(1).max(160),
  ruc: z
    .string()
    .trim()
    .regex(/^\d{11}$/)
    .nullable()
    .optional(),
  position_title: z.string().trim().max(120).nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const { error } = await supabase
    .from('profiles')
    .update({
      profile_role: v.profile_role,
      full_name: v.full_name,
      organization_name: v.organization_name,
      ruc: v.ruc ?? null,
      position_title: v.position_title ?? null,
      onboarding_completed: true,
    } as never)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'update_failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
