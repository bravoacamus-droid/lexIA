import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell, type ResumenDePlan } from '@/components/app/app-shell';
import { SurveyPromptModal } from '@/components/app/surveys/survey-prompt-modal';
import { WidgetDeAyuda } from '@/components/soporte/ayuda/widget-de-ayuda';
import { bolsaDelUsuario } from '@/lib/billing/creditos';
import { resumenDeTarjeta } from '@/lib/billing/resumen-de-tarjeta';

export const dynamic = 'force-dynamic';

/**
 * El resumen del plan que pinta la barra lateral.
 *
 * Con los planes de créditos (documento «PLANES DE A-LEXIA» de César,
 * 17/10/2026) ya no hay una cuota por acción: hay una bolsa de créditos
 * del mes, más las recargas, que comparten todas las herramientas. La
 * tarjeta enseña esa bolsa —la del equipo si el usuario es de uno— y
 * cuándo se renueva.
 */
async function resumirElPlan(userId: string): Promise<ResumenDePlan | null> {
  try {
    const e = await bolsaDelUsuario(userId);
    return resumenDeTarjeta({
      plan: e.plan,
      equipo: e.equipo,
      creditosMes: e.bolsa.creditos_mes,
      delMes: e.delMes,
      recargas: e.recargas,
        proximaRecargaVence: e.lotes[0]?.vence_at ?? null,
      disponibles: e.disponibles,
      renovacion: e.renovacion,
      venceAt: e.bolsa.vence_at,
      vencido: e.vencido,
    });
  } catch {
    // Si la bolsa no se puede leer, la tarjeta no se pinta antes que
    // mostrar un saldo inventado.
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, plan] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    resumirElPlan(user.id),
  ]);

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        profile_role:
          (profile?.profile_role as 'entity' | 'provider' | 'consultant' | null) || null,
        organization_name: profile?.organization_name || null,
        is_admin: Boolean(profile?.is_admin),
      }}
      plan={plan}
    >
      {children}
      <SurveyPromptModal />
      <WidgetDeAyuda
        usuario={{
          id: user.id,
          nombre: profile?.full_name || null,
          email: user.email || '',
          perfil: (profile?.profile_role as 'entity' | 'provider' | 'consultant' | null) || null,
          esAdmin: Boolean(profile?.is_admin),
        }}
      />
    </AppShell>
  );
}
