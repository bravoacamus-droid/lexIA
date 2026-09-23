import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { RelativeTime } from '@/components/ui/relative-time';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Plus, FileCheck2, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revisión de mi oferta' };

export default async function RevisionOfertaListPage() {
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

  if (!isRoleAllowed(userRole, ['provider', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['provider', 'consultant']}
        userRole={userRole}
        moduleName="Auto-revisión de oferta"
        reason="Esta herramienta es para que el postor audite su propia oferta antes de presentarla. Si tú evalúas como entidad, usa el módulo Evaluador."
      />
    );
  }

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('id, title, status, offer_files, created_at, completed_at')
    .eq('user_id', user.id)
    .eq('mode', 'self_review')
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
    <Pagina className="max-w-[1100px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Revisión de mi oferta' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={ShieldCheck}
        familia="evaluar"
        titulo="Revisión de mi oferta"
        bajada="Antes de presentarla, A-LexIA contrasta tu propuesta con las bases del proceso y te dice qué te puede observar el comité y qué puede dejarte fuera."
        aside={
          <NotaDelCompanero icono={HelpCircle} familia="evaluar" className="max-w-[300px]">
            Lo mismo que mirará el comité, pero a tiempo para corregirlo.
          </NotaDelCompanero>
        }
      />

      <div className="flex justify-end">
        <Button asChild size="lg" variant="default">
          <Link href="/revision-oferta/nuevo">
            <Plus className="h-4 w-4" />
            Nueva revisión
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mb-4">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h2 className="text-xl mb-1 font-semibold">Aún no has revisado ninguna oferta</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sube las Bases del proceso y tu oferta. En minutos sabrás qué cubrir y qué
            corregir antes de presentar.
          </p>
          <Button asChild className="mt-5">
            <Link href="/revision-oferta/nuevo">
              <Plus className="h-4 w-4" />
              Auditar mi oferta
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((ev) => (
            <Link key={ev.id} href={`/revision-oferta/${ev.id}`}>
              <Card className="p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base truncate">{ev.title}</h3>
                      <StatusBadge status={ev.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ev.offer_files?.length || 0} oferta(s) · Creada <RelativeTime date={ev.created_at} />
                      {ev.completed_at && (
                        <> · Completada <RelativeTime date={ev.completed_at} /></>
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
