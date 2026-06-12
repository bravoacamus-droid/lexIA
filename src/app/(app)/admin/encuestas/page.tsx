import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { SURVEYS, type SurveyDefinition } from '@/lib/surveys/catalog';
import {
  Building2,
  Briefcase,
  GraduationCap,
  ClipboardCheck,
  Clock,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Encuestas' };

const ROLE_VISUAL: Record<
  ProfileRole,
  { icon: typeof Building2; label: string; bg: string; text: string }
> = {
  entity: {
    icon: Building2,
    label: 'Entidades públicas',
    bg: 'bg-brand-100',
    text: 'text-brand-700',
  },
  provider: {
    icon: Briefcase,
    label: 'Proveedores',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  consultant: {
    icon: GraduationCap,
    label: 'Consultores',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
};

export default async function AdminSurveysPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if ((meProfile as { is_admin?: boolean } | null)?.is_admin !== true) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-semibold text-3xl tracking-tight mb-2">
            Solo administradores
          </h1>
        </Card>
      </div>
    );
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Cargamos todas las respuestas y agregamos
  const { data: surveysData } = await admin
    .from('user_surveys')
    .select('user_id, survey_slug, answers, skipped, completed_at, updated_at');

  type Row = {
    user_id: string;
    survey_slug: 'provider' | 'entity' | 'consultant';
    answers: Record<string, unknown>;
    skipped: boolean;
    completed_at: string;
    updated_at: string;
  };
  const rows = (surveysData || []) as Row[];

  // Totales por perfil
  const byRole = {
    provider: rows.filter((r) => r.survey_slug === 'provider'),
    entity: rows.filter((r) => r.survey_slug === 'entity'),
    consultant: rows.filter((r) => r.survey_slug === 'consultant'),
  };

  const totalCompleted = rows.filter(
    (r) => !r.skipped && Object.keys(r.answers || {}).length > 0,
  ).length;
  const totalSkipped = rows.filter((r) => r.skipped).length;

  // Conteo de usuarios totales para tasa de respuesta
  const { count: totalProfiles } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_completed', true);

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Admin · Encuestas
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            Estadísticas de encuestas
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Resultados consolidados por perfil de usuario.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Volver al panel</Link>
        </Button>
      </header>

      {/* Métricas globales */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-3">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Completadas
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums mt-0.5">
            {totalCompleted}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {totalProfiles
              ? `${Math.round((totalCompleted / (totalProfiles || 1)) * 100)}% de los usuarios con onboarding`
              : '—'}
          </p>
        </Card>
        <Card className="p-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-3">
            <Clock className="h-4 w-4" />
          </span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Pospuestas
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums mt-0.5">
            {totalSkipped}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Usuarios que pulsaron "Lo haré más tarde".
          </p>
        </Card>
        <Card className="p-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 mb-3">
            <Building2 className="h-4 w-4" />
          </span>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Usuarios onboardeados
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums mt-0.5">
            {totalProfiles || 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Universo elegible para encuesta.
          </p>
        </Card>
      </div>

      {/* Por perfil */}
      <div className="grid lg:grid-cols-3 gap-5">
        {(Object.keys(SURVEYS) as Array<keyof typeof SURVEYS>).map((role) => {
          const surv = SURVEYS[role] as SurveyDefinition;
          const respondents = byRole[role].filter(
            (r) => !r.skipped && Object.keys(r.answers || {}).length > 0,
          );
          return (
            <RoleSection
              key={role}
              role={role}
              survey={surv}
              respondents={respondents}
            />
          );
        })}
      </div>
    </div>
  );
}

function RoleSection({
  role,
  survey,
  respondents,
}: {
  role: ProfileRole;
  survey: SurveyDefinition;
  respondents: Array<{ answers: Record<string, unknown> }>;
}) {
  const v = ROLE_VISUAL[role];
  const Icon = v.icon;
  const n = respondents.length;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${v.bg} ${v.text} shrink-0`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Segmento {role.toUpperCase()}
          </p>
          <h2 className="font-semibold text-base text-slate-900">{v.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {n} respuesta{n === 1 ? '' : 's'} · {survey.questions.length} preguntas
          </p>
        </div>
      </div>

      {n === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">
          Aún no hay respuestas para este perfil.
        </p>
      ) : (
        <div className="space-y-5">
          {survey.questions
            .filter((q) => q.type === 'single' || q.type === 'multi')
            .slice(0, 6)
            .map((q) => (
              <QuestionStats key={q.id} q={q} respondents={respondents} />
            ))}

          {/* Promedios de ratings */}
          {survey.questions.some((q) => q.type === 'rating') && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-3">
                Promedios de utilidad (1–5)
              </p>
              <div className="space-y-2">
                {survey.questions
                  .filter((q) => q.type === 'rating')
                  .map((q) => {
                    const vals = respondents
                      .map((r) => r.answers[q.id])
                      .filter((v): v is number => typeof v === 'number');
                    const avg =
                      vals.length === 0
                        ? 0
                        : vals.reduce((a, b) => a + b, 0) / vals.length;
                    return (
                      <div key={q.id}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] text-slate-700 truncate flex-1">
                            {q.question.slice(0, 60)}
                            {q.question.length > 60 && '…'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                            {avg.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(avg / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function QuestionStats({
  q,
  respondents,
}: {
  q: SurveyDefinition['questions'][number];
  respondents: Array<{ answers: Record<string, unknown> }>;
}) {
  const counts: Record<string, number> = {};
  for (const r of respondents) {
    const v = r.answers[q.id];
    if (Array.isArray(v)) {
      for (const x of v) {
        const key = String(x);
        counts[key] = (counts[key] || 0) + 1;
      }
    } else if (typeof v === 'string') {
      counts[v] = (counts[v] || 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ordered = (q.options || []).map((o) => ({
    label: o.label,
    value: o.value,
    count: counts[o.value] || 0,
  }));
  const top = ordered.slice().sort((a, b) => b.count - a.count).slice(0, 4);

  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-700 mb-2 leading-snug">
        {q.question}
      </p>
      <div className="space-y-1.5">
        {top.map((o) => {
          const pct = total > 0 ? Math.round((o.count / total) * 100) : 0;
          return (
            <div key={o.value}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-slate-600 truncate flex-1">
                  {o.label}
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {o.count} · {pct}%
                </span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-brand-400 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
