import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, Star, Clock, BookOpen, Crown } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { checkFeatureGate } from '@/lib/billing/feature-gate';
import { getCurrentUserWithRole } from '@/lib/auth/session';
import { getTier } from '@/lib/billing/tiers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hablar con LexIA' };

export default async function LlamadasPage() {
  const supabase = createClient();
  const ctx = await getCurrentUserWithRole();
  if (!ctx) return null;

  const [{ data: calls }, gate] = await Promise.all([
    supabase
      .from('voice_calls')
      .select(
        'id, status, started_at, ended_at, duration_seconds, summary, voice_id, rag_queries_count, user_rating',
      )
      .eq('user_id', ctx.userId)
      .order('started_at', { ascending: false })
      .limit(30),
    checkFeatureGate(ctx.userId, 'voice_call_minute'),
  ]);

  const callList = (calls || []) as Array<{
    id: string;
    status: 'active' | 'completed' | 'failed' | 'deleted';
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    summary: string | null;
    voice_id: string;
    rag_queries_count: number;
    user_rating: number | null;
  }>;

  // Cuota real desde feature gate (incluye bonus si los hay)
  const tier = ctx.subscription?.tier
    ? getTier(ctx.subscription.tier)
    : getTier('free_trial');
  const cuotaTotal = gate.allowed ? gate.limit : 0;
  const cuotaUsada = gate.allowed ? gate.consumed : 0;
  const cuotaRestante = gate.allowed ? gate.remaining : 0;
  const tierIncluyeVoz = isFinite(cuotaTotal) && cuotaTotal > 0;
  const cuotaPercent = isFinite(cuotaTotal) && cuotaTotal > 0
    ? Math.min(100, (cuotaUsada / cuotaTotal) * 100)
    : 0;

  return (
    <div className="container max-w-4xl py-6 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              <Crown className="h-3 w-3" />
              Plan {tier.label}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              INNOVACIÓN LEGAL
            </Badge>
          </div>
          <h1 className="font-semibold text-3xl tracking-tight">
            Hablar con LexIA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Conversa por voz con LexIA y obtén respuestas inmediatas con sustento
            normativo citado al artículo. Como hablar con un abogado, pero 24/7.
          </p>
        </div>
        {tierIncluyeVoz ? (
          <Button asChild size="lg" variant="glow">
            <Link href="/llamadas/nueva">
              <PhoneCall className="h-4 w-4" />
              Iniciar llamada
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">
              <Crown className="h-4 w-4" />
              Actualizar a Pro
            </Link>
          </Button>
        )}
      </header>

      {/* Cuota */}
      {tierIncluyeVoz ? (
        <Card className="p-5 bg-brand-50/40 dark:bg-brand-950/30 border-brand-500/30">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
              Cuota mensual
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {cuotaUsada} de {isFinite(cuotaTotal) ? cuotaTotal : '∞'} min
            </p>
          </div>
          {isFinite(cuotaTotal) && (
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                style={{ width: `${cuotaPercent}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Te quedan{' '}
            {isFinite(cuotaRestante) ? `${cuotaRestante} minutos` : 'minutos ilimitados'} este
            mes. La cuota se renueva el día 1.
          </p>
        </Card>
      ) : (
        <Card className="p-5 bg-amber-50/40 dark:bg-amber-950/30 border-amber-500/30">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Hablar con LexIA no está disponible en tu plan {tier.label}
              </p>
              <p className="text-xs text-amber-900/80 dark:text-amber-100/80 mt-1 leading-relaxed">
                Actualiza a <strong>Pro</strong> para incluir 30 minutos al mes, o a{' '}
                <strong>Enterprise</strong> para 120 minutos al mes.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/pricing">Ver planes</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Historial */}
      {callList.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-4">
            <Phone className="h-6 w-6" />
          </span>
          <h2 className="font-semibold text-xl mb-1">Aún no tienes llamadas</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tu primera conversación por voz con LexIA. Antes de iniciarla, debes
            aceptar el aviso de privacidad (solo la primera vez).
          </p>
          <Button asChild className="mt-5" variant="glow">
            <Link href="/llamadas/nueva">
              <PhoneCall className="h-4 w-4" />
              Iniciar mi primera llamada
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Historial
          </p>
          {callList.map((c) => (
            <CallCard key={c.id} call={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CallCard({
  call,
}: {
  call: {
    id: string;
    status: 'active' | 'completed' | 'failed' | 'deleted';
    started_at: string;
    duration_seconds: number | null;
    summary: string | null;
    rag_queries_count: number;
    user_rating: number | null;
  };
}) {
  const isActive = call.status === 'active';
  const isCompleted = call.status === 'completed';
  return (
    <Link
      href={`/llamadas/${call.id}`}
      className="block rounded-lg border border-border bg-card p-4 hover:border-brand-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
            isActive
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 animate-pulse'
              : isCompleted
                ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
                : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Phone className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                En curso
              </Badge>
            )}
            {isCompleted && call.duration_seconds && (
              <span className="text-xs font-mono text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {formatDuration(call.duration_seconds)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelative(call.started_at)}
            </span>
            {call.rag_queries_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                <BookOpen className="h-3 w-3 inline mr-0.5" />
                {call.rag_queries_count} consultas a normativa
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate">
            {call.summary || (isActive ? 'Llamada activa...' : 'Llamada sin resumen')}
          </p>
        </div>

        {call.user_rating && (
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < (call.user_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
