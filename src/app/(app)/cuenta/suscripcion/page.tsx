import { createClient } from '@/lib/supabase/server';
import { resumenDeCuenta } from '@/lib/billing/gestion';
import { MiPlan } from '@/components/app/cuenta/mi-plan';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu plan y créditos' };

/**
 * Plan, créditos, herramientas, recargas y equipo.
 *
 * La versión anterior medía cuotas por acción (mensajes, generaciones,
 * evaluaciones) y calculaba un «valor generado» con horas ahorradas a
 * partir de esas cuotas. Con los planes de créditos de César
 * (17/10/2026) esas cuotas ya no existen, y el valor generado salía de
 * ellas: se quitó en lugar de inventar otra fórmula. Lo que el usuario
 * necesita ver ahora es su bolsa y qué herramientas le habilita su plan.
 *
 * Se lee en el servidor para que la página llegue completa; el
 * componente vuelve a pedir GET /api/cuenta/plan tras cada cambio del
 * equipo.
 */
export default async function SuscripcionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const resumen = await resumenDeCuenta(user.id);
  return <MiPlan inicial={resumen} email={user.email ?? ''} userId={user.id} />;
}
