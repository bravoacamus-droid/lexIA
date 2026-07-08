import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, ArrowRight, Building2 } from 'lucide-react';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { OBJETO_LABELS } from '@/lib/requerimientos/catalog';
import { SUBTIPO_META, type SubtipoRequerimiento } from '@/lib/requerimientos/subtipos';
import { formatRelative } from '@/lib/utils';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Requerimientos' };

export default async function RequerimientosListPage() {
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
        moduleName="El módulo Requerimiento (Anexo SEACE)"
        reason="Esta herramienta es para que el Área Usuaria de una Entidad redacte el requerimiento (EETT/TDR) con la estructura oficial del SEACE."
      />
    );
  }

  const { data } = await supabase
    .from('entity_requirements')
    .select(
      'id, nro, anio, objeto, subtipo, area_usuaria, denominacion, status, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  const items = (data || []) as Array<{
    id: string;
    nro: string | null;
    anio: number;
    objeto: 'bien' | 'servicio' | 'obra' | 'consultoria_obra';
    subtipo: SubtipoRequerimiento | null;
    area_usuaria: string | null;
    denominacion: string;
    status: 'draft' | 'review' | 'final' | 'archived';
    created_at: string;
    updated_at: string;
  }>;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Área Usuaria
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            Requerimiento (Anexo SEACE)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Estructura oficial tipo SEACE con cláusulas reordenables. Pega
            tu texto o deja que LexIA lo profesionalice con sustento
            normativo de la Ley 32069.
          </p>
        </div>
        <Button asChild size="lg" variant="glow">
          <Link href="/generador/requerimiento/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo requerimiento
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 mb-4">
            <ClipboardList className="h-5 w-5" />
          </span>
          <h2 className="font-semibold text-xl mb-1">
            Aún no has creado requerimientos
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Comienza con un nuevo requerimiento eligiendo el objeto contractual
            (Bien, Servicio, Obra o Consultoría) y la denominación.
          </p>
          <Button asChild>
            <Link href="/generador/requerimiento/nuevo">
              <Plus className="h-4 w-4" />
              Crear primer requerimiento
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Link key={r.id} href={`/generador/requerimiento/${r.id}`}>
              <Card className="p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-100 text-brand-700 shrink-0">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {r.subtipo
                            ? SUBTIPO_META[r.subtipo].label
                            : OBJETO_LABELS[r.objeto]}
                        </Badge>
                        {r.area_usuaria && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            · {r.area_usuaria}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-base truncate">
                        {r.denominacion}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Actualizado {formatRelative(r.updated_at)} · Año {r.anio}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        r.status === 'final'
                          ? 'success'
                          : r.status === 'review'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {r.status === 'final'
                        ? 'Final'
                        : r.status === 'review'
                          ? 'Revisión'
                          : r.status === 'archived'
                            ? 'Archivado'
                            : 'Borrador'}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
