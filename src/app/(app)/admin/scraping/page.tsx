import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleGateBlocked } from '@/components/app/role-gate';
import { Lock, AlertCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { AdminScrapingPanel } from '@/components/app/admin/admin-scraping-panel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bot de scraping' };

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
  finished_at: string | null;
  links_found: number | null;
  docs_new: number | null;
  docs_embedded: number | null;
  chunks_inserted: number | null;
  status: string;
  error_message: string | null;
}

export default async function AdminScrapingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;

  if (!isAdmin) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-semibold text-3xl tracking-tight mb-2">
            Solo para administradores
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Esta sección es de mantenimiento de la base normativa. Pide al
            administrador que active <code>is_admin = true</code> en tu perfil
            si necesitas acceso.
          </p>
        </Card>
      </div>
    );
  }

  const [{ data: sources }, { data: recentRuns }] = await Promise.all([
    supabase
      .from('scraping_sources')
      .select('*')
      .order('label', { ascending: true }),
    supabase
      .from('scraping_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20),
  ]);

  const list = (sources || []) as SourceRow[];
  const runs = (recentRuns || []) as RunRow[];

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <header>
        <h1 className="font-semibold text-3xl tracking-tight">
          Bot de scraping de normativa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          El bot visita las URLs oficiales del OECE/OSCE/Tribunal cada semana,
          descarga los PDFs nuevos y los embebe automáticamente en la base
          normativa.
        </p>
      </header>

      <AdminScrapingPanel sources={list} runs={runs} />

      <Card className="p-4 bg-secondary/50 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            El cron semanal corre los domingos a las 03:00 UTC (configurado en{' '}
            <code>vercel.json</code>). Los runs manuales desde este panel
            cuentan dentro del mismo flujo de idempotencia: solo agregan
            documentos nuevos por <code>source_url</code>.
          </p>
        </div>
      </Card>

      {list.length === 0 ? null : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Últimos {runs.length} runs
          </h2>
          <div className="space-y-2">
            {runs.map((r) => {
              const source = list.find((s) => s.id === r.source_id);
              return (
                <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {source?.label || r.source_id}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatRelative(r.started_at)} · {r.links_found ?? 0} links · {r.docs_new ?? 0} nuevos · {r.chunks_inserted ?? 0} chunks
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === 'ok'
                        ? 'success'
                        : r.status === 'running'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {r.status}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
