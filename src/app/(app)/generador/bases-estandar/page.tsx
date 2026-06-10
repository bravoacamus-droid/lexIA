import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bases Estándar OECE' };

export default async function BasesEstandarPage() {
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
        moduleName="El generador de Bases Estándar"
        reason="La elaboración de las Bases de un procedimiento es facultad de la dependencia encargada de las contrataciones (logística) de la entidad convocante."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="bases_estandar"
      pageTitle="Bases Estándar OECE 2025"
      pageDescription="LexIA parte de la plantilla oficial OECE correspondiente al tipo de procedimiento y objeto, y rellena los campos clave con los datos del proceso."
      pageInfoBullets={[
        'Elige el tipo de objeto (Bienes, Servicios, Obras, Consultoría). Cargamos la plantilla OECE 2025 correcta.',
        'Solo llenamos la Sección Específica (Cap. 3 Requerimiento y Cap. 4 Factores). La General es boilerplate.',
        'Si los requisitos podrían considerarse direccionamiento, LexIA lo advierte expresamente.',
      ]}
      showObjectType
      fields={[
        {
          name: 'procedimiento',
          label: 'Denominación del procedimiento',
          placeholder: 'Ej. Mejoramiento de la carretera vecinal Tramo Sur — Provincia de Tacna',
          required: true,
        },
        {
          name: 'numero',
          label: 'Número del procedimiento',
          placeholder: 'Ej. Licitación Pública N° 005-2026-MTC/20',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad convocante',
          placeholder: 'Ej. PROVIAS Nacional · MTC',
          required: true,
        },
        {
          name: 'valor_referencial',
          label: 'Valor referencial (S/)',
          placeholder: '32500000.00',
        },
        {
          name: 'plazo_ejecucion',
          label: 'Plazo de ejecución (días calendario)',
          placeholder: '360',
        },
        {
          name: 'requisitos_calificacion',
          label: 'Requisitos de calificación (lista resumida)',
          hint: 'Capacidad legal, técnico-profesional y económica. LexIA expandirá cada uno con sustento.',
          type: 'textarea',
          rows: 6,
          placeholder:
            'Capacidad legal: vigencia de poderes, RNP vigente.\nTécnica: Residente con 8 años de experiencia específica en obras viales con carpeta asfáltica en caliente.\nEconómica: facturación acumulada mínima en obras similares = 1.075 × valor referencial en los últimos 10 años.',
        },
        {
          name: 'factores_evaluacion',
          label: 'Factores de evaluación adicionales (opcional)',
          hint: 'Más allá del precio, factores diferenciadores (ej. plazo, sostenibilidad, calidad).',
          type: 'textarea',
          rows: 4,
        },
      ]}
    />
  );
}
