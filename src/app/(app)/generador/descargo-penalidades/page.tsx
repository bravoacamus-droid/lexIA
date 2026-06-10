import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Descargo por Penalidades' };

export default async function DescargoPenalidadesPage() {
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
        moduleName="El generador de Descargo por Penalidades"
        reason="Presentar descargos a penalidades es facultad del contratista en ejecución contractual."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="descargo_penalidades"
      endpoint="/api/generators/ejecucion"
      pageTitle="Descargo a la Aplicación de Penalidades"
      pageDescription="LexIA arma el escrito formal donde el contratista contradice la aplicación de penalidades por mora u otras causas, citando jurisprudencia y la norma aplicable."
      pageInfoBullets={[
        'Líneas habituales: caso fortuito o fuerza mayor, hecho imputable a la entidad, mal cálculo de la fórmula.',
        'Adjunta toda prueba documental (cuaderno de obra, partes, oficios, reportes SENAMHI, etc.).',
        'Si la penalidad supera tope contractual, recuerda invocar el límite máximo de penalidad acumulada.',
      ]}
      showPdfUpload
      pdfUploadLabel="Oficio o resolución que aplica la penalidad (PDF)"
      pdfUploadHint="LexIA citará literalmente el sustento de la entidad para contradecirlo punto por punto."
      fields={[
        {
          name: 'contrato',
          label: 'Número y denominación del contrato',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad contratante',
          required: true,
        },
        {
          name: 'monto_penalidad',
          label: 'Monto de la penalidad aplicada (S/)',
          placeholder: '45000.00',
        },
        {
          name: 'fecha_oficio',
          label: 'Fecha del oficio que aplica la penalidad',
          placeholder: '2026-07-12',
        },
        {
          name: 'causal_eximente',
          label: 'Causal eximente que invocas',
          hint: 'Caso fortuito, fuerza mayor, hecho imputable a la entidad, mal cálculo, etc.',
          placeholder: 'Lluvias torrenciales atípicas + hecho atribuible a la entidad',
          required: true,
        },
        {
          name: 'hechos',
          label: 'Cronología detallada de los hechos',
          type: 'textarea',
          rows: 7,
          required: true,
          placeholder:
            'Entre el 22 de marzo y el 8 de abril de 2026 se registraron lluvias acumuladas de 187 mm (412% del promedio histórico, reporte SENAMHI N° 2026-04-10/DRT-MOQ) que paralizaron los frentes de trabajo durante 17 días calendario; adicionalmente la Entidad entregó el terreno definitivo recién el 18 de abril, 14 días después de la fecha contractual prevista.',
        },
        {
          name: 'pruebas',
          label: 'Documentos probatorios que adjuntas',
          type: 'textarea',
          rows: 4,
          placeholder:
            'Cuaderno de obra folios 412-447 · Reporte SENAMHI N° 2026-04-10/DRT-MOQ · Acta de entrega de terreno · Panel fotográfico georreferenciado',
        },
      ]}
    />
  );
}
