'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Coins, Zap, Gauge, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageData {
  document: {
    id: string;
    document_type: string;
    title: string;
    created_at: string;
  };
  summary: {
    calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
    cost_pen: number;
    latency_ms: number;
    models_used: Array<{
      model: string;
      provider: string;
      inputPerMillionUsd: number;
      outputPerMillionUsd: number;
    }>;
  };
  calls: Array<{
    id: string;
    feature: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    latency_ms: number | null;
    status: string;
    created_at: string;
  }>;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  documentId: string;
  /** Si true, se refresca automáticamente cada 5s (útil cuando recién se generó). */
  pollWhileEmpty?: boolean;
  className?: string;
}

export function DocumentUsageCard({
  documentId,
  pollWhileEmpty = false,
  className,
}: Props) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/generated-documents/${documentId}/usage`);
      if (res.ok) {
        const json = (await res.json()) as UsageData;
        setData(json);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [documentId]);

  useEffect(() => {
    if (!pollWhileEmpty) return;
    if (!data) return;
    if (data.summary.calls > 0) return;
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [pollWhileEmpty, data]);

  if (loading && !data) {
    return (
      <Card className={cn('p-5 bg-secondary/40', className)}>
        <div className="h-3 w-32 bg-secondary rounded mb-3 animate-pulse-soft" />
        <div className="h-6 w-44 bg-secondary rounded animate-pulse-soft" />
      </Card>
    );
  }
  if (!data || data.summary.calls === 0) {
    return (
      <Card className={cn('p-5 bg-secondary/40', className)}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Consumo de IA
          </p>
          <button
            type="button"
            onClick={() => load(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refrescar"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sin registros de consumo aún. Se contabilizan al generar el documento.
        </p>
      </Card>
    );
  }

  const { summary, calls } = data;
  const costPerToken =
    summary.total_tokens > 0
      ? (summary.cost_usd / summary.total_tokens) * 1000
      : 0; // $ por mil tokens

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-brand-600" />
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Consumo de IA en este documento
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refrescar"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI
          icon={Coins}
          label="Costo"
          value={`$${summary.cost_usd.toFixed(5)}`}
          sub={`≈ S/ ${summary.cost_pen.toFixed(4)}`}
          accent="amber"
        />
        <KPI
          icon={Zap}
          label="Tokens"
          value={formatTokens(summary.total_tokens)}
          sub={`${formatTokens(summary.input_tokens)} in · ${formatTokens(summary.output_tokens)} out`}
          accent="brand"
        />
        <KPI
          icon={Gauge}
          label="Latencia"
          value={`${Math.round(summary.latency_ms / 1000)}s`}
          sub={`${summary.calls} llamada${summary.calls === 1 ? '' : 's'} al modelo`}
          accent="emerald"
        />
        <KPI
          icon={Bot}
          label="Costo / 1K tokens"
          value={`$${costPerToken.toFixed(5)}`}
          sub={summary.models_used[0]?.model || ''}
          accent="sky"
        />
      </div>

      {/* Modelos usados */}
      {summary.models_used.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Modelo:
          </span>
          {summary.models_used.map((m) => (
            <Badge key={m.model} variant="outline" className="text-[10px]">
              {m.model}
              <span className="ml-1 text-muted-foreground">
                · ${m.inputPerMillionUsd}/M in · ${m.outputPerMillionUsd}/M out
              </span>
            </Badge>
          ))}
        </div>
      )}

      {/* Desglose detalle (collapsible visual) */}
      {calls.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Desglose por llamada ({calls.length})
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <th className="text-left p-2">Etapa</th>
                  <th className="text-right p-2">Tokens in</th>
                  <th className="text-right p-2">Tokens out</th>
                  <th className="text-right p-2">Costo</th>
                  <th className="text-right p-2">Latencia</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="p-2">
                      <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                        {c.feature}
                      </code>
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {formatTokens(c.input_tokens)}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {formatTokens(c.output_tokens)}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums font-semibold">
                      ${c.cost_usd.toFixed(5)}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">
                      {c.latency_ms ? `${c.latency_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}

function KPI({
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
    <div className="rounded-lg border border-border bg-card p-3">
      <span
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md mb-2',
          accents[accent],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
    </div>
  );
}
