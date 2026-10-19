/**
 * Prueba del sistema de planes con créditos (migración 0086) contra la
 * base real, con tres usuarios temporales que se borran al final.
 * Desde la 0087 también: recargas que vencen a los 30 días, consumo del
 * lote que vence primero, renovación mensual del plan anual, 3 ofertas
 * por análisis en Profesional y el tope de tamaño por oferta.
 * Uso: npx tsx scripts/pruebas/creditos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { bolsaDelUsuario, sumarMeses, usarHerramienta } from '../../src/lib/billing/creditos';
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
  const c = await usuario('c');
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

    // 5. Profesional: ofertas, 3 por análisis y 3 análisis al mes (César, 18/10/2026).
    await asignarPlan({ userId: a, plan: 'profesional', modalidad: 'anual', meses: 12, hechoPor: a });
    const cuatro = await usarHerramienta(a, 'evaluacion_ofertas', { unidades: 4 });
    ok(!cuatro.ok && cuatro.body.error === 'limite_del_plan', 'Profesional: 4 ofertas en un análisis se rechaza (máximo 3)');
    const tres = await usarHerramienta(a, 'evaluacion_ofertas', { unidades: 3 });
    ok(tres.ok && tres.creditos === 90, `Profesional: 3 ofertas aceptadas = 90 créditos (${tres.ok ? tres.creditos : tres.body.error})`);

    // 5b. Tamaño por oferta: Profesional 60 MB, Especialista 120 MB.
    const MB = 1024 * 1024;
    const p61 = await usarHerramienta(a, 'evaluacion_ofertas', {
      soloComprobar: true,
      bytesPorOferta: [{ nombre: 'a.pdf', bytes: 10 * MB }, { nombre: 'grande.pdf', bytes: 61 * MB }],
    });
    ok(
      !p61.ok && p61.body.error === 'limite_del_plan' && p61.body.plan_sugerido === 'especialista' && /60 MB/.test(p61.body.message),
      `Profesional: una oferta de 61 MB se rechaza y sugiere Especialista («${p61.ok ? '' : p61.body.message}»)`,
    );
    const p59 = await usarHerramienta(a, 'evaluacion_ofertas', { soloComprobar: true, bytesPorOferta: [{ nombre: 'b.pdf', bytes: 59 * MB }] });
    ok(p59.ok, 'Profesional: una oferta de 59 MB pasa');

    // 5c. Plan anual: renueva los créditos cada mes, contado desde el
    // inicio del plan. Se simula un plan que empezó el 31/01 de este año:
    // el periodo de hoy va del último día del mes pasado al último de este.
    const ahora = new Date();
    const inicio = new Date(Date.UTC(ahora.getUTCFullYear(), 0, 31, 15, 0, 0));
    const finDeEnero = sumarMeses(inicio, 1); // 28 o 29 de febrero
    await db
      .from('bolsas_de_creditos')
      .update({
        inicio_plan: inicio.toISOString(),
        periodo_inicio: inicio.toISOString(),
        periodo_fin: finDeEnero.toISOString(),
        vence_at: sumarMeses(inicio, 12).toISOString(),
        usados_periodo: 500,
      })
      .eq('user_id', a);
    // Los tres análisis del mes, en un periodo anterior: no cuentan para el de hoy.
    await db
      .from('movimientos_de_creditos')
      .update({ created_at: new Date(inicio.getTime() + 86_400_000).toISOString() })
      .eq('herramienta', 'evaluacion_ofertas')
      .eq('bolsa_id', (await bolsaDelUsuario(a)).bolsa.id);
    const ea = await bolsaDelUsuario(a);
    let k = 0;
    while (sumarMeses(inicio, k + 1).getTime() <= Date.now()) k++;
    const esperadoInicio = sumarMeses(inicio, k).toISOString();
    const esperadoFin = sumarMeses(inicio, k + 1).toISOString();
    ok(
      ea.delMes === 500 && ea.periodoInicio === esperadoInicio && ea.renovacion === esperadoFin,
      `anual: en el mes ${k + 1} del plan, 500 créditos nuevos; periodo ${ea.periodoInicio.slice(0, 10)} → ${ea.renovacion.slice(0, 10)}`,
    );
    const usoAnual = await usarHerramienta(a, 'evaluacion_ofertas', { unidades: 1 });
    ok(usoAnual.ok, 'anual: los análisis del mes pasado no cuentan para el límite de este mes');
    const { data: bd } = await db.from('bolsas_de_creditos').select('periodo_inicio, periodo_fin, usados_periodo').eq('user_id', a).single();
    ok(
      new Date(bd!.periodo_inicio).toISOString() === esperadoInicio &&
        new Date(bd!.periodo_fin).toISOString() === esperadoFin &&
        bd!.usados_periodo === 30,
      `anual: la base renovó igual (${String(bd!.periodo_inicio).slice(0, 10)} → ${String(bd!.periodo_fin).slice(0, 10)}, usados ${bd!.usados_periodo})`,
    );
    // Al terminar el año, no se renueva más: el plan vence.
    await db
      .from('bolsas_de_creditos')
      .update({ vence_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('user_id', a);
    const vencidoAnual = await usarHerramienta(a, 'consulta_texto');
    ok(!vencidoAnual.ok && vencidoAnual.body.error === 'plan_vencido', 'anual: cumplido el año, el plan vence');

    // 5d. Recargas que vencen a los 30 días y consumo del lote que vence primero.
    await asignarPlan({ userId: c, plan: 'especialista', modalidad: 'mensual', meses: 1, creditosMes: 10, hechoPor: c });
    const { loteId: viejo } = await recargar({ userId: c, creditos: 50, detalle: 'lote viejo', hechoPor: c });
    const { loteId: nuevo } = await recargar({ userId: c, creditos: 40, detalle: 'lote nuevo', hechoPor: c });
    const { data: lote } = await db.from('recargas_de_creditos').select('activada_at, vence_at').eq('id', nuevo).single();
    const dias = (new Date(lote!.vence_at).getTime() - new Date(lote!.activada_at).getTime()) / 86_400_000;
    ok(Math.abs(dias - 30) < 0.001, `la recarga vence a los 30 días calendario de activada (${dias.toFixed(3)} días)`);
    // El viejo vence en 5 días; el nuevo, en 30.
    await db
      .from('recargas_de_creditos')
      .update({ activada_at: new Date(Date.now() - 25 * 86_400_000).toISOString(), vence_at: new Date(Date.now() + 5 * 86_400_000).toISOString() })
      .eq('id', viejo);
    const pe = await usarHerramienta(c, 'evaluacion_ofertas', {
      soloComprobar: true,
      bytesPorOferta: [{ nombre: 'x.pdf', bytes: 119 * MB }],
    });
    const pe2 = await usarHerramienta(c, 'evaluacion_ofertas', {
      soloComprobar: true,
      bytesPorOferta: [{ nombre: 'x.pdf', bytes: 121 * MB }],
    });
    ok(pe.ok && !pe2.ok && pe2.body.error === 'limite_del_plan', 'Especialista: 119 MB pasa y 121 MB se rechaza');
    const ec0 = await bolsaDelUsuario(c);
    ok(ec0.disponibles === 100 && ec0.lotes[0]?.id === viejo, `10 del mes + 50 + 40 de recargas = ${ec0.disponibles}; primero el que vence antes`);
    const gasto = await usarHerramienta(c, 'documentos_ejecucion', { creditos: 25 }); // 10 del mes + 15 del lote viejo
    const lotesDe = async () => {
      const { data } = await db.from('recargas_de_creditos').select('id, saldo').in('id', [viejo, nuevo]);
      return new Map((data ?? []).map((x) => [x.id as string, x.saldo as number]));
    };
    let saldos = await lotesDe();
    ok(gasto.ok && saldos.get(viejo) === 35 && saldos.get(nuevo) === 40, `consumo: 10 del mes y 15 del lote que vence primero (viejo ${saldos.get(viejo)}, nuevo ${saldos.get(nuevo)})`);
    if (gasto.ok) await gasto.reembolsar('prueba: devolución a su lote');
    saldos = await lotesDe();
    const ec1 = await bolsaDelUsuario(c);
    ok(saldos.get(viejo) === 50 && ec1.delMes === 10, `reembolso: los 15 vuelven al lote viejo y los 10 al mes (lote ${saldos.get(viejo)}, mes ${ec1.delMes})`);
    // Vence el lote viejo: deja de contar y queda anotado.
    await db
      .from('recargas_de_creditos')
      .update({ activada_at: new Date(Date.now() - 31 * 86_400_000).toISOString(), vence_at: new Date(Date.now() - 86_400_000).toISOString() })
      .eq('id', viejo);
    const ec2 = await bolsaDelUsuario(c);
    ok(ec2.recargas === 40 && ec2.disponibles === 50, `vencido el lote viejo, quedan 40 de recargas (${ec2.recargas}) y 50 disponibles`);
    const sesenta = await usarHerramienta(c, 'documentos_ejecucion', { creditos: 60 });
    ok(!sesenta.ok && sesenta.body.error === 'sin_creditos', 'el saldo vencido no se puede gastar');
    const ultimos = await usarHerramienta(c, 'documentos_ejecucion', { creditos: 50 });
    ok(ultimos.ok && (await bolsaDelUsuario(c)).disponibles === 0, 'los 50 vigentes sí se gastan');
    // El consumo anota el vencimiento del lote viejo (con su saldo en cero).
    const { data: venc } = await db.from('movimientos_de_creditos').select('creditos').eq('recarga_id', viejo).eq('origen', 'vencimiento');
    saldos = await lotesDe();
    ok(venc?.length === 1 && venc[0].creditos === -50 && saldos.get(viejo) === 0, `el vencimiento queda en los movimientos (${venc?.[0]?.creditos}) y el lote en 0`);
    // Puente: el código anterior sumaba a `saldo_recargas`; eso pasa a un lote de 30 días.
    await db.from('bolsas_de_creditos').update({ saldo_recargas: 7 }).eq('id', ec0.bolsa.id);
    const { data: puente } = await db.from('bolsas_de_creditos').select('saldo_recargas').eq('id', ec0.bolsa.id).single();
    const ec3 = await bolsaDelUsuario(c);
    ok(puente?.saldo_recargas === 0 && ec3.recargas === 7, `una recarga hecha con el código anterior queda como lote (${ec3.recargas})`);
    // RLS: sin sesión no se ve ningún lote.
    const anonimo = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { data: ajenos, error: errAnon } = await anonimo.from('recargas_de_creditos').select('id');
    ok(!errAnon && (ajenos ?? []).length === 0, `RLS: la clave anónima no ve lotes (${(ajenos ?? []).length})`);

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
    await db.auth.admin.deleteUser(c);
  }
  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Planes y créditos funcionan.');
  process.exit(fallas ? 1 : 0);
})();
