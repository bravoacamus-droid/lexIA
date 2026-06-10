import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultas y Observaciones' };

export default async function ConsultasObservacionesPage() {
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
        moduleName="El generador de Consultas y Observaciones"
        reason="Las consultas y observaciones a las Bases son una facultad de los participantes en el procedimiento de selección, no de la entidad convocante."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="consultas_observaciones"
      pageTitle="Consultas y observaciones a las Bases"
      pageDescription="LexIA analiza los capítulos relevantes de las Bases, detecta vicios y arma un escrito formal con sustento normativo listo para presentar al Comité de Selección."
      pageInfoBullets={[
        'Sube las Bases del SEACE (PDF). LexIA solo procesa los capítulos 3 y 4 de la Sección Específica.',
        'Detecta direccionamiento a marca, requisitos desproporcionados, factores subjetivos y otras vulneraciones.',
        'Cada observación lleva sustento normativo (artículo + opinión / pronunciamiento aplicable).',
      ]}
      showPdfUpload
      pdfUploadLabel="Bases del procedimiento (PDF de SEACE)"
      pdfUploadHint="Procesamos solo capítulos 3 y 4 de la Sección Específica. El PDF se procesa en memoria y no se guarda."
      fields={[
        {
          name: 'procedimiento',
          label: 'Denominación y número del procedimiento',
          placeholder:
            'Ej. Licitación Pública N° 005-2026-MTC/20 — Mejoramiento Carretera Boca del Río',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad convocante',
          placeholder: 'Ej. Provias Nacional · MTC',
          required: true,
        },
        {
          name: 'postor_nombre',
          label: 'Razón social del postor',
          placeholder: 'Ej. Constructora del Sur S.A.C.',
          required: true,
        },
        {
          name: 'postor_ruc',
          label: 'RUC del postor',
          placeholder: '20123456789',
        },
        {
          name: 'representante',
          label: 'Representante legal',
          placeholder: 'Nombre completo y DNI',
        },
        {
          name: 'preocupaciones_clave',
          label: 'Preocupaciones específicas (opcional)',
          hint: 'Si ya identificaste algún vicio, descríbelo brevemente. LexIA igual hará su propio análisis del Cap. 3 y 4.',
          type: 'textarea',
          rows: 4,
          placeholder:
            'Ej. La exigencia de "Caterpillar 140K específicamente" me parece direccionamiento a marca; los 10 años de experiencia para el Residente me parecen desproporcionados para un mantenimiento vial.',
        },
      ]}
    />
  );
}
