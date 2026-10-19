import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resumenDeCuenta } from '@/lib/billing/gestion';
import { bolsaDelUsuario } from '@/lib/billing/creditos';
import { resumenDeTarjeta } from '@/lib/billing/resumen-de-tarjeta';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cuenta/plan — plan, créditos, límites, movimientos y equipo del usuario.
 *
 * Con `?breve=1` devuelve solo lo que pinta la tarjeta del menú lateral:
 * la tarjeta lo pide cada vez que una pantalla gasta créditos, y el
 * resumen completo lee movimientos, miembros y correos que ahí no hacen
 * falta.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (new URL(req.url).searchParams.get('breve')) {
    const e = await bolsaDelUsuario(user.id);
    return NextResponse.json(
      resumenDeTarjeta({
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
      }),
    );
  }
  return NextResponse.json(await resumenDeCuenta(user.id));
}
