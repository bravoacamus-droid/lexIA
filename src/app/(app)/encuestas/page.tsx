import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSurveyForRole, SURVEY_REWARDS } from '@/lib/surveys/catalog';
import { SurveyView } from './survey-view';
import type { ProfileRole } from '@/lib/auth/session';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardList, Gift, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Encuestas' };

export default async function EncuestasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const role =
    (profile as { profile_role?: ProfileRole } | null)?.profile_role || null;

  if (!role) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
            <ClipboardList className="h-5 w-5" />
          </span>
          <h1 className="font-semibold text-3xl tracking-tight mb-2">
            Completa tu onboarding
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
            Para acceder a la encuesta de tu perfil, primero termina el
            onboarding eligiendo tu tipo de cuenta.
          </p>
          <Button asChild>
            <Link href="/onboarding">Ir al onboarding</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: row } = await supabase
    .from('user_surveys')
    .select(
      'survey_slug, answers, skipped, completed_at, updated_at, reward_granted',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const survey = getSurveyForRole(role);
  const answersObj =
    ((row as { answers?: Record<string, unknown> } | null)?.answers ?? {}) || {};
  const completed =
    row &&
    !(row as { skipped?: boolean }).skipped &&
    Object.keys(answersObj).length > 0;
  const rewardGranted =
    (row as { reward_granted?: boolean } | null)?.reward_granted === true;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Encuestas
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            {survey.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {survey.subtitle}
          </p>
        </div>
      </header>

      {/* Estado actual */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              completed
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {completed ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <Gift className="h-5 w-5" />
            )}
          </span>
          <div className="flex-1">
            {completed ? (
              <>
                <p className="font-semibold text-base text-slate-900">
                  Encuesta completada
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Última respuesta el{' '}
                  {new Date(
                    (row as { updated_at: string }).updated_at,
                  ).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  . {rewardGranted && 'Ya recibiste los créditos extra este mes.'}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Si quieres, puedes actualizarla — pero los créditos solo se
                  otorgan una vez por usuario.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-base text-slate-900">
                  Tu encuesta está pendiente
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Tómate {survey.estimatedMinutes} minutos para responderla.
                  Recibirás{' '}
                  <strong className="font-semibold text-slate-900">
                    +{SURVEY_REWARDS.generator_call} generaciones
                  </strong>{' '}
                  y{' '}
                  <strong className="font-semibold text-slate-900">
                    +{SURVEY_REWARDS.evaluation_run} evaluaciones
                  </strong>{' '}
                  gratis este mes.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Wizard inline */}
      <Card className="p-0 overflow-hidden">
        <SurveyView
          survey={survey}
          initialAnswers={answersObj as Record<string, string | string[] | number>}
        />
      </Card>
    </div>
  );
}
