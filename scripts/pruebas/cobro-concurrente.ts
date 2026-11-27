/**
 * Pedidos simultáneos contra el cobro de créditos (migración 0090,
 * auditoría del 26/11/2026, B1/B3/B5). Cada caso lanza varios pedidos a la
 * vez, que es como se aprovechaban los huecos: uno solo nunca falla.
 *
 *   · Límite mensual: Consulta admite 3 operaciones de requerimientos
 *     menores al mes; 6 a la vez deben dejar pasar exactamente 3.
 *   · Saldo: con 40 créditos, 4 requerimientos de 40 a la vez pasan 1.
 *   · Invitación: un mismo enlace aceptado por dos cuentas a la vez entra 1.
 *   · Tope de equipo: con un lugar libre, dos invitaciones a la vez entra 1.
 *
 * Crea usuarios temporales y los borra al final (el borrado arrastra sus
 * bolsas, movimientos y equipos).
 * Uso: npx tsx scripts/pruebas/cobro-concurrente.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { usarHerramienta } from '../../src/lib/billing/creditos';
import { aceptarInvitacion, asignarPlan, crearInvitacion } from '../../src/lib/billing/gestion';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

const creados: string[] = [];
async function usuario(sufijo: string) {
  const email = `prueba-concurrente-${sufijo}-${Date.now()}@ejemplo.test`;
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  creados.push(data.user!.id);
  return data.user!.id;
}

const aLaVez = <T>(n: number, f: () => Promise<T>) => Promise.all(Array.from({ length: n }, f));

void (async () => {
  try {
    // ── Límite mensual de Consulta ──
    const a = await usuario('limite');
    await asignarPlan({ userId: a, plan: 'consulta', modalidad: 'mensual', meses: 1, creditosMes: 1000, hechoPor: a });
    const r1 = await aLaVez(6, () => usarHerramienta(a, 'requerimiento_menor', { detalle: 'prueba concurrente' }));
    const pasaron = r1.filter((r) => r.ok).length;
    const porLimite = r1.filter((r) => !r.ok && r.body.error === 'limite_del_plan').length;
    ok(pasaron === 3, `límite mensual: de 6 a la vez pasan 3 (${pasaron} pasaron, ${porLimite} por límite)`);
    // Un reembolso libera el cupo.
    const primero = r1.find((r) => r.ok);
    if (primero?.ok) await primero.reembolsar('prueba');
    const otra = await usarHerramienta(a, 'requerimiento_menor', { detalle: 'tras reembolso' });
    ok(otra.ok, 'tras un reembolso vuelve a haber cupo');

    // ── Saldo justo ──
    const b = await usuario('saldo');
    await asignarPlan({ userId: b, plan: 'especialista', modalidad: 'mensual', meses: 1, creditosMes: 40, hechoPor: b });
    const r2 = await aLaVez(4, () => usarHerramienta(b, 'requerimiento_seleccion', { detalle: 'prueba concurrente' }));
    ok(r2.filter((r) => r.ok).length === 1, `saldo de 40: de 4 pedidos de 40 a la vez pasa 1 (${r2.filter((r) => r.ok).length})`);

    // ── Un enlace, dos cuentas ──
    const duena = await usuario('duena');
    await asignarPlan({ userId: duena, plan: 'equipos', modalidad: 'mensual', meses: 1, maxUsuarios: 10, nombreEquipo: 'Prueba concurrente', hechoPor: duena });
    const inv = await crearInvitacion(duena);
    const [x, y] = [await usuario('x'), await usuario('y')];
    const r3 = await Promise.allSettled([aceptarInvitacion(x, inv.token), aceptarInvitacion(y, inv.token)]);
    ok(r3.filter((r) => r.status === 'fulfilled').length === 1, `un mismo enlace a la vez: entra 1 (${r3.filter((r) => r.status === 'fulfilled').length})`);

    // ── Tope del equipo ──
    const duena2 = await usuario('duena2');
    // Propietaria + 1 lugar.
    await asignarPlan({ userId: duena2, plan: 'equipos', modalidad: 'mensual', meses: 1, maxUsuarios: 2, nombreEquipo: 'Prueba tope', hechoPor: duena2 });
    const [i1, i2] = [await crearInvitacion(duena2), await crearInvitacion(duena2)];
    const [p, q] = [await usuario('p'), await usuario('q')];
    const r4 = await Promise.allSettled([aceptarInvitacion(p, i1.token), aceptarInvitacion(q, i2.token)]);
    const { data: eq } = await db.from('miembros_de_equipo').select('equipo_id').eq('user_id', duena2).single();
    const { count } = await db
      .from('miembros_de_equipo')
      .select('user_id', { count: 'exact', head: true })
      .eq('equipo_id', (eq as { equipo_id: string }).equipo_id);
    ok(count === 2, `tope de 2 usuarios: con dos invitaciones a la vez el equipo queda en 2 (${count}; ${r4.filter((r) => r.status === 'fulfilled').length} aceptadas)`);
  } finally {
    // Como en creditos.ts: primero los equipos (y su bolsa), luego los usuarios.
    for (const id of creados) await db.from('equipos').delete().eq('propietario', id);
    for (const id of creados) await db.auth.admin.deleteUser(id);
  }
  console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo bien');
  process.exit(fallas ? 1 : 0);
})();
