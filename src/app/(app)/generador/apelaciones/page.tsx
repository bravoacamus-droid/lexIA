import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recurso de Apelación' };

export default async function ApelacionesPage() {
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
        moduleName="El generador de Apelaciones"
        reason="Interponer recurso de apelación es facultad del proveedor afectado por el acto que se impugna."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="apelaciones"
      pageTitle="Recurso de Apelación"
      pageDescription="LexIA arma el escrito de apelación dirigido a la autoridad competente (Entidad o Tribunal del OECE) según el valor del proceso y el acto impugnado."
      pageInfoBullets={[
        'Si la cuantía es ≤ 65 UIT → ante la Entidad. Si es > 65 UIT → ante el Tribunal del OECE.',
        'Plazo: 8 días hábiles desde la notificación del acto que se impugna. La garantía es 3% del valor referencial.',
        'Sube el acto impugnado (PDF) — acta de Buena Pro, resolución de descalificación, etc. LexIA lo cita literalmente cuando aplica.',
      ]}
      showPdfUpload
      pdfUploadLabel="Acto impugnado (PDF)"
      pdfUploadHint="Acta de otorgamiento de Buena Pro, resolución de descalificación o cualquier acto del comité que motiva la apelación."
      fields={[
        {
          name: 'procedimiento',
          label: 'Denominación y número del procedimiento',
          placeholder:
            'Ej. Concurso Público N° 007-2026-GRA — Servicio de mantenimiento de infraestructura',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad convocante',
          placeholder: 'Ej. Gobierno Regional de Ayacucho',
          required: true,
        },
        {
          name: 'apelante_nombre',
          label: 'Razón social del apelante',
          placeholder: 'Ej. Servicios Integrales del Norte S.A.C.',
          required: true,
        },
        {
          name: 'apelante_ruc',
          label: 'RUC del apelante',
          placeholder: '20123456789',
        },
        {
          name: 'acto_impugnado',
          label: 'Acto impugnado',
          placeholder:
            'Ej. Acta de otorgamiento de la Buena Pro de fecha 12 de junio de 2026',
          required: true,
        },
        {
          name: 'fecha_notificacion',
          label: 'Fecha de notificación del acto (YYYY-MM-DD)',
          placeholder: '2026-06-12',
        },
        {
          name: 'valor_referencial',
          label: 'Valor referencial del procedimiento (S/)',
          placeholder: '850000.00',
          hint: 'Determina si la competencia es la Entidad (≤ 65 UIT) o el Tribunal (> 65 UIT).',
        },
        {
          name: 'agravios',
          label: 'Agravios y hechos relevantes',
          hint: 'Describe brevemente qué te perjudica del acto impugnado. LexIA hilará los fundamentos de derecho.',
          type: 'textarea',
          rows: 6,
          required: true,
          placeholder:
            'Ej. El comité descalificó nuestra oferta por considerar que el CV de la Residente no estaba firmado, cuando en realidad la firma sí está presente en la página 47 y el comité no advirtió mi oportunidad de subsanar, contraviniendo el art. 64.2 del Reglamento.',
        },
      ]}
    />
  );
}
