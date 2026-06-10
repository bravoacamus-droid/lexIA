import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambio de Personal Clave' };

export default async function CambioPersonalClavePage() {
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
        moduleName="El generador de Cambio de Personal Clave"
        reason="Solicitar la sustitución del personal acreditado es facultad del contratista en ejecución contractual."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="cambio_personal_clave"
      endpoint="/api/generators/ejecucion"
      pageTitle="Carta de Sustitución de Personal Clave"
      pageDescription="LexIA redacta la carta formal a la Entidad solicitando la sustitución del profesional acreditado por otro de cualificaciones iguales o superiores."
      pageInfoBullets={[
        'El profesional reemplazante DEBE tener iguales o mayores credenciales (años, especialidad, colegiatura).',
        'La causal debe estar tipificada (renuncia, fuerza mayor, etc.) — no aplica simple voluntad.',
        'Adjunta CV, copia de colegiatura habilitada y constancia de no inhabilitación del reemplazante.',
      ]}
      fields={[
        {
          name: 'contrato',
          label: 'Número y denominación del contrato',
          placeholder: 'Ej. Contrato N° 042-2026-MTC — Mantenimiento periódico vial Tramo Sur',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad contratante',
          placeholder: 'Ej. Provias Nacional · MTC',
          required: true,
        },
        {
          name: 'profesional_saliente',
          label: 'Profesional saliente — nombre y CIP',
          placeholder: 'Ing. María Quispe Vargas · CIP 45123 · Residente de Obra',
          required: true,
        },
        {
          name: 'causal',
          label: 'Causal de sustitución',
          type: 'textarea',
          rows: 3,
          required: true,
          placeholder:
            'Renuncia voluntaria del profesional por motivos personales, formalizada mediante carta del 10 de julio de 2026.',
        },
        {
          name: 'profesional_propuesto',
          label: 'Profesional propuesto — cualificaciones',
          type: 'textarea',
          rows: 5,
          required: true,
          placeholder:
            'Ing. Carlos Mendoza Torres · CIP 38214 · 14 años de experiencia profesional general, 11 años como Residente de Obra en proyectos viales con carpeta asfáltica en caliente. Colegiado y habilitado al 2026.',
        },
        {
          name: 'equivalencia',
          label: 'Demostración de equivalencia o superioridad',
          hint: 'Compara años de experiencia, especialidad, certificaciones contra el saliente.',
          type: 'textarea',
          rows: 4,
        },
      ]}
    />
  );
}
