/**
 * Prueba del sistema de planes con créditos (migración 0086) contra la
 * base real, con dos usuarios temporales que se borran al final.
 * Uso: npx tsx scripts/pruebas/creditos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { bolsaDelUsuario, usarHerramienta } from '../../src/lib/billing/creditos';
import { aceptarInvitacion, asignarPlan, crearInvitacion, quitarMiembro, recargar, resumenDeCuenta } from '../../src/lib/billing/gestion';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

async function usuario(sufijo: string) {
  const email = `prueba-creditos-${sufijo}-${Date.now()}@ejemplo.test`;
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  return data.user!.id;
}

void (async () => {
  const a = await usuario('a');
  const b = await usuario('b');
  try {
    // 1. Prueba: 20 preguntas, nada más.
    const e0 = await bolsaDelUsuario(a);
    ok(e0.plan === 'prueba' && e0.disponibles === 20, `cuenta nueva: Prueba con 20 preguntas (${e0.plan}, ${e0.disponibles})`);
    const busq = await usarHerramienta(a, 'busqueda_avanzada');
    ok(!busq.ok && busq.body.error === 'herramienta_no_incluida' && busq.body.plan_sugerido === 'consulta', 'Prueba: búsqueda avanzada no incluida (sugiere Consulta)');
    for (let i = 0; i < 20; i++) await usarHerramienta(a, 'consulta_texto', { detalle: `pregunta ${i + 1}` });
    const p21 = await usarHerramienta(a, 'consulta_texto');
    ok(!p21.ok && p21.body.error === 'sin_creditos', 'Prueba: la pregunta 21 se rechaza por falta de créditos');

    // 2. Plan Consulta: 200 créditos, contratos menores con tope de 3 operaciones.
    await asignarPlan({ userId: a, plan: 'consulta', modalidad: 'mensual', meses: 1, hechoPor: a });
    const e1 = await bolsaDelUsuario(a);
    ok(e1.plan === 'consulta' && e1.disponibles === 200, `Consulta asignado: 200 créditos (${e1.disponibles})`);
    const sel = await usarHerramienta(a, 'requerimiento_seleccion');
    ok(!sel.ok && sel.body.error === 'herramienta_no_incluida' && sel.body.plan_sugerido === 'profesional', 'Consulta: requerimiento de selección no incluido (sugiere Profesional)');
    const voz = await usarHerramienta(a, 'consulta_voz');
    ok(!voz.ok && voz.body.plan_sugerido === 'especialista', 'Consulta: voz no incluida (sugiere Especialista)');
    const ops = [];
    ops.push(await usarHerramienta(a, 'requerimiento_menor'));
    ops.push(await usarHerramienta(a, 'evaluacion_requerimiento_menor'));
    ops.push(await usarHerramienta(a, 'requerimiento_menor'));
    ok(ops.every((o) => o.ok), 'Consulta: 3 operaciones combinadas de contratos menores (generar y evaluar)');
    const cuarta = await usarHerramienta(a, 'requerimiento_menor');
    ok(!cuarta.ok && cuarta.body.error === 'limite_del_plan', 'Consulta: la cuarta operación se rechaza por el límite del plan');
    const e2 = await bolsaDelUsuario(a);
    ok(e2.disponibles === 200 - 40 - 24 - 40, `créditos descontados: 200 − 104 = ${e2.disponibles}`);

    // 3. Reembolso: una tarea que falla devuelve sus créditos.
    const b1 = await usarHerramienta(a, 'busqueda_avanzada');
    if (b1.ok) await b1.reembolsar('prueba de reembolso');
    ok((await bolsaDelUsuario(a)).disponibles === e2.disponibles, 'reembolso: la búsqueda fallida no cuesta');

    // 4. Recarga: amplía el saldo, no desbloquea herramientas.
    await recargar({ userId: a, creditos: 100, hechoPor: a });
    const e3 = await bolsaDelUsuario(a);
    ok(e3.recargas === 100 && e3.disponibles === e2.disponibles + 100, `recarga de 100: ${e3.disponibles} disponibles`);
    ok(!(await usarHerramienta(a, 'consulta_voz')).ok, 'la recarga no desbloquea la voz');

    // 5. Profesional: ofertas, 2 por análisis y 3 análisis al mes.
    await asignarPlan({ userId: a, plan: 'profesional', modalidad: 'anual', meses: 12, hechoPor: a });
    const tres = await usarHerramienta(a, 'evaluacion_ofertas', { unidades: 3 });
    ok(!tres.ok && tres.body.error === 'limite_del_plan', 'Profesional: 3 ofertas en un análisis se rechaza (máximo 2)');
    const dos = await usarHerramienta(a, 'evaluacion_ofertas', { unidades: 2 });
    ok(dos.ok && dos.creditos === 60, 'Profesional: 2 ofertas = 60 créditos');

    // 6. Concurrencia: 30 consumos simultáneos no gastan dos veces el mismo saldo.
    await asignarPlan({ userId: b, plan: 'consulta', modalidad: 'mensual', meses: 1, creditosMes: 25, hechoPor: b });
    const r = await Promise.all(Array.from({ length: 30 }, () => usarHerramienta(b, 'consulta_texto')));
    const aceptados = r.filter((x) => x.ok).length;
    ok(aceptados === 25 && (await bolsaDelUsuario(b)).disponibles === 0, `30 preguntas simultáneas con 25 créditos: se aceptan ${aceptados}`);

    // 7. Equipos: bolsa compartida e invitación.
    await asignarPlan({ userId: a, plan: 'equipos', modalidad: 'mensual', meses: 1, nombreEquipo: 'Equipo de prueba', hechoPor: a });
    const inv = await crearInvitacion(a);
    await aceptarInvitacion(b, inv.token);
    const eb = await bolsaDelUsuario(b);
    ok(eb.plan === 'equipos' && eb.equipo?.nombre === 'Equipo de prueba' && eb.disponibles === 2000, `el invitado usa la bolsa del equipo (${eb.plan}, ${eb.disponibles})`);
    await usarHerramienta(b, 'consulta_voz', { unidades: 10 });
    ok((await bolsaDelUsuario(a)).disponibles === 2000 - 30, 'lo que gasta un miembro baja la bolsa del propietario');
    const resumen = await resumenDeCuenta(a);
    ok(resumen.equipo?.miembros.length === 2, `el propietario ve ${resumen.equipo?.miembros.length} miembros`);
    await quitarMiembro(a, b);
    ok((await bolsaDelUsuario(b)).plan === 'consulta', 'al salir del equipo, el miembro vuelve a su propia bolsa');
    let reusada = '';
    try {
      await aceptarInvitacion(b, inv.token);
    } catch (e) {
      reusada = (e as Error).message;
    }
    ok(/ya se usó/.test(reusada), 'la invitación es de un solo uso');
  } finally {
    // Limpieza: equipo, bolsas y usuarios temporales.
    await db.from('equipos').delete().eq('propietario', a);
    await db.auth.admin.deleteUser(a);
    await db.auth.admin.deleteUser(b);
  }
  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Planes y créditos funcionan.');
  process.exit(fallas ? 1 : 0);
})();
