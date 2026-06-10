import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Términos de Referencia / EETT' };

export default async function TdrEettPage() {
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
        moduleName="El generador de TDR / EETT"
        reason="La formulación de Términos de Referencia y Especificaciones Técnicas es facultad del área usuaria de la entidad pública."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="tdr_eett"
      endpoint="/api/generators/preparatorias"
      pageTitle="Términos de Referencia / Especificaciones Técnicas"
      pageDescription="LexIA arma el TDR (servicios y consultorías) o EETT (bienes y obras) que se incorpora al expediente del procedimiento de selección."
      pageInfoBullets={[
        'Elige el tipo de objeto: la estructura cambia para bienes / servicios / obras / consultoría.',
        'LexIA evita el direccionamiento a marca: si tu insumo menciona una, te lo advierte y reformula en características funcionales.',
        'Los requisitos del personal clave se proponen proporcionales al objeto, evitando exigencias arbitrarias.',
      ]}
      showObjectType
      fields={[
        {
          name: 'denominacion',
          label: 'Denominación del bien / servicio / obra',
          placeholder:
            'Ej. Adquisición de tabletas Android para programa de educación digital · 850 unidades',
          required: true,
        },
        {
          name: 'finalidad_publica',
          label: 'Finalidad pública (art. 24 Ley 32069)',
          hint: '¿Qué necesidad pública resuelve esta contratación? Sé específico y citable.',
          type: 'textarea',
          rows: 3,
          required: true,
          placeholder:
            'Cubrir la demanda de dispositivos móviles educativos para 850 estudiantes del programa “Aprendo en casa” en zonas rurales priorizadas del distrito de Tacna.',
        },
        {
          name: 'antecedentes',
          label: 'Antecedentes y justificación técnica',
          hint: 'Contexto, contrataciones anteriores similares, problemática que se busca resolver.',
          type: 'textarea',
          rows: 4,
        },
        {
          name: 'caracteristicas_clave',
          label: 'Características técnicas clave (sin marcas)',
          hint:
            'Especifica en términos funcionales: pantalla mínima, almacenamiento, autonomía, conectividad, etc. Si mencionas una marca como referencia, LexIA la convertirá en specs neutrales.',
          type: 'textarea',
          rows: 6,
          required: true,
          placeholder:
            'Pantalla mínima 10″ resolución HD; almacenamiento ≥ 64 GB; batería autonomía ≥ 8 horas en uso continuo; conectividad Wi-Fi dual band y 4G LTE; garantía técnica 24 meses.',
        },
        {
          name: 'plazo_ejecucion',
          label: 'Plazo de ejecución / entrega',
          placeholder: '60 días calendario',
        },
        {
          name: 'lugar_ejecucion',
          label: 'Lugar de ejecución / entrega',
          placeholder: 'Almacén central del MINEDU, Av. de la Educación 1234, Lima',
        },
        {
          name: 'personal_clave',
          label: 'Personal clave (solo para servicios, obras y consultoría)',
          hint:
            'Lista profesionales y años mínimos. LexIA validará que sean proporcionales al objeto.',
          type: 'textarea',
          rows: 4,
        },
        {
          name: 'consideraciones_especiales',
          label: 'Consideraciones adicionales (opcional)',
          type: 'textarea',
          rows: 3,
        },
      ]}
    />
  );
}
