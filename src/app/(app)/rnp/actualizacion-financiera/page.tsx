import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Actualización Financiera RNP' };

export default async function ActualizacionFinancieraPage() {
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
        moduleName="Actualización Financiera"
        reason="Este trámite es exclusivo de los proveedores inscritos en el RNP."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="rnp_actualizacion_financiera"
      endpoint="/api/generators/rnp"
      pageTitle="Actualización de Información Financiera (Anexo N° 06)"
      pageDescription="LexIA arma el Anexo N° 06 listo para revisión y firma: información general, Balance General, Estado de Resultados, análisis de ratios y declaración jurada."
      pageInfoBullets={[
        'Los datos financieros deben tener antigüedad ≤ 2 meses respecto a la fecha de presentación.',
        'Si no estás obligado a presentar PDT anual, bastan los Estados Financieros Situacionales.',
        'LexIA calcula automáticamente liquidez corriente, endeudamiento patrimonial y solvencia.',
      ]}
      fields={[
        {
          name: 'razon_social',
          label: 'Razón social / Nombres del proveedor',
          required: true,
        },
        {
          name: 'ruc',
          label: 'RUC',
          required: true,
        },
        {
          name: 'regimen_tributario',
          label: 'Régimen tributario',
          placeholder: 'Régimen General · MYPE Tributario · Otro',
        },
        {
          name: 'fecha_inicio',
          label: 'Fecha de inicio de actividades',
          placeholder: 'YYYY-MM-DD',
        },
        {
          name: 'moneda',
          label: 'Moneda de los estados (Soles, Dólares, Euros, Yen, Otros)',
          placeholder: 'Soles',
        },
        {
          name: 'fecha_corte',
          label: 'Fecha de corte del balance',
          placeholder: 'YYYY-MM-DD',
          required: true,
          hint: 'Debe tener antigüedad ≤ 2 meses respecto a hoy.',
        },
        {
          name: 'balance_general',
          label: 'Balance General — montos por rubro (S/)',
          type: 'textarea',
          rows: 10,
          required: true,
          placeholder:
            'Activo Corriente: 850000\n  · Efectivo: 250000\n  · Cuentas por cobrar: 350000\n  · Existencias: 250000\nActivo No Corriente: 1450000\n  · Inmuebles, maquinaria y equipo: 1300000\n  · Intangibles netos: 150000\nPasivo Corriente: 320000\nPasivo No Corriente: 480000\nPatrimonio: 1500000\n  · Capital social: 1200000\n  · Resultados acumulados: 300000',
        },
        {
          name: 'estado_resultados',
          label: 'Estado de Resultados — montos del último ejercicio (S/)',
          type: 'textarea',
          rows: 8,
          required: true,
          placeholder:
            'Ingresos por servicios prestados: 3850000\nCosto de servicios: 2450000\nUtilidad bruta: 1400000\nGastos administrativos: 450000\nGastos de ventas: 180000\nUtilidad operativa: 770000\nGastos financieros: 95000\nImpuesto a la renta: 200000\nUtilidad neta: 475000',
        },
        {
          name: 'observaciones',
          label: 'Observaciones (opcional)',
          type: 'textarea',
          rows: 3,
        },
      ]}
    />
  );
}
