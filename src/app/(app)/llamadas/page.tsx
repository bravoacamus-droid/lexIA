import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { RelativeTime } from '@/components/ui/relative-time';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mic, Star, Clock, BookOpen, Crown, ShieldCheck } from 'lucide-react';
import { checkFeatureGate } from '@/lib/billing/feature-gate';
import { getCurrentUserWithRole } from '@/lib/auth/session';
import { getTier } from '@/lib/billing/tiers';
import { Companero } from '@/components/marca/companero';
import { PortadaDeVoz } from '@/components/app/voice/portada-de-voz';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Habla con A-LexIA' };

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
    <Pagina className="max-w-[1200px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Consultar', href: '/consultar' },
          { label: 'Habla con A-LexIA' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={Mic}
        familia="consultar"
        titulo="Habla con A-LexIA"
        bajada="Realiza tu consulta por voz y recibe una respuesta clara, con sustento normativo."
        aside={
          <div className="flex items-end justify-end gap-3">
            <div className="hidden flex-col items-end gap-2 sm:flex">
              <p className="max-w-[175px] text-right font-serif text-[15px] italic leading-snug text-consultar-600 dark:text-consultar-400">
                Tu voz también encuentra respuestas
              </p>
              <NotaDelCompanero
                icono={ShieldCheck}
                familia="consultar"
                className="max-w-[215px]"
              >
                Misma confianza, ahora también por voz.
              </NotaDelCompanero>
            </div>
            <Companero
              pose="senala"
              estado="hablando"
              alto={128}
              className="hidden xl:inline-flex"
            />
          </div>
        }
      />

      <PortadaDeVoz disponible={tierIncluyeVoz} />

      {/* La cuota de minutos — es el dato que decide si se puede llamar. */}
      {tierIncluyeVoz ? (
        <Card className="border-consultar-500/30 bg-consultar-50/50 p-4 dark:bg-consultar-900/20">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-consultar-700 dark:text-consultar-400">
              Cuota mensual · Plan {tier.label}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {cuotaUsada} de {isFinite(cuotaTotal) ? cuotaTotal : '∞'} min
            </p>
          </div>
          {isFinite(cuotaTotal) && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-consultar-500 to-consultar-400 transition-all"
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
        <Card className="border-amber-500/30 bg-amber-50/40 p-4 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Hablar con A-LexIA no está disponible en tu plan {tier.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                Actualiza a <strong>Pro</strong> para incluir 30 minutos al mes, o a{' '}
                <strong>Enterprise</strong> para 120 minutos al mes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {callList.length > 0 && (
        <section className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tus consultas por voz
          </p>
          {callList.map((c) => (
            <CallCard key={c.id} call={c} />
          ))}
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-consultar-100 bg-consultar-50/60 px-4 py-3.5 dark:border-consultar-900/60 dark:bg-consultar-900/20">
        <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-consultar-600 dark:text-consultar-400" />
        <p className="text-[13px] leading-relaxed text-foreground/85">
          <span className="font-semibold">Tu consulta se procesa de forma segura. </span>
          A-LexIA puede cometer errores. Verifica la información relevante en las fuentes citadas.
        </p>
      </div>
    </Pagina>
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
              <RelativeTime date={call.started_at} />
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
