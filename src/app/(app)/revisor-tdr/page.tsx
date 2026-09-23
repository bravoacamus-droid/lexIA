import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { RelativeTime } from '@/components/ui/relative-time';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanSearch, Plus, FileCheck2, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluación de requerimiento' };

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
        moduleName="La evaluación de requerimiento"
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
    <Pagina className="max-w-[1100px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Evaluación de requerimiento' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={ScanSearch}
        familia="evaluar"
        titulo="Evaluación de requerimiento"
        bajada="A-LexIA revisa el contenido del requerimiento de bienes, servicios, consultoría de obras y ejecución de obras, tanto para procedimientos de selección como para contratos menores: detecta direccionamiento a marca, ambigüedades, requisitos desproporcionados y otros vicios, con su sustento."
        aside={
          <NotaDelCompanero icono={HelpCircle} familia="evaluar" className="max-w-[300px]">
            Súbelo antes de publicarlo en el SEACE y sabrás qué corregir y dónde está el riesgo.
          </NotaDelCompanero>
        }
      />

      <div className="flex justify-end">
        <Button asChild size="lg" variant="default">
          <Link href="/revisor-tdr/nuevo">
            <Plus className="h-4 w-4" />
            Evaluar un requerimiento
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-4">
            <ScanSearch className="h-5 w-5" />
          </span>
          <h2 className="text-xl mb-1 font-semibold">Aún no has evaluado ningún requerimiento</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sube el TDR o EETT antes de publicarlo en SEACE. En minutos sabrás qué
            corregir y dónde está el riesgo.
          </p>
          <Button asChild className="mt-5">
            <Link href="/revisor-tdr/nuevo">
              <Plus className="h-4 w-4" />
              Evaluar mi requerimiento
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
                      Creada <RelativeTime date={au.created_at} />
                      {au.completed_at && (
                        <> · Completada <RelativeTime date={au.completed_at} /></>
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
    </Pagina>
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
