'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Play, Globe2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SourceRow {
  id: string;
  url: string;
  doc_type: string;
  label: string;
  link_selector: string;
  link_filter_regex: string | null;
  active: boolean;
  cadence_days: number;
  last_crawled_at: string | null;
  last_doc_count: number;
  notes: string | null;
}

interface RunRow {
  id: string;
  source_id: string;
  started_at: string;
}

interface Props {
  sources: SourceRow[];
  runs: RunRow[];
}

export function AdminScrapingPanel({ sources }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  async function runOne(source_id: string, label: string) {
    setRunning(source_id);
    try {
      const res = await fetch('/api/scraping/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id, limit_per_source: 15 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      const r = data.runs?.[0];
      if (r) {
        toast.success(
          `${label}: ${r.docs_new}/${r.links_found} nuevos · ${r.docs_embedded} embebidos`,
        );
      } else {
        toast.success(`${label}: corrida completada`);
      }
    } catch (e) {
      toast.error(`${label}: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    setRunningAll(true);
    try {
      const res = await fetch('/api/scraping/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit_per_source: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      const total = (data.runs || []).reduce(
        (acc: number, r: { docs_new?: number }) => acc + (r.docs_new ?? 0),
        0,
      );
      toast.success(`${data.sources_processed} fuentes procesadas · ${total} docs nuevos`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fuentes ({sources.length})
        </h2>
        <Button
          onClick={runAll}
          loading={runningAll}
          disabled={runningAll || sources.length === 0}
          size="sm"
        >
          <Play className="h-3.5 w-3.5" />
          Ejecutar todas
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <AlertCircle className="h-5 w-5 mx-auto mb-2" />
          No hay fuentes configuradas. Inserta filas en{' '}
          <code>scraping_sources</code> para empezar.
        </Card>
      ) : (
        <div className="grid gap-3">
          {sources.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{s.label}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {s.doc_type}
                    </Badge>
                    {!s.active && <Badge variant="secondary">inactiva</Badge>}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline break-all"
                  >
                    {s.url}
                  </a>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                    <span>
                      Cadencia: cada {s.cadence_days} día{s.cadence_days === 1 ? '' : 's'}
                    </span>
                    <span>
                      Último crawl:{' '}
                      {s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString('es-PE') : '—'}
                    </span>
                    <span>Últimos nuevos: {s.last_doc_count}</span>
                  </div>
                  {s.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                      {s.notes}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={running === s.id}
                  disabled={running === s.id || runningAll || !s.active}
                  onClick={() => runOne(s.id, s.label)}
                >
                  {running === s.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Ejecutar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
