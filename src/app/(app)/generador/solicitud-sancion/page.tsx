import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitud de Sanción' };

export default async function SolicitudSancionPage() {
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
        moduleName="El generador de Solicitud de Sanción"
        reason="Iniciar el procedimiento administrativo sancionador es facultad de la entidad denunciante ante el Tribunal del OECE."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="solicitud_sancion"
      endpoint="/api/generators/ejecucion"
      pageTitle="Solicitud de Sanción ante el Tribunal del OECE"
      pageDescription="LexIA redacta el escrito formal que inicia el procedimiento administrativo sancionador, fundamentando la infracción y solicitando la imposición de la sanción aplicable."
      pageInfoBullets={[
        'Infracciones típicas: incumplimiento sustancial, resolución de contrato por causa del contratista, documentación falsa, subcontratación no autorizada.',
        'Adjunta TODO el medio probatorio (contrato, oficios, cartas notariales, peritajes, partes, fotografías).',
        'La sanción solicitada debe ser proporcional a la gravedad de la infracción (suspensión, inhabilitación temporal o definitiva, multa).',
      ]}
      fields={[
        {
          name: 'entidad_denunciante',
          label: 'Entidad denunciante (RUC y domicilio)',
          required: true,
          placeholder: 'Gobierno Regional de Ayacucho · RUC 20127485293 · Jr. Callao 248, Ayacucho',
        },
        {
          name: 'representante_legal',
          label: 'Representante legal y abogado patrocinante',
          placeholder: 'Ing. Juan Pérez (Gobernador) · Abog. María Torres (CAL 35124)',
        },
        {
          name: 'denunciado',
          label: 'Denunciado (razón social, RUC, domicilio)',
          required: true,
          placeholder: 'Constructora del Sur S.A.C. · RUC 20485124793 · Av. Las Palmeras 458, Lima',
        },
        {
          name: 'contrato',
          label: 'Contrato afectado (número, monto, fechas)',
          required: true,
          placeholder:
            'Contrato N° 015-2026-GRA · S/ 1,850,000.00 · Suscrito 15-02-2026 · Plazo 180 días',
        },
        {
          name: 'infraccion',
          label: 'Infracción imputada (con artículo tipificante)',
          required: true,
          placeholder:
            'Incumplimiento sustancial del contrato — tipificada en el art. 50.b de la Ley 32069',
        },
        {
          name: 'hechos',
          label: 'Hechos (cronología detallada)',
          type: 'textarea',
          rows: 8,
          required: true,
        },
        {
          name: 'sancion_solicitada',
          label: 'Sanción solicitada',
          placeholder:
            'Inhabilitación temporal por 24 meses para contratar con el Estado',
          required: true,
        },
        {
          name: 'medios_probatorios',
          label: 'Medios probatorios que adjunta',
          type: 'textarea',
          rows: 4,
        },
      ]}
    />
  );
}
