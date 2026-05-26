import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSearch, Plus, FileCheck2, Clock, AlertCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluador IA' };

export default async function EvaluatorListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('id, title, status, offer_files, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = (evaluations || []) as Array<{
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    offer_files: Array<{ name: string }> | null;
    created_at: string;
    completed_at: string | null;
  }>;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Evaluador IA de Ofertas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compara ofertas contra las Bases del proceso. Identifica observaciones
            subsanables e incumplimientos con sustento normativo.
          </p>
        </div>
        <Button asChild size="lg" variant="default">
          <Link href="/evaluador/nuevo">
            <Plus className="h-4 w-4" />
            Nueva evaluación
          </Link>
        </Button>
      </header>

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mb-4">
            <FileSearch className="h-5 w-5" />
          </span>
          <h2 className="font-serif text-xl mb-1">Aún no tienes evaluaciones</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crea tu primera evaluación subiendo las Bases Integradas y hasta 5 ofertas. LexIA
            analizará cada requisito y entregará una matriz comparativa con sustento normativo.
          </p>
          <Button asChild className="mt-5">
            <Link href="/evaluador/nuevo">
              <Plus className="h-4 w-4" />
              Crear evaluación
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((ev) => (
            <Link key={ev.id} href={`/evaluador/${ev.id}`}>
              <Card className="p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base truncate">{ev.title}</h3>
                      <StatusBadge status={ev.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ev.offer_files?.length || 0} ofertas ·{' '}
                      Creada {formatRelative(ev.created_at)}
                      {ev.completed_at && (
                        <>
                          {' '}· Completada {formatRelative(ev.completed_at)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'done') {
    return (
      <Badge variant="success">
        <FileCheck2 className="h-3 w-3" />
        Completada
      </Badge>
    );
  }
  if (status === 'processing') {
    return (
      <Badge variant="warning">
        <Clock className="h-3 w-3 animate-spin" />
        Procesando
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="danger">
        <AlertCircle className="h-3 w-3" />
        Falló
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3" />
      Pendiente
    </Badge>
  );
}
