import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { FormularioRequerimiento } from '@/components/app/requerimiento-plantilla/formulario';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function RequerimientoPlantillaPage({
  params,
}: {
  params: { id: string };
}) {
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
        moduleName="Requerimiento desde plantilla oficial"
        reason="Esta herramienta es para el Área Usuaria de la Entidad."
      />
    );
  }

  const { data } = await supabase
    .from('requerimientos_plantilla')
    .select('id, user_id, plantilla_id, denominacion, cuantia, monto_contrato, respuestas')
    .eq('id', params.id)
    .maybeSingle();

  if (!data || data.user_id !== user.id) notFound();

  const plantilla = obtenerPlantilla(data.plantilla_id as string);
  if (!plantilla) notFound();

  const respuestas = normalizarRespuestas(
    (data.respuestas ?? {}) as Partial<RespuestasRequerimiento>,
  );

  // El estado inicial se calcula en el servidor con el mismo ensamblador
  // que produce el Word, para que la pantalla no muestre una cuenta de
  // pendientes distinta de la del documento.
  const doc = ensamblarRequerimiento(plantilla, respuestas, {
    cuantia: (data.cuantia as number | null) ?? undefined,
    montoContrato: (data.monto_contrato as number | null) ?? undefined,
  });

  return (
    <FormularioRequerimiento
      id={data.id as string}
      plantilla={plantilla}
      inicial={{
        denominacion: data.denominacion as string,
        cuantia: (data.cuantia as number | null) ?? null,
        monto_contrato: (data.monto_contrato as number | null) ?? null,
        respuestas,
      }}
      estadoInicial={{
        faltantes: doc.faltantes,
        avisos: doc.avisos,
        omitidas: doc.omitidas,
      }}
    />
  );
}
