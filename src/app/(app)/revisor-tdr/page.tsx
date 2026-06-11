import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileCheck2, Clock, AlertCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revisor EETT / TDR' };

export default async function RevisorTdrListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;

  if (!isRoleAllowed(userRole, ['entity', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['entity', 'consultant']}
        userRole={userRole}
        moduleName="Revisor EETT / TDR"
        reason="Auditar Términos de Referencia y Especificaciones Técnicas es facultad del área usuaria o un consultor que la asesore."
      />
    );
  }

  const { data: audits } = await supabase
    .from('evaluations')
    .select('id, title, status, created_at, completed_at, result')
    .eq('user_id', user.id)
    .eq('mode', 'tdr_audit')
    .order('created_at', { ascending: false })
    .limit(50);

  type AuditRow = {
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    created_at: string;
    completed_at: string | null;
    result: { stats?: { criticos?: number; altos?: number } } | null;
  };
  const list = (audits || []) as AuditRow[];

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">Revisor EETT / TDR</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Antes de publicar, audita tu Término de Referencia o Especificación Técnica.
            LexIA detecta direccionamiento a marca, ambigüedades, requisitos
            desproporcionados y otros vicios con sustento normativo.
          </p>
        </div>
        <Button asChild size="lg" variant="default">
          <Link href="/revisor-tdr/nuevo">
            <Plus className="h-4 w-4" />
            Nueva auditoría
          </Link>
        </Button>
      </header>

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-4">
            <Search className="h-5 w-5" />
          </span>
          <h2 className="text-xl mb-1 font-semibold">Aún no has auditado documentos</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sube el TDR o EETT antes de publicarlo en SEACE. En minutos sabrás qué
            corregir y dónde está el riesgo.
          </p>
          <Button asChild className="mt-5">
            <Link href="/revisor-tdr/nuevo">
              <Plus className="h-4 w-4" />
              Auditar mi documento
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((au) => (
            <Link key={au.id} href={`/revisor-tdr/${au.id}`}>
              <Card className="p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base truncate">{au.title}</h3>
                      <StatusBadge status={au.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creada {formatRelative(au.created_at)}
                      {au.completed_at && (
                        <> · Completada {formatRelative(au.completed_at)}</>
                      )}
                      {au.status === 'done' && au.result?.stats && (
                        <>
                          {' '}· {au.result.stats.criticos ?? 0} crítico
                          {au.result.stats.criticos === 1 ? '' : 's'} · {au.result.stats.altos ?? 0} alto
                          {au.result.stats.altos === 1 ? '' : 's'}
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
  if (status === 'done')
    return (
      <Badge variant="success">
        <FileCheck2 className="h-3 w-3" />
        Lista
      </Badge>
    );
  if (status === 'processing')
    return (
      <Badge variant="warning">
        <Clock className="h-3 w-3 animate-spin" />
        Analizando
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
    <Badge variant="secondary">
      <Clock className="h-3 w-3" />
      Pendiente
    </Badge>
  );
}
