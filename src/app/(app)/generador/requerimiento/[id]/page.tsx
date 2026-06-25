import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import {
  RequirementView,
  type RequirementInitial,
} from '@/components/app/requerimiento/requirement-view';
import {
  getInitialClauses,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function RequerimientoPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
        moduleName="Edición de requerimiento"
        reason="Esta herramienta es para el Área Usuaria de la Entidad."
      />
    );
  }

  const { data } = await supabase
    .from('entity_requirements')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();

  const row = data as {
    id: string;
    user_id: string;
    nro: string | null;
    anio: number;
    objeto: ObjectoContractual;
    area_usuaria: string | null;
    denominacion: string;
    organo_unidad_organica: string | null;
    actividad_poi: string | null;
    clauses: RequirementInitial['clauses'];
    status: RequirementInitial['status'];
  };
  if (row.user_id !== user.id) notFound();

  // Defensa: si por alguna razón el array de clauses quedó vacío
  // (cosa que pasa con migraciones tempranas), repoblamos con el
  // catálogo inicial sin marcarlas como incluidas.
  const clauses =
    Array.isArray(row.clauses) && row.clauses.length > 0
      ? row.clauses
      : getInitialClauses(row.objeto);

  const initial: RequirementInitial = {
    id: row.id,
    nro: row.nro,
    anio: row.anio,
    objeto: row.objeto,
    area_usuaria: row.area_usuaria,
    denominacion: row.denominacion,
    organo_unidad_organica: row.organo_unidad_organica,
    actividad_poi: row.actividad_poi,
    clauses,
    status: row.status,
  };

  return <RequirementView initial={initial} />;
}
