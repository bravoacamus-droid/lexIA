import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aumento de CMC' };

export default async function AumentoCmcPage() {
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
        moduleName="Aumento de CMC"
        reason="Este trámite es exclusivo de los proveedores inscritos en el RNP."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="rnp_aumento_cmc"
      endpoint="/api/generators/rnp"
      pageTitle="Aumento de Capacidad Máxima de Contratación (CMC)"
      pageDescription="LexIA arma el escrito de solicitud y el checklist de documentos a adjuntar conforme a la Ficha Técnica oficial del OECE."
      pageInfoBullets={[
        'Tasa: S/ 364.00 al 2025 (Ejecutor u Consultor de Obras, PJ y PN).',
        'Requiere calificación crediticia Normal (0) en la Central de Riesgos SBS.',
        'Los Estados Financieros DEBEN reflejar el nuevo capital acreditado, con antigüedad ≤ 2 meses.',
      ]}
      fields={[
        {
          name: 'tipo_proveedor',
          label: 'Tipo de proveedor',
          placeholder: 'Ejecutor de Obras · Consultor de Obras',
          required: true,
          hint: 'Esto determina qué documentos del checklist aplican.',
        },
        {
          name: 'persona',
          label: 'Persona jurídica o natural',
          placeholder: 'Persona Jurídica · Persona Natural',
          required: true,
        },
        {
          name: 'razon_social',
          label: 'Razón social / Nombres y apellidos',
          required: true,
        },
        {
          name: 'ruc',
          label: 'RUC',
          required: true,
        },
        {
          name: 'inscripcion_rnp',
          label: 'Número de inscripción en el RNP',
          placeholder: 'Ej. 067834-2025',
        },
        {
          name: 'cmc_actual',
          label: 'CMC actual (S/)',
          placeholder: '1500000.00',
        },
        {
          name: 'cmc_solicitada',
          label: 'CMC solicitada (S/)',
          placeholder: '3500000.00',
          required: true,
        },
        {
          name: 'obras_acreditadas',
          label: 'Obras ejecutadas para acreditar',
          hint: 'Una por línea — número de obra · denominación · entidad · monto · fecha de recepción.',
          type: 'textarea',
          rows: 8,
          required: true,
          placeholder:
            '01 · Mejoramiento carretera vecinal Tramo Sur · Municipalidad de Tacna · S/ 850,000.00 · 12-03-2024\n02 · Construcción canal de regadío · Gob. Reg. Moquegua · S/ 1,200,000.00 · 25-08-2024\n03 · Rehabilitación puente vehicular · Provias Descentralizado · S/ 980,000.00 · 14-12-2024',
        },
        {
          name: 'capital_social',
          label: 'Capital social actualizado (S/)',
          placeholder: '500000.00',
        },
        {
          name: 'ratios_clave',
          label: 'Ratios financieros clave (opcional)',
          hint: 'Liquidez corriente, endeudamiento patrimonial. LexIA validará rangos.',
          placeholder: 'Liquidez corriente: 1.85 · Endeudamiento patrimonial: 0.62',
        },
      ]}
    />
  );
}
