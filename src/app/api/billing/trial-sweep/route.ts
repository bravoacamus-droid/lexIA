import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Cron diario que marca como `past_due` las suscripciones con `status =
 * trialing` cuya `trial_ends_at < now()`.
 *
 * Autorización: header Authorization: Bearer <CRON_SECRET> (mismo secret
 * que el bot de scraping).
 *
 * Schedule en vercel.json: '0 4 * * *' — diario 04:00 UTC (1h después
 * del scraping).
 */
async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function sweep(req: Request): Promise<NextResponse> {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const nowIso = new Date().toISOString();

  const { data: expired, error } = await admin
    .from('subscriptions')
    .update({ status: 'past_due' } as never)
    .eq('status', 'trialing')
    .lt('trial_ends_at', nowIso)
    .select('id, user_id');

  if (error) {
    return NextResponse.json(
      { error: 'sweep_failed', detail: error.message },
      { status: 500 },
    );
  }

  const list = (expired || []) as Array<{ id: string; user_id: string }>;
  // Audit log
  for (const row of list) {
    await admin.from('subscription_events').insert({
      subscription_id: row.id,
      event_type: 'trial.expired',
      payload: { swept_at: nowIso } as never,
    } as never);
  }

  return NextResponse.json({ ok: true, expired_count: list.length });
}

export async function GET(req: Request) {
  return sweep(req);
}

export async function POST(req: Request) {
  return sweep(req);
}
