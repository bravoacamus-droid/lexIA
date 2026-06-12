import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { SURVEY_REWARDS, getSurveyForRole } from '@/lib/surveys/catalog';
import { grantBonus } from '@/lib/billing/bonus';
import type { ProfileRole } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * GET /api/surveys — devuelve estado del usuario:
 *   { profile_role, status, survey, row }
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  const role =
    (profile as { profile_role?: ProfileRole } | null)?.profile_role ?? null;
  const onboarded =
    (profile as { onboarding_completed?: boolean } | null)
      ?.onboarding_completed === true;

  const { data: row } = await supabase
    .from('user_surveys')
    .select(
      'survey_slug, answers, skipped, completed_at, updated_at, reward_granted',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const answersObj =
    ((row as { answers?: Record<string, unknown> } | null)?.answers ?? {}) || {};
  const isSkipped = (row as { skipped?: boolean } | null)?.skipped === true;
  const status: 'pending' | 'completed' =
    row && !isSkipped && Object.keys(answersObj).length > 0
      ? 'completed'
      : 'pending';

  return NextResponse.json({
    profile_role: role,
    onboarding_completed: onboarded,
    status,
    survey: role ? getSurveyForRole(role) : null,
    row,
  });
}

/**
 * POST /api/surveys — guarda respuestas y otorga bonus.
 * Body: { answers: Record<string, string | string[] | number> }
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { profile_role?: ProfileRole } | null)?.profile_role;
  if (!role) {
    return NextResponse.json(
      {
        error: 'no_profile_role',
        message: 'Completa el onboarding antes de la encuesta.',
      },
      { status: 400 },
    );
  }

  let body: { answers?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const answers = body.answers || {};
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    return NextResponse.json({ error: 'invalid_answers' }, { status: 400 });
  }

  const survey = getSurveyForRole(role);
  const missing = survey.questions
    .filter((q) => q.required && !answers[q.id])
    .map((q) => q.id);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'missing_required', detail: missing },
      { status: 400 },
    );
  }

  const ad = admin();

  // Idempotencia del reward
  const { data: prior } = await ad
    .from('user_surveys')
    .select('reward_granted')
    .eq('user_id', user.id)
    .maybeSingle();
  const priorGranted =
    (prior as { reward_granted?: boolean } | null)?.reward_granted === true;

  const { error: upErr } = await ad.from('user_surveys').upsert(
    {
      user_id: user.id,
      survey_slug: survey.slug,
      answers,
      skipped: false,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reward_granted: true,
    } as never,
    { onConflict: 'user_id' },
  );
  if (upErr) {
    return NextResponse.json(
      { error: 'insert_failed', detail: upErr.message },
      { status: 500 },
    );
  }

  let granted: { generator_call: number; evaluation_run: number } = {
    generator_call: 0,
    evaluation_run: 0,
  };

  if (!priorGranted) {
    await grantBonus({
      userId: user.id,
      feature: 'generator_call',
      amount: SURVEY_REWARDS.generator_call,
      source: 'survey_completed',
      reason: `+${SURVEY_REWARDS.generator_call} generaciones por completar la encuesta.`,
    });
    await grantBonus({
      userId: user.id,
      feature: 'evaluation_run',
      amount: SURVEY_REWARDS.evaluation_run,
      source: 'survey_completed',
      reason: `+${SURVEY_REWARDS.evaluation_run} evaluaciones por completar la encuesta.`,
    });
    granted = { ...SURVEY_REWARDS };
  }

  return NextResponse.json({
    ok: true,
    reward_granted: !priorGranted,
    granted,
  });
}

/** PATCH /api/surveys — "lo haré más tarde". No otorga reward. */
export async function PATCH() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { profile_role?: ProfileRole } | null)?.profile_role;
  if (!role)
    return NextResponse.json({ error: 'no_profile_role' }, { status: 400 });

  const ad = admin();
  await ad.from('user_surveys').upsert(
    {
      user_id: user.id,
      survey_slug: role,
      answers: {},
      skipped: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'user_id' },
  );

  return NextResponse.json({ ok: true, skipped: true });
}
