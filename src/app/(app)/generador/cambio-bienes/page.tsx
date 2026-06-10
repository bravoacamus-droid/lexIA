import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambio de Bienes Ofertados' };

export default async function CambioBienesPage() {
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
        moduleName="El generador de Cambio de Bienes"
        reason="Solicitar la sustitución de bienes ofertados es facultad del contratista."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="cambio_bienes"
      endpoint="/api/generators/ejecucion"
      pageTitle="Solicitud de Sustitución de Bienes Ofertados"
      pageDescription="LexIA redacta el escrito formal a la Entidad solicitando autorización para sustituir un bien ofertado por otro de equivalencia técnica o superior."
      pageInfoBullets={[
        'Causales admisibles: discontinuación por el fabricante, fuerza mayor, mejora tecnológica del mismo fabricante.',
        'La equivalencia técnica se demuestra parámetro por parámetro contra las especificaciones de las Bases / TDR.',
        'Adjunta catálogos, certificados del fabricante y declaración del distribuidor autorizado.',
      ]}
      fields={[
        {
          name: 'contrato',
          label: 'Número y denominación del contrato',
          placeholder: 'Ej. Contrato N° 028-2026-MINEDU — Tablets para programa rural',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad contratante',
          required: true,
        },
        {
          name: 'item_afectado',
          label: 'Ítem o lote afectado',
          placeholder: 'Ítem 1 · Tablets de 10″',
          required: true,
        },
        {
          name: 'bien_ofertado',
          label: 'Bien originalmente ofertado',
          placeholder: 'Marca: Samsung · Modelo: Galaxy Tab A8 · 64 GB · Wi-Fi/LTE',
          required: true,
        },
        {
          name: 'causal',
          label: 'Causal de sustitución',
          type: 'textarea',
          rows: 3,
          required: true,
          placeholder:
            'El fabricante (Samsung Electronics) discontinuó el modelo Galaxy Tab A8 a partir de mayo de 2026, según comunicado oficial referenciado.',
        },
        {
          name: 'bien_propuesto',
          label: 'Bien propuesto en sustitución',
          placeholder: 'Marca: Samsung · Modelo: Galaxy Tab A9 · 128 GB · Wi-Fi/LTE',
          required: true,
        },
        {
          name: 'parametros_comparativos',
          label: 'Parámetros comparativos clave',
          hint:
            'Para cada parámetro: lo exigido en TDR, lo ofertado, lo propuesto. LexIA construirá el cuadro de equivalencia.',
          type: 'textarea',
          rows: 6,
          required: true,
          placeholder:
            'Pantalla: TDR ≥ 10″ — Ofertado 10.5″ — Propuesto 11″\nAlmacenamiento: TDR ≥ 64 GB — Ofertado 64 GB — Propuesto 128 GB\nBatería: TDR ≥ 8 h — Ofertado 9 h — Propuesto 11 h\nConectividad: TDR Wi-Fi y 4G — Ofertado cumple — Propuesto cumple',
        },
      ]}
    />
  );
}
