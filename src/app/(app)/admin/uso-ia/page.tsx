import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Bot,
  Coins,
  Zap,
  Gauge,
  Lock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { MODEL_PRICING } from '@/lib/ai/usage-log';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Uso de IA' };

interface UsageRow {
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_micros: number;
  latency_ms: number | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

function microsToUsd(m: number): string {
  return `$${(m / 1_000_000).toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default async function AdminAiUsagePage() {
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

  // Ventana de 30 días
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [allRes, recentRes, topUsersRes] = await Promise.all([
    admin
      .from('ai_usage_log')
      .select('feature, model, input_tokens, output_tokens, total_tokens, cost_micros, latency_ms, status, created_at, user_id')
      .gte('created_at', since),
    admin
      .from('ai_usage_log')
      .select('id, feature, model, input_tokens, output_tokens, total_tokens, cost_micros, latency_ms, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('ai_usage_log')
      .select('user_id, cost_micros, total_tokens')
      .gte('created_at', since),
  ]);

  const all = (allRes.data || []) as UsageRow[];
  const recent = (recentRes.data || []) as Array<UsageRow & { id: string }>;
  const topUsersRows = (topUsersRes.data || []) as Array<{
    user_id: string | null;
    cost_micros: number;
    total_tokens: number;
  }>;

  // Agregaciones
  const totalCalls = all.length;
  const totalInput = all.reduce((s, r) => s + (r.input_tokens || 0), 0);
  const totalOutput = all.reduce((s, r) => s + (r.output_tokens || 0), 0);
  const totalCostMicros = all.reduce((s, r) => s + (r.cost_micros || 0), 0);
  const avgLatency =
    all.length === 0
      ? 0
      : Math.round(
          all
            .map((r) => r.latency_ms || 0)
            .filter((n) => n > 0)
            .reduce((a, b) => a + b, 0) /
            Math.max(1, all.filter((r) => (r.latency_ms || 0) > 0).length),
        );

  // Por modelo
  type AggModel = {
    model: string;
    calls: number;
    input: number;
    output: number;
    cost: number;
  };
  const byModelMap = new Map<string, AggModel>();
  for (const r of all) {
    const e =
      byModelMap.get(r.model) || {
        model: r.model,
        calls: 0,
        input: 0,
        output: 0,
        cost: 0,
      };
    e.calls++;
    e.input += r.input_tokens || 0;
    e.output += r.output_tokens || 0;
    e.cost += r.cost_micros || 0;
    byModelMap.set(r.model, e);
  }
  const byModel = Array.from(byModelMap.values()).sort((a, b) => b.cost - a.cost);

  // Por feature
  type AggFeature = {
    feature: string;
    calls: number;
    input: number;
    output: number;
    cost: number;
  };
  const byFeatureMap = new Map<string, AggFeature>();
  for (const r of all) {
    const e =
      byFeatureMap.get(r.feature) || {
        feature: r.feature,
        calls: 0,
        input: 0,
        output: 0,
        cost: 0,
      };
    e.calls++;
    e.input += r.input_tokens || 0;
    e.output += r.output_tokens || 0;
    e.cost += r.cost_micros || 0;
    byFeatureMap.set(r.feature, e);
  }
  const byFeature = Array.from(byFeatureMap.values()).sort(
    (a, b) => b.cost - a.cost,
  );

  // Top users (correlacionar emails)
  const topUsersMap = new Map<string, { cost: number; tokens: number }>();
  for (const r of topUsersRows) {
    if (!r.user_id) continue;
    const e = topUsersMap.get(r.user_id) || { cost: 0, tokens: 0 };
    e.cost += r.cost_micros || 0;
    e.tokens += r.total_tokens || 0;
    topUsersMap.set(r.user_id, e);
  }
  const topUsersList = Array.from(topUsersMap.entries())
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 8);
  const emailsMap = new Map<string, string>();
  if (topUsersList.length > 0) {
    const { data: pa } = await admin
      .from('profiles')
      .select('id, full_name')
      .in(
        'id',
        topUsersList.map((u) => u[0]),
      );
    for (const p of (pa || []) as Array<{ id: string; full_name: string | null }>) {
      if (p.full_name) emailsMap.set(p.id, p.full_name);
    }
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Admin · Uso de IA
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            Gasto de tokens y modelos
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-3xl">
            Bitácora de consumo de IA por feature, modelo y usuario. Ventana de
            últimos 30 días. Datos en vivo desde <code>ai_usage_log</code>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Volver al panel</Link>
        </Button>
      </header>

      {/* Métricas globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          icon={Bot}
          label="Llamadas a IA"
          value={totalCalls.toLocaleString('es-PE')}
          sub="últimos 30 días"
          accent="brand"
        />
        <Stat
          icon={Coins}
          label="Costo estimado"
          value={microsToUsd(totalCostMicros)}
          sub="USD acumulado"
          accent="amber"
        />
        <Stat
          icon={Zap}
          label="Tokens totales"
          value={formatTokens(totalInput + totalOutput)}
          sub={`${formatTokens(totalInput)} in + ${formatTokens(totalOutput)} out`}
          accent="sky"
        />
        <Stat
          icon={Gauge}
          label="Latencia promedio"
          value={`${avgLatency} ms`}
          sub="todas las features"
          accent="emerald"
        />
      </div>

      {/* Por modelo */}
      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Por modelo
        </h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <Th>Modelo</Th>
                  <Th>Proveedor</Th>
                  <Th align="right">Llamadas</Th>
                  <Th align="right">Tokens in</Th>
                  <Th align="right">Tokens out</Th>
                  <Th align="right">Costo USD</Th>
                  <Th align="right">Costo/llamada</Th>
                </tr>
              </thead>
              <tbody>
                {byModel.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-slate-500">
                      Sin datos en los últimos 30 días.
                    </td>
                  </tr>
                )}
                {byModel.map((m) => {
                  const p = MODEL_PRICING[m.model];
                  return (
                    <tr key={m.model} className="border-b border-slate-200 last:border-0">
                      <td className="p-3">
                        <span className="font-mono text-xs font-semibold">
                          {m.model}
                        </span>
                        {p && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            ${p.inputPerMillion}/M in · ${p.outputPerMillion}/M out
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {p?.provider || 'google'}
                        </Badge>
                      </td>
                      <Td align="right">{m.calls.toLocaleString('es-PE')}</Td>
                      <Td align="right">{formatTokens(m.input)}</Td>
                      <Td align="right">{formatTokens(m.output)}</Td>
                      <Td align="right" mono>
                        {microsToUsd(m.cost)}
                      </Td>
                      <Td align="right" mono>
                        {microsToUsd(m.calls > 0 ? m.cost / m.calls : 0)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Por feature */}
      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Por feature / acción
        </h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <Th>Feature</Th>
                  <Th align="right">Llamadas</Th>
                  <Th align="right">Tokens totales</Th>
                  <Th align="right">Costo USD</Th>
                  <Th align="right">Costo/acción</Th>
                  <Th align="right">% del total</Th>
                </tr>
              </thead>
              <tbody>
                {byFeature.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-slate-500">
                      Sin datos.
                    </td>
                  </tr>
                )}
                {byFeature.map((f) => {
                  const pct =
                    totalCostMicros > 0
                      ? Math.round((f.cost / totalCostMicros) * 100)
                      : 0;
                  return (
                    <tr key={f.feature} className="border-b border-slate-200 last:border-0">
                      <Td>
                        <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {f.feature}
                        </code>
                      </Td>
                      <Td align="right">{f.calls.toLocaleString('es-PE')}</Td>
                      <Td align="right">{formatTokens(f.input + f.output)}</Td>
                      <Td align="right" mono>
                        {microsToUsd(f.cost)}
                      </Td>
                      <Td align="right" mono>
                        {microsToUsd(f.calls > 0 ? f.cost / f.calls : 0)}
                      </Td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-mono text-xs text-slate-700 tabular-nums">
                            {pct}%
                          </span>
                          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top usuarios */}
        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Top usuarios por gasto (30 días)
          </h2>
          <Card className="p-5">
            {topUsersList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topUsersList.map(([uid, agg], i) => {
                  const name = emailsMap.get(uid) || uid.slice(0, 8);
                  const pct = totalCostMicros > 0 ? (agg.cost / totalCostMicros) * 100 : 0;
                  return (
                    <div key={uid}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-xs text-slate-700 truncate flex-1">
                          <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                            #{i + 1}
                          </span>
                          {name}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-900 shrink-0">
                          {microsToUsd(agg.cost)}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Últimas llamadas */}
        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Últimas llamadas (live feed)
          </h2>
          <Card className="overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-2.5">
                        <p className="font-mono text-[10px] text-slate-500">
                          {new Date(r.created_at).toLocaleTimeString('es-PE')}
                        </p>
                      </td>
                      <td className="p-2.5">
                        <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.feature}
                        </code>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-700">
                        {formatTokens(r.total_tokens || 0)}t
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-900 font-semibold text-right">
                        {microsToUsd(r.cost_micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>

      <Card className="p-4 bg-slate-50 text-xs text-slate-600 leading-relaxed">
        <p className="mb-1.5">
          <TrendingUp className="h-3.5 w-3.5 inline -mt-0.5 mr-1 text-brand-600" />
          <span className="font-semibold text-slate-900">Modelos en uso:</span>{' '}
          <code className="text-[10px]">gemini-flash-latest</code> (chat + generadores), {' '}
          <code className="text-[10px]">gemini-flash-lite-latest</code> (titulación rápida),{' '}
          <code className="text-[10px]">gemini-embedding-001</code> /{' '}
          <code className="text-[10px]">voyage-3</code> (embeddings RAG).
        </p>
        <p>
          Tabla de precios en <code className="text-[10px]">src/lib/ai/usage-log.ts</code>{' '}
          — actualízala cuando Google revise tarifas.{' '}
          <Link
            href="https://ai.google.dev/pricing"
            target="_blank"
            className="text-brand-600 inline-flex items-center gap-0.5 hover:underline"
          >
            Ver pricing oficial
            <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </p>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  sub: string;
  accent: 'brand' | 'amber' | 'sky' | 'emerald';
}) {
  const accents = {
    brand: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  } as const;
  return (
    <Card className="p-5">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accents[accent]} mb-3`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold tabular-nums mt-0.5">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={`p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children: React.ReactNode;
  align?: 'right';
  mono?: boolean;
}) {
  return (
    <td
      className={`p-3 ${align === 'right' ? 'text-right' : 'text-left'} ${
        mono ? 'font-mono text-xs tabular-nums' : ''
      }`}
    >
      {children}
    </td>
  );
}
