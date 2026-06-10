import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pliego de Absolución' };

export default async function PliegoAbsolucionPage() {
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
        moduleName="El generador de Pliego de Absolución"
        reason="Absolver consultas y observaciones es facultad del comité de selección de la entidad convocante."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="pliego_absolucion"
      pageTitle="Pliego de Absolución de Consultas y Observaciones"
      pageDescription="LexIA recibe las consultas/observaciones presentadas por los participantes y genera el pliego oficial con respuesta razonada por cada cuestionamiento."
      pageInfoBullets={[
        'Sube el PDF con todas las consultas y observaciones recibidas (consolidado o por participante).',
        'LexIA dictamina: PROCEDE / NO PROCEDE / SE PRECISA por cada cuestionamiento, con sustento normativo.',
        'Cuando PROCEDE, propone el texto modificado de las Bases. Output: pliego listo para Bases Integradas.',
      ]}
      showObjectType
      showPdfUpload
      pdfUploadLabel="Consultas y observaciones recibidas (PDF consolidado)"
      pdfUploadHint="Sube el PDF con los escritos de cada participante. El archivo se procesa en memoria y no se guarda."
      fields={[
        {
          name: 'procedimiento',
          label: 'Denominación y número del procedimiento',
          placeholder:
            'Ej. Concurso Público N° 010-2026-MTC — Servicio de mantenimiento vial Tramo Sur',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad convocante',
          placeholder: 'Ej. PROVIAS Descentralizado',
          required: true,
        },
        {
          name: 'comite',
          label: 'Comité de Selección',
          placeholder: 'Ing. María Quispe (Presidenta) · CPC Carlos Vargas · Abog. Luis Torres',
          hint: 'Nombres y cargos de los miembros que firman el pliego.',
        },
        {
          name: 'fecha_absolucion',
          label: 'Fecha de absolución',
          placeholder: '2026-07-14',
        },
        {
          name: 'criterios_internos',
          label: 'Criterios internos / lineamientos previos (opcional)',
          hint: 'Cualquier orientación interna que el comité quiera aplicar, política institucional, etc.',
          type: 'textarea',
          rows: 4,
        },
      ]}
    />
  );
}
