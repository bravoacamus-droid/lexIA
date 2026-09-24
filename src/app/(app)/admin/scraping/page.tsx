import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { RelativeTime } from '@/components/ui/relative-time';
import { RoleGateBlocked } from '@/components/app/role-gate';
import { Lock, AlertCircle } from 'lucide-react';
import { AdminScrapingPanel } from '@/components/app/admin/admin-scraping-panel';
import { EstadoCorrida, SaludActualizador } from '@/components/app/admin/salud-actualizador';
import { saludDelActualizador } from '@/lib/scraping/salud';

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
  docs_existentes: number | null;
  docs_fallidos: number | null;
  docs_en_espera: number | null;
  docs_omitidos: number | null;
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

  const [{ data: sources }, { data: recentRuns }, salud] = await Promise.all([
    supabase
      .from('scraping_sources')
      .select('*')
      .order('label', { ascending: true }),
    supabase
      .from('scraping_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20),
    saludDelActualizador(supabase),
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
          Cada día visita las colecciones oficiales del OECE en gob.pe
          (resoluciones del Tribunal, opiniones, pronunciamientos y
          directivas), trae lo publicado desde la fecha de corte y lo guarda
          normalizado en la biblioteca, igual que la carga manual.
        </p>
      </header>

      <SaludActualizador s={salud} />

      <AdminScrapingPanel sources={list} runs={runs} />

      <Card className="p-4 bg-secondary/50 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            El cron corre cada día a las 08:00 UTC (03:00 en Lima), configurado en{' '}
            <code>vercel.json</code>. Cada corrida tiene un tope de tiempo, no se
            superpone con otra y no repite lo que ya está en la biblioteca. Lo que
            falla se reintenta al día siguiente, a los tres días y a la semana; si
            el mismo error se repite en cinco documentos seguidos, la corrida se
            detiene y queda marcada como fallida.
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
                      <RelativeTime date={r.started_at} /> · {r.links_found ?? 0} enlaces · {r.docs_new ?? 0} nuevos · {r.docs_existentes ?? 0} ya estaban · {r.docs_fallidos ?? 0} con error · {r.docs_en_espera ?? 0} en espera · {r.docs_omitidos ?? 0} anteriores al corte · {r.chunks_inserted ?? 0} fragmentos
                    </p>
                    {r.error_message && <p className="mt-1 text-[11.5px] text-red-700 dark:text-red-300">{r.error_message}</p>}
                  </div>
                  <EstadoCorrida status={r.status} />
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
