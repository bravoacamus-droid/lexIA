import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RelativeTime } from '@/components/ui/relative-time';
import { FileText, Plus, FileCheck2, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { Pagina, MigaDePan, EncabezadoDeSeccion, NotaDelCompanero } from '@/components/app/seccion/piezas';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluación de bases' };

export default async function EvaluacionDeBasesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('profile_role').eq('id', user.id).maybeSingle();
  const rol = (profile?.profile_role as ProfileRole | null) || null;

  const { data } = await supabase
    .from('evaluations')
    .select('id, title, status, created_at, completed_at, result')
    .eq('user_id', user.id)
    .eq('mode', 'bases_audit')
    .order('created_at', { ascending: false })
    .limit(50);
  type Fila = {
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    created_at: string;
    completed_at: string | null;
    result: { hallazgos?: Array<{ severidad: string }>; estandar?: { titulo: string } } | null;
  };
  const lista = (data ?? []) as Fila[];

  return (
    <Pagina className="max-w-[1100px]">
      <MigaDePan trozos={[{ label: 'Inicio', href: '/app' }, { label: 'Evaluar', href: '/evaluar' }, { label: 'Evaluación de bases' }]} />

      <EncabezadoDeSeccion
        icono={FileText}
        familia="evaluar"
        titulo="Evaluación de bases"
        bajada={
          rol === 'provider'
            ? 'A-LexIA coteja las bases con la bases estándar del procedimiento y revisa cada capítulo: omisiones, modificaciones indebidas, exigencias no previstas, restricciones injustificadas e inconsistencias. Te dice qué consultar u observar antes de presentarlo en el SEACE.'
            : 'A-LexIA coteja las bases con la bases estándar del procedimiento y revisa cada capítulo: omisiones, modificaciones indebidas, exigencias no previstas, restricciones injustificadas e inconsistencias. Úsala como filtro antes de publicarlas.'
        }
        aside={
          <NotaDelCompanero icono={HelpCircle} familia="evaluar" className="max-w-[300px]">
            La Sección General no puede modificarse en ningún extremo: se coteja texto por texto con el estándar.
          </NotaDelCompanero>
        }
      />

      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href="/evaluar/bases/nuevo">
            <Plus className="h-4 w-4" />
            Evaluar unas bases
          </Link>
        </Button>
      </div>

      {lista.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <FileText className="h-5 w-5" />
          </span>
          <h2 className="mb-1 text-xl font-semibold">Aún no has evaluado ninguna base</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Sube las bases del procedimiento en PDF o Word. En un par de minutos sabrás qué difiere del
            estándar y qué conviene consultar, observar o corregir.
          </p>
          <Button asChild className="mt-5">
            <Link href="/evaluar/bases/nuevo">
              <Plus className="h-4 w-4" />
              Evaluar mis bases
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => {
            const h = e.result?.hallazgos ?? [];
            const criticos = h.filter((x) => x.severidad === 'critico').length;
            return (
              <Link key={e.id} href={`/evaluar/bases/${e.id}`}>
                <Card className="p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{e.title}</h3>
                    <Estado status={e.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Creada <RelativeTime date={e.created_at} />
                    {e.status === 'done' && e.result?.estandar && (
                      <>
                        {' '}· {e.result.estandar.titulo} · {h.length} {h.length === 1 ? 'hallazgo' : 'hallazgos'}
                        {criticos ? ` (${criticos} ${criticos === 1 ? 'crítico' : 'críticos'})` : ''}
                      </>
                    )}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}

function Estado({ status }: { status: string }) {
  if (status === 'done')
    return (
      <Badge variant="success">
        <FileCheck2 className="h-3 w-3" />
        Lista
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge variant="danger">
        <AlertCircle className="h-3 w-3" />
        Falló
      </Badge>
    );
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" />
      Evaluando
    </Badge>
  );
}
