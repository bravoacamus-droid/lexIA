import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estrategia de Contratación' };

export default async function EstrategiaContratacionPage() {
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
        moduleName="El generador de Estrategia de Contratación"
        reason="La Estrategia de Contratación la elabora la dependencia encargada de las contrataciones (logística) de la entidad pública."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="estrategia_contratacion"
      endpoint="/api/generators/preparatorias"
      pageTitle="Estrategia de Contratación"
      pageDescription="LexIA llena el formato oficial OECE 2025 con sustento técnico de 3 a 4 párrafos por campo, partiendo de los insumos del área usuaria y la indagación de mercado."
      pageInfoBullets={[
        'Carga la plantilla oficial OECE 2025 (estándar o CEAM). Te entrega cada campo sustentado y citable.',
        'Cuando falten datos críticos, LexIA deja placeholders explícitos en vez de inventar.',
        'Las decisiones sobre tipo de procedimiento y sistema de contratación se justifican con cita al artículo aplicable.',
      ]}
      showObjectType
      fields={[
        {
          name: 'denominacion',
          label: 'Denominación del requerimiento',
          placeholder:
            'Ej. Servicio de mantenimiento periódico de la carretera vecinal Tramo Sur — 6 meses',
          required: true,
        },
        {
          name: 'monto_estimado',
          label: 'Monto estimado (S/)',
          placeholder: '1850000.00',
          required: true,
        },
        {
          name: 'fuente_financiamiento',
          label: 'Fuente de financiamiento',
          placeholder: 'Ej. Recursos Ordinarios · Canon · Donaciones y Transferencias',
        },
        {
          name: 'indagacion_mercado',
          label: 'Resumen de la indagación de mercado',
          hint:
            'Fuentes consultadas, número de cotizaciones, rango de precios, proveedores potenciales identificados.',
          type: 'textarea',
          rows: 5,
          required: true,
          placeholder:
            'Se cotizaron 4 proveedores del rubro vial vigentes en el RNP. Rango de precios S/ 1.7M – S/ 1.95M. Se identifica pluralidad real de proveedores en la Macro Región Sur.',
        },
        {
          name: 'tipo_procedimiento_propuesto',
          label: 'Tipo de procedimiento propuesto',
          hint:
            'LexIA validará tu propuesta contra los umbrales del art. 41 Ley 32069 y el objeto.',
          placeholder:
            'Ej. Adjudicación Simplificada por el monto y tipo de servicio',
        },
        {
          name: 'sistema_contratacion',
          label: 'Sistema de contratación propuesto',
          placeholder: 'Suma alzada · Precios unitarios · Costo plus · Tarifas',
        },
        {
          name: 'plazo_ejecucion',
          label: 'Plazo de ejecución estimado',
          placeholder: '180 días calendario',
        },
        {
          name: 'modalidad_ejecucion',
          label: 'Modalidad de ejecución',
          placeholder: 'Única · Paquete · Encargo',
        },
        {
          name: 'riesgos_identificados',
          label: 'Riesgos identificados y mitigación',
          hint: 'Climáticos, sociales, técnicos, financieros — LexIA estructura un plan de mitigación.',
          type: 'textarea',
          rows: 4,
        },
        {
          name: 'consideraciones',
          label: 'Otras consideraciones relevantes (opcional)',
          type: 'textarea',
          rows: 3,
        },
      ]}
    />
  );
}
