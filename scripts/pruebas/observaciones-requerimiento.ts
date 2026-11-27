/**
 * Observaciones del requerimiento editadas y añadidas a mano, su contraste
 * con la biblioteca y el Word de las seleccionadas (reunión con César del
 * 27/11/2026).
 *
 * Sin Gemini: edición sobre el original, historial, borrado, observación
 * manual, Word solo con las seleccionadas. Con Gemini (dos llamadas, unos
 * centavos; solo lee la base): una observación equivocada debe salir «no
 * procede» o «sin sustento», y una correcta, «procede».
 *
 * Uso: npx tsx scripts/pruebas/observaciones-requerimiento.ts [--sin-modelo]
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import type { HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import { conEdicion, type CamposDeObservacion } from '@/lib/evaluacion/requerimiento/observaciones';
import {
  aplicarBorrado,
  aplicarCambio,
  aplicarManualNueva,
  crearManual,
  guardar,
  type ResultadoConObservaciones,
} from '@/lib/evaluacion/requerimiento/guardar-observaciones';
import { observacionesADocx } from '@/lib/evaluacion/requerimiento/informe-observaciones';
import { citaEnElTexto, contrastarObservacion } from '@/lib/evaluacion/requerimiento/contrastar-observacion';

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

const original: HallazgoDeAuditoria = {
  id: 'tema_penalidades_1',
  categoria: 'penalidades',
  severidad: 'alto',
  titulo: 'Otras penalidades sin procedimiento de verificación',
  ubicacion: 'Pág. 25 · Cap. CONDICIONES · Numeral 3.3 · Literal f)',
  ubicacion_detalle: { pagina: '25', capitulo: 'CONDICIONES', numeral: '3.3', literal: 'f)' },
  extracto_literal: 'Por no portar uniforme: S/ 200 por ocurrencia.',
  descripcion: 'La penalidad no indica cómo se verifica.',
  recomendacion: 'Precisar el procedimiento de verificación.',
  solicitud: 'precisar',
  fundamento_normativo: [{ norma: 'Reglamento de la Ley N° 32069' }, { norma: 'Pronunciamiento N° 242-2026/OECE-DSAT', articulo: 'Pronunciamiento del OECE: exige supuesto, cálculo y verificación.' }],
};
const otro: HallazgoDeAuditoria = { ...original, id: 'auditor_2', titulo: 'TITULO_NO_SELECCIONADO', extracto_literal: 'otro' };

const TEXTO_REQ = `3.3 CONDICIONES DE CONTRATACIÓN
f) Otras penalidades: Por no portar uniforme: S/ 200 por ocurrencia. Por retraso en el informe mensual: 5 % del monto del contrato por cada día de atraso.
d) El contratista deberá contar con un taller ubicado a no más de 7 km de la sede de la Entidad.
4. CONFORMIDAD: La conformidad será otorgada.`;

void (async () => {
  // ── Edición sobre el original ──
  let r: ResultadoConObservaciones = { hallazgos: [original, otro] };
  const c1 = aplicarCambio(r, original.id, { descripcion: 'Fundamento corregido por el especialista.' }, undefined);
  ok(c1?.edicion?.version === 1 && c1.edicion.historial.length === 0, 'primera edición: versión 1, sin historial');
  r = c1!.resultado;
  const c2 = aplicarCambio(r, original.id, { recomendacion: 'Nueva solicitud.', solicitud: 'modificar' }, undefined);
  r = c2!.resultado;
  ok(c2?.edicion?.version === 2 && c2.edicion.historial.length === 1 && c2.edicion.historial[0].version === 1, 'segunda edición guarda la anterior en el historial');
  ok(r.hallazgos![0].descripcion === original.descripcion, 'el hallazgo original de la IA queda intacto');
  const visto = conEdicion(r.hallazgos![0], r.ediciones![original.id]);
  ok(visto.descripcion === 'Fundamento corregido por el especialista.' && visto.recomendacion === 'Nueva solicitud.' && visto.solicitud === 'modificar' && visto.editado, 'conEdicion aplica los cambios acumulados');
  ok(aplicarCambio(r, 'no_existe', { titulo: 'x' }, undefined) === null, 'un id que no existe no se guarda');
  let historial = r;
  for (let i = 0; i < 30; i++) historial = aplicarCambio(historial, original.id, { titulo: `Título ${i}` }, undefined)!.resultado;
  ok(historial.ediciones![original.id].historial.length === 20, 'el historial se corta en 20 versiones');

  // ── Manual ──
  const campos: CamposDeObservacion = {
    titulo: 'Taller a 7 km restringe la concurrencia',
    severidad: 'alto',
    categoria: 'otro',
    ubicacion_detalle: { pagina: '25', capitulo: 'CONDICIONES', numeral: '3.3', literal: 'd)' },
    extracto_literal: 'El contratista deberá contar con un taller ubicado a no más de 7 km de la sede de la Entidad.',
    descripcion: 'Exigir un taller a 7 km limita la participación sin sustento técnico.',
    solicitud: 'suprimir',
    recomendacion: 'Suprimir la distancia máxima o sustentarla.',
    marco_normativo: 'Artículo 2 de la Ley N° 32069',
  };
  const m = crearManual(campos, undefined, new Date('2026-11-27T12:00:00Z'));
  ok(m.id.startsWith('manual_') && m.origen === 'manual' && m.ubicacion.includes('Literal d)'), 'observación manual con id, origen y ubicación');
  ok(m.fundamento_normativo?.[0]?.norma === 'Artículo 2 de la Ley N° 32069', 'el marco normativo entra como fundamento');
  r = aplicarManualNueva(r, m);
  const cm = aplicarCambio(r, m.id, { severidad: 'critico' }, undefined);
  ok(cm?.hallazgo?.severidad === 'critico' && !cm.edicion, 'editar una manual cambia la observación misma');
  r = cm!.resultado;

  // ── Borrado ──
  const sinEdicion = aplicarBorrado(r, original.id);
  ok(sinEdicion && !sinEdicion.ediciones?.[original.id], 'borrar un hallazgo de la IA quita solo su edición');
  const sinManual = aplicarBorrado(r, m.id);
  ok(sinManual && (sinManual.manuales ?? []).length === 0, 'borrar una manual la quita');
  ok(aplicarBorrado({ hallazgos: [original] }, original.id) === null, 'borrar un hallazgo sin edición no hace nada');

  // ── Cita en el texto ──
  ok(citaEnElTexto(campos.extracto_literal, TEXTO_REQ) === true, 'la cita que está en el requerimiento se reconoce');
  ok(citaEnElTexto('El contratista entregará cuarenta camiones blindados nuevos.', TEXTO_REQ) === false, 'una cita que no está se detecta');
  ok(citaEnElTexto('(omisión) No se indica la conformidad', TEXTO_REQ) === null, 'una omisión no se comprueba');

  // ── Word solo con las seleccionadas ──
  const buf = await observacionesADocx({
    denominacion: 'Servicio de mantenimiento de vehículos',
    observaciones: [visto, cm!.hallazgo!],
    caratula: { entidad: 'Municipalidad de Prueba', elaboradoPor: 'Área de abastecimiento', fecha: '2026-11-27' },
  });
  const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
  const plano = xml.replace(/<[^>]+>/g, '');
  ok(buf.length > 2_000, `Word generado (${buf.length} bytes)`);
  ok(plano.includes('Taller a 7 km restringe la concurrencia') && plano.includes(visto.titulo), 'trae las dos seleccionadas');
  ok(!plano.includes('TITULO_NO_SELECCIONADO'), 'no trae la que no se seleccionó');
  ok(plano.includes('1. Sustento fáctico') && plano.includes('3. Solicitud') && plano.includes('Municipalidad de Prueba'), 'forma del pliego y carátula');
  ok(plano.includes('Pronunciamiento N° 242-2026/OECE-DSAT'), 'los precedentes van en el sustento jurídico');

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // ── Guardado con sello, contra la base (usuario y evaluación temporales) ──
  const { data: u, error: eu } = await db.auth.admin.createUser({
    email: `prueba-observaciones-${Date.now()}@ejemplo.test`,
    password: `Base-${Date.now()}-x9`,
    email_confirm: true,
  });
  if (eu) throw eu;
  try {
    const { data: ev, error: ee } = await db
      .from('evaluations')
      .insert({ user_id: u.user!.id, title: 'Prueba', status: 'done', mode: 'tdr_audit', result: { hallazgos: [original, otro] } } as never)
      .select('id')
      .single();
    if (ee) throw ee;
    const id = (ev as { id: string }).id;
    const [a, b] = await Promise.all([
      guardar(db, id, (act) => {
        const c = aplicarCambio(act, original.id, { titulo: 'Desde la pestaña A' }, undefined);
        return c ? { resultado: c.resultado, salida: 'a' } : null;
      }),
      guardar(db, id, (act) => {
        const c = aplicarCambio(act, otro.id, { titulo: 'Desde la pestaña B' }, undefined);
        return c ? { resultado: c.resultado, salida: 'b' } : null;
      }),
    ]);
    const { data: fin } = await db.from('evaluations').select('result').eq('id', id).single();
    const res = (fin as { result: ResultadoConObservaciones }).result;
    ok(a.ok && b.ok, `dos guardados a la vez terminan bien (${a.ok ? 'ok' : (a as { motivo: string }).motivo}, ${b.ok ? 'ok' : (b as { motivo: string }).motivo})`);
    ok(
      res.ediciones?.[original.id]?.campos.titulo === 'Desde la pestaña A' && res.ediciones?.[otro.id]?.campos.titulo === 'Desde la pestaña B' && res.observaciones_rev === 2,
      'ninguno pisa al otro y el sello queda en 2',
    );
    const m2 = await guardar(db, id, (act) => ({ resultado: aplicarManualNueva(act, crearManual(campos)), salida: true }));
    const { data: fin2 } = await db.from('evaluations').select('result').eq('id', id).single();
    const res2 = (fin2 as { result: ResultadoConObservaciones }).result;
    ok(m2.ok && res2.manuales?.length === 1 && res2.ediciones?.[original.id], 'la manual se agrega sin perder las ediciones');
  } finally {
    await db.auth.admin.deleteUser(u.user!.id).catch(() => {});
  }

  // ── Contraste con el modelo ──
  if (!process.argv.includes('--sin-modelo')) {
    const t0 = Date.now();
    const mal = await contrastarObservacion(
      db,
      {
        titulo: 'La penalidad del 5 % diario por retraso del informe es adecuada',
        severidad: 'bajo',
        categoria: 'penalidades',
        ubicacion_detalle: { pagina: '25', capitulo: 'CONDICIONES', numeral: '3.3', literal: 'f)' },
        extracto_literal: 'Por retraso en el informe mensual: 5 % del monto del contrato por cada día de atraso.',
        descripcion: 'Una penalidad del 5 % del monto del contrato por cada día de retraso en un informe es proporcional y conforme al Reglamento; no hay nada que corregir.',
        solicitud: 'precisar',
        recomendacion: 'Mantener la penalidad tal como está.',
      },
      { regimen: 'menor_8uit', objeto: 'servicios', textoDelRequerimiento: TEXTO_REQ },
    );
    console.log(`\nContraste equivocado (${((Date.now() - t0) / 1000).toFixed(0)} s): ${mal.veredicto} — ${mal.explicacion.slice(0, 220)}`);
    for (const f of mal.fuentes) console.log(`  - ${f.numero}: ${f.criterio.slice(0, 100)}`);
    ok(mal.veredicto === 'incompatible' || mal.veredicto === 'evidencia_insuficiente', 'la observación equivocada no procede');
    ok(mal.fuentes.every((f) => f.documentId && f.numero), 'sus fuentes son documentos de la biblioteca');

    const bien = await contrastarObservacion(
      db,
      {
        titulo: 'No se regula el procedimiento ni el plazo de la conformidad',
        severidad: 'alto',
        categoria: 'conformidad',
        ubicacion_detalle: { pagina: '26', capitulo: 'CONFORMIDAD', numeral: '4', literal: 'No corresponde' },
        extracto_literal: 'La conformidad será otorgada.',
        descripcion: 'El requerimiento no dice quién otorga la conformidad, en qué plazo ni qué ocurre si hay observaciones, lo que deja sin regla la recepción de la prestación.',
        solicitud: 'incorporar',
        recomendacion: 'Incorporar el área que otorga la conformidad, el plazo y el procedimiento de subsanación.',
      },
      { regimen: 'menor_8uit', objeto: 'servicios', textoDelRequerimiento: TEXTO_REQ },
    );
    console.log(`Contraste correcto: ${bien.veredicto} — ${bien.explicacion.slice(0, 220)}`);
    for (const f of bien.fuentes) console.log(`  - ${f.numero}: ${f.criterio.slice(0, 100)}`);
    ok(bien.veredicto === 'compatible' || bien.veredicto === 'compatible_con_condiciones', 'la observación correcta procede');
    ok(bien.propuesta.descripcion.length > 40 && bien.propuesta.recomendacion.length > 20, 'propone una redacción');
  }

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ todo bien');
  process.exit(fallas ? 1 : 0);
})();
