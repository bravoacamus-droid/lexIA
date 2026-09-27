import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Mic, Crown, ShieldCheck, Lightbulb, HelpCircle, ScrollText, FileText, ArrowRight } from 'lucide-react';
import { checkFeatureGate } from '@/lib/billing/feature-gate';
import { getCurrentUserWithRole } from '@/lib/auth/session';
import { getTier } from '@/lib/billing/tiers';
import { Companero } from '@/components/marca/companero';
import { HablaConALexia } from '@/components/app/voice/habla-con-alexia';
import { HistorialDeVoz, type LlamadaDelHistorial } from '@/components/app/voice/historial-de-voz';
import { DISCLAIMER_VERSION } from '@/lib/ai/voice-config';
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

  // Una llamada que se cortó sin colgar (se cerró la pestaña, se cayó la
  // red) quedaba «En curso» para siempre en el historial (César,
  // 27/09/2026). Pasadas tres horas ya no puede seguir viva.
  await supabase
    .from('voice_calls')
    .update({ status: 'failed', ended_at: new Date().toISOString() } as never)
    .eq('user_id', ctx.userId)
    .eq('status', 'active')
    .lt('started_at', new Date(Date.now() - 3 * 3600 * 1000).toISOString());

  const [{ data: calls }, gate, { data: consentimiento }] = await Promise.all([
    supabase
      .from('voice_calls')
      .select(
        'id, status, started_at, ended_at, duration_seconds, summary, voice_id, rag_queries_count, user_rating',
      )
      .eq('user_id', ctx.userId)
      .order('started_at', { ascending: false })
      .limit(30),
    checkFeatureGate(ctx.userId, 'voice_call_minute'),
    supabase
      .from('voice_consents')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('disclaimer_version', DISCLAIMER_VERSION)
      .limit(1)
      .maybeSingle(),
  ]);

  const callList = (calls || []) as LlamadaDelHistorial[];

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <HablaConALexia
          disponible={tierIncluyeVoz}
          tieneConsentimiento={!!consentimiento}
          versionAviso={DISCLAIMER_VERSION}
        />
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <header className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" strokeWidth={2} />
              <h3 className="text-[14px] font-bold tracking-tight">Consejos para una mejor consulta</h3>
            </header>
            <ul className="mt-3 space-y-2">
              {CONSEJOS.map((c) => (
                <li key={c.texto} className="flex items-center gap-2.5 rounded-xl bg-secondary/50 px-3 py-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-consultar-50 dark:bg-consultar-900/40">
                    <c.icono className="h-3.5 w-3.5 text-consultar-600 dark:text-consultar-400" strokeWidth={2} />
                  </span>
                  <span className="text-[12.5px] leading-snug">{c.texto}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <header className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-consultar-500" strokeWidth={2} />
              <h3 className="text-[14px] font-bold tracking-tight">Ejemplos que puedes probar</h3>
            </header>
            <ul className="mt-3 space-y-2">
              {EJEMPLOS.map((e) => (
                <li key={e}>
                  {/* Llevan al chat escrito: por voz la pregunta hay que decirla. */}
                  <Link
                    href={`/chat?new=1&q=${encodeURIComponent(e)}`}
                    className="group flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-consultar-300 hover:bg-consultar-50/60 dark:hover:border-consultar-700 dark:hover:bg-consultar-900/20"
                  >
                    <span className="min-w-0 flex-1 text-pretty text-[12.5px] leading-snug">{e}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-consultar-500 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

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

      <HistorialDeVoz llamadas={callList} />

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

const CONSEJOS = [
  { icono: Mic, texto: 'Habla con claridad y a un ritmo natural' },
  { icono: HelpCircle, texto: 'Pídele «paso a paso» si recién empiezas, o «directo» si solo quieres el dato' },
  { icono: ScrollText, texto: 'Responde sobre la Ley N.° 32069 y su Reglamento' },
];

const EJEMPLOS = [
  '¿Cuándo procede una ampliación de plazo?',
  '¿Cómo se calcula la penalidad por mora?',
  '¿Qué requisitos se solicitan para acreditar la experiencia del postor?',
];
