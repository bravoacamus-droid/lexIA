import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Resolución de Contrato' };

export default async function ResolucionContratoPage() {
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
        moduleName="El generador de Resolución de Contrato"
        reason="Resolver un contrato por incumplimiento es facultad de la entidad contratante."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="resolucion_contrato"
      endpoint="/api/generators/ejecucion"
      pageTitle="Carta Notarial — Apercibimiento / Resolución de Contrato"
      pageDescription="LexIA redacta la carta notarial correspondiente: apercibimiento previo o resolución definitiva, según indique el usuario."
      pageInfoBullets={[
        'El procedimiento tiene dos etapas: primero apercibimiento con plazo (5 a 15 días típico), luego resolución.',
        'La resolución desencadena: ejecución de garantía de fiel cumplimiento + inicio del sancionador ante el Tribunal.',
        'Las dos cartas se envían por vía notarial. Conserva el cargo con la firma del notario.',
      ]}
      fields={[
        {
          name: 'etapa',
          label: 'Etapa del procedimiento',
          hint: '"apercibimiento" o "resolución". LexIA usará la estructura correspondiente.',
          required: true,
          placeholder: 'apercibimiento',
        },
        {
          name: 'contrato',
          label: 'Número y denominación del contrato',
          placeholder: 'Ej. Contrato N° 015-2026-GRA — Construcción del puente vehicular',
          required: true,
        },
        {
          name: 'contratista',
          label: 'Razón social del contratista',
          placeholder: 'Ej. Constructora del Norte S.A.C.',
          required: true,
        },
        {
          name: 'monto_contrato',
          label: 'Monto del contrato (S/)',
          placeholder: '1850000.00',
        },
        {
          name: 'obligaciones_incumplidas',
          label: 'Obligaciones incumplidas',
          hint: 'Detalla con fechas exactas. LexIA lo estructurará como cronología.',
          type: 'textarea',
          rows: 6,
          required: true,
        },
        {
          name: 'plazo_apercibimiento',
          label: 'Plazo perentorio (solo si etapa = apercibimiento)',
          placeholder: '10 días calendario',
        },
        {
          name: 'apercibimiento_previo_fecha',
          label: 'Fecha del apercibimiento previo (solo si etapa = resolución)',
          placeholder: '2026-07-15',
        },
      ]}
    />
  );
}
