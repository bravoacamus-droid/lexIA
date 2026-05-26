import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilePen, Plus, FileText } from 'lucide-react';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generador' };

const TYPE_LABELS: Record<string, string> = {
  ampliacion_plazo: 'Solicitud de ampliación de plazo',
};

export default async function GeneradorListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('generated_documents')
    .select('id, document_type, title, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const docs = (data || []) as Array<{
    id: string;
    document_type: string;
    title: string;
    status: 'draft' | 'final';
    created_at: string;
  }>;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Generador de Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Redacta solicitudes, descargos e informes formales con sustento normativo. La IA
            arma la estructura; tú la editas y exportas a Word.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/generador/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo documento
          </Link>
        </Button>
      </header>

      {docs.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-4">
            <FilePen className="h-5 w-5" />
          </span>
          <h2 className="font-serif text-xl mb-1">Aún no has generado documentos</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Comienza redactando una solicitud de ampliación de plazo. Pronto agregaremos más
            tipos: descargos por penalidades, cambio de personal clave y más.
          </p>
          <Button asChild className="mt-5">
            <Link href="/generador/nuevo">
              <Plus className="h-4 w-4" />
              Generar primer documento
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Link key={d.id} href={`/generador/${d.id}`}>
              <Card className="p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {TYPE_LABELS[d.document_type] || d.document_type}
                      </p>
                      <h3 className="font-semibold text-base truncate">{d.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Creado {formatRelative(d.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={d.status === 'final' ? 'success' : 'secondary'}>
                    {d.status === 'final' ? 'Final' : 'Borrador'}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
