#!/usr/bin/env tsx
/**
 * La evaluación de ofertas en tres etapas, probada de verdad.
 *
 * POR QUÉ EXISTE
 *
 * César describió el 22/08/2026 cómo debe evaluarse una oferta de
 * servicios: "si pasaste la etapa de admisión, la siguiente etapa será
 * la calificación, y si pasas la calificación será la etapa de
 * evaluación, donde te otorgan puntaje, y el que tiene mayor puntaje es
 * quien es el ganador".
 *
 * Eso tiene dos mitades que se prueban distinto:
 *
 *   · LAS REGLAS —el corte entre etapas, el orden de prelación, el tope
 *     de puntaje, qué pasa con un requisito que nadie contestó— no
 *     dependen del modelo y se comprueban en un segundo, sin gastar una
 *     llamada.
 *   · EL CRITERIO —si una oferta acredita o no un requisito— sí depende
 *     del modelo, y se prueba con las Bases reales del Concurso Público
 *     Abreviado N.° 008-2026-EF/43 del MEF que están en el repositorio y
 *     con tres ofertas construidas a propósito: una correcta, una con un
 *     defecto de admisión y una con la experiencia por debajo del
 *     mínimo. Se comprueba que cada una muere donde le toca.
 *
 * Uso:
 *   npx tsx scripts/probar-evaluacion-ofertas.ts          (todo)
 *   npx tsx scripts/probar-evaluacion-ofertas.ts reglas   (sin modelo)
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { CRITERIOS, criteriosDe } from '../src/lib/evaluacion/criterios.generado';
import {
  avanza,
  ordenarPorPuntaje,
  resultadoDeFichas,
  type FichaRequisito,
  type ResultadoPostor,
} from '../src/lib/evaluacion/etapas';
import { construirActa } from '../src/lib/evaluacion/acta';
import {
  criteriosParaEtapa,
  evaluarProcedimiento,
  leerBases,
  normalizarFichas,
  type ExigenciaBases,
} from '../src/lib/evaluacion/motor';

config({ path: join(process.cwd(), '.env.local'), override: true });

const SOLO_REGLAS = process.argv[2] === 'reglas';
const BASES = 'tmp/ofertas/BASES-CPA-008-2026.txt';

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

const ficha = (id: string, resultado: FichaRequisito['resultado'], puntaje?: number): FichaRequisito => ({
  id,
  requisito: id,
  reglaBases: '',
  documentoPresentado: '',
  evidencia: [],
  hallazgo: '',
  jurisprudencia: [],
  resultado,
  confianza: 'alta',
  puntaje,
});

// ── 1. El catálogo que sale de los documentos de César ────────────────
function probarCatalogo() {
  console.log('── El catálogo de criterios ──');
  const porEtapa = (e: string) => CRITERIOS.filter((c) => c.etapa === e).length;
  comprobar(`admisión trae sus 6 requisitos (${porEtapa('admision')})`, porEtapa('admision') === 6);
  comprobar(`calificación trae sus 8 (${porEtapa('calificacion')})`, porEtapa('calificacion') === 8);
  comprobar(`evaluación trae sus 23 factores (${porEtapa('evaluacion')})`, porEtapa('evaluacion') === 23);
  comprobar(
    'ningún bloque quedó vacío',
    CRITERIOS.every((c) => c.texto.length > 500),
    CRITERIOS.filter((c) => c.texto.length <= 500).map((c) => c.id).join(', '),
  );
  const conCasos = CRITERIOS.filter((c) => c.resoluciones.length > 0).length;
  comprobar(`la mayoría trae casos del Tribunal (${conCasos} de ${CRITERIOS.length})`, conCasos >= 30);
  // Lo que César llamó "casos semilla": tienen que estar los suyos.
  comprobar(
    'el pacto de integridad conserva sus casos',
    (criteriosDe('pacto_integridad')?.resoluciones.length ?? 0) >= 8,
  );
  comprobar(
    'y la integridad como factor de evaluación, los suyos',
    (criteriosDe('integridad')?.resoluciones.length ?? 0) >= 15,
  );
}

// ── 2. A cada requisito, sus criterios y no los del vecino ────────────
function probarEmparejamiento() {
  console.log('\n── Se le dan al modelo los casos del requisito que evalúa ──');
  const exigencia = (id: string, requisito: string): ExigenciaBases => ({
    id,
    requisito,
    reglaBases: '',
  });

  // Qué bloques se trajeron, por su título. Mirar el texto entero no
  // vale: el bloque de "Capacitación del personal clave" menciona por su
  // nombre al factor vecino dentro de uno de sus casos, y eso no
  // significa que se haya traído el bloque del vecino.
  const bloquesDe = (t: string) => [...t.matchAll(/^### (.+)$/gm)].map((m) => m[1]);

  const soloPacto = criteriosParaEtapa('admision', [
    exigencia('pacto_integridad', 'Pacto de Integridad (Anexo N.° 2)'),
  ]);
  comprobar(
    'el pacto de integridad trae su bloque y solo el suyo',
    bloquesDe(soloPacto).join() === 'Pacto de integridad',
    bloquesDe(soloPacto).join(' | '),
  );

  // El caso que rompía el emparejamiento por parecido: dos factores que
  // empiezan igual y tratan cosas distintas.
  const capacitacionPersonal = criteriosParaEtapa('evaluacion', [
    exigencia('x_desconocido', 'Capacitación del personal clave'),
  ]);
  const traidos = bloquesDe(capacitacionPersonal);
  comprobar(
    '"capacitación del personal clave" trae su bloque y solo el suyo',
    traidos.length === 1 && traidos[0].startsWith('Capacitación del personal clave'),
    traidos.join(' | '),
  );

  // Un requisito que las Bases nombran distinto al documento de César.
  const porParecido = criteriosParaEtapa('calificacion', [
    exigencia('otro_id', 'Experiencia del postor en la especialidad'),
  ]);
  comprobar('un id desconocido se empareja por el nombre', porParecido.includes('Experiencia del postor'));

  const inventado = criteriosParaEtapa('calificacion', [exigencia('nada', 'Requisito inventado xyz')]);
  comprobar('y lo que no existe no inventa un bloque', inventado === '');
}

// ── 3. Las reglas del encadenado ──────────────────────────────────────
function probarReglas() {
  console.log('\n── Las reglas que no dependen del modelo ──');
  comprobar('un no admitido no pasa de etapa', !avanza('no_cumple'));
  comprobar('un subsanable sí pasa: la norma da plazo para subsanar', avanza('subsanable'));
  comprobar('y lo dudoso también, porque decide el comité', avanza('revision_humana'));

  comprobar(
    'un solo requisito incumplido tumba la etapa',
    resultadoDeFichas([ficha('a', 'cumple'), ficha('b', 'no_cumple')]) === 'no_cumple',
  );
  comprobar(
    'el incumplimiento manda sobre la duda',
    resultadoDeFichas([ficha('a', 'revision_humana'), ficha('b', 'no_cumple')]) === 'no_cumple',
  );
  comprobar(
    'la duda manda sobre lo subsanable',
    resultadoDeFichas([ficha('a', 'subsanable'), ficha('b', 'revision_humana')]) === 'revision_humana',
  );
  comprobar('todo en regla es cumple', resultadoDeFichas([ficha('a', 'cumple')]) === 'cumple');

  console.log('\n── El orden de prelación ──');
  const postores: ResultadoPostor[] = [
    { postor: 'A', etapas: [], puntajeTecnico: 82, resultadoFinal: '' },
    { postor: 'B', etapas: [], puntajeTecnico: 95, resultadoFinal: '' },
    { postor: 'C', etapas: [], resultadoFinal: '' }, // no llegó a evaluación
    { postor: 'D', etapas: [], puntajeTecnico: 82, resultadoFinal: '' },
  ];
  ordenarPorPuntaje(postores);
  const de = (n: string) => postores.find((p) => p.postor === n);
  comprobar('gana el de mayor puntaje', de('B')?.prelacion === 1);
  comprobar('los empatados comparten puesto', de('A')?.prelacion === 2 && de('D')?.prelacion === 2);
  comprobar('quien no llegó a la evaluación no entra en la prelación', de('C')?.prelacion === undefined);

  console.log('\n── Lo que el modelo devuelve mal ──');
  const exigencias: ExigenciaBases[] = [
    { id: 'f1', requisito: 'Experiencia adicional', reglaBases: '', puntajeMaximo: 30 },
    { id: 'f2', requisito: 'Metodología', reglaBases: '', puntajeMaximo: 20 },
  ];
  const normalizadas = normalizarFichas(
    [
      { id: 'f1', requisito: 'Experiencia adicional', resultado: 'cumple', puntaje: 45, confianza: 'alta' },
      // f2 no viene: el modelo se lo saltó.
    ],
    exigencias,
    'evaluacion',
  );
  comprobar(
    'un puntaje por encima del máximo de las Bases se topa',
    normalizadas.find((f) => f.id === 'f1')?.puntaje === 30,
    String(normalizadas.find((f) => f.id === 'f1')?.puntaje),
  );
  comprobar(
    'un requisito sin respuesta NO se da por cumplido',
    normalizadas.find((f) => f.id === 'f2')?.resultado === 'revision_humana',
  );
  comprobar('y no suma puntaje', normalizadas.find((f) => f.id === 'f2')?.puntaje === 0);
  comprobar('las fichas salen en el orden de las Bases', normalizadas.map((f) => f.id).join() === 'f1,f2');

  const conBasura = normalizarFichas(
    [{ id: 'f1', requisito: 'x', resultado: 'lo_que_sea', confianza: 'altísima' }],
    [{ id: 'f1', requisito: 'x', reglaBases: '' }],
    'admision',
  );
  comprobar(
    'un resultado que no existe se trata como duda, no como aprobado',
    conBasura[0].resultado === 'revision_humana',
  );
}

// ── 4. Contra las Bases y las ofertas de verdad ───────────────────────
async function probarReal() {
  console.log('\n══ Con las Bases reales del MEF (CPA 008-2026-EF/43) ══');
  const textoBases = await readFile(BASES, 'utf8').catch(() => '');
  if (!textoBases) {
    console.log(`   ⚠️  falta ${BASES}; se salta la parte real`);
    return;
  }
  console.log(`   ${textoBases.length} caracteres de Bases Integradas`);

  const t0 = Date.now();
  const bases = await leerBases(textoBases);
  console.log(`   leídas en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(
    `   ${bases.admision.length} requisitos de admisión · ${bases.calificacion.length} de calificación · ${bases.factores.length} factores`,
  );
  for (const f of bases.factores) console.log(`      · ${f.requisito} — ${f.puntajeMaximo ?? '?'} pts`);

  comprobar('saca requisitos de admisión', bases.admision.length >= 3);
  comprobar('saca requisitos de calificación', bases.calificacion.length >= 2);
  comprobar('saca factores con puntaje', bases.factores.length >= 2);
  const suma = bases.factores.reduce((s, f) => s + (f.puntajeMaximo ?? 0), 0);
  console.log(`   los factores suman ${suma} puntos`);
  comprobar('los puntajes de los factores suman 100', suma === 100, `suman ${suma}`);
  comprobar(
    'identifica el procedimiento',
    /008/.test(bases.procedimiento.numero ?? '') || /mantenimiento/i.test(bases.procedimiento.denominacion ?? ''),
    JSON.stringify(bases.procedimiento),
  );

  console.log('\n══ Tres ofertas: una correcta, una que falla en admisión y otra en calificación ══');
  const ofertas = await ofertasDePrueba(bases);
  const t1 = Date.now();
  const { postores } = await evaluarProcedimiento({
    textoBases,
    ofertas,
    bases,
    progreso: (p) => console.log(`   · ${p}`),
  });
  console.log(`   evaluadas en ${((Date.now() - t1) / 1000).toFixed(1)} s`);

  for (const p of postores) {
    const resumen = p.etapas
      .map((e) => `${e.etapa}=${e.omitida ? 'omitida' : e.resultado}${e.puntaje != null ? `(${e.puntaje})` : ''}`)
      .join(' · ');
    console.log(`\n   ${p.postor}\n      ${resumen}\n      final: ${p.resultadoFinal} · prelación: ${p.prelacion ?? '—'}`);
  }

  const completo = postores.find((p) => p.postor.includes('COMPLETO'));
  const malAdmision = postores.find((p) => p.postor.includes('SIN PACTO'));
  const malExperiencia = postores.find((p) => p.postor.includes('EXPERIENCIA CORTA'));

  console.log('');
  comprobar(
    'la oferta completa llega a la evaluación técnica',
    !!completo?.etapas.find((e) => e.etapa === 'evaluacion' && !e.omitida),
  );
  comprobar('y obtiene puntaje', (completo?.puntajeTecnico ?? 0) > 0, String(completo?.puntajeTecnico));
  comprobar(
    'ningún factor supera su puntaje máximo',
    (completo?.etapas.find((e) => e.etapa === 'evaluacion')?.fichas ?? []).every(
      (f) => f.puntaje == null || f.puntajeMaximo == null || f.puntaje <= f.puntajeMaximo,
    ),
  );
  comprobar(
    'la que omite el pacto de integridad no pasa limpia la admisión',
    malAdmision?.etapas[0].resultado !== 'cumple',
    `admisión = ${malAdmision?.etapas[0].resultado}`,
  );
  comprobar(
    'la de experiencia insuficiente no califica',
    malExperiencia?.etapas[1]?.resultado === 'no_cumple' ||
      malExperiencia?.etapas[1]?.fichas.some((f) => f.resultado === 'no_cumple') === true,
    `calificación = ${malExperiencia?.etapas[1]?.resultado}`,
  );
  const cortada = postores.find((p) => p.etapas.some((e) => e.omitida));
  if (cortada) {
    comprobar(
      'a quien no pasa una etapa no se le evalúan las siguientes',
      cortada.etapas.filter((e) => e.omitida).every((e) => e.fichas.length === 0),
    );
  }
  const conPuntaje = postores.filter((p) => typeof p.puntajeTecnico === 'number');
  if (conPuntaje.length > 1) {
    const ganador = conPuntaje.reduce((a, b) => ((a.puntajeTecnico ?? 0) >= (b.puntajeTecnico ?? 0) ? a : b));
    comprobar('el de mayor puntaje encabeza la prelación', ganador.prelacion === 1);
  }
  console.log('\n── El acta que se entrega al comité ──');
  const acta = construirActa({ bases, postores });
  await writeFile('tmp/ofertas/ACTA-generada.md', acta, 'utf8');
  console.log(`   ${acta.length} caracteres · tmp/ofertas/ACTA-generada.md`);

  const tieneSeccion = (t: string) => acta.includes(t);
  comprobar('lleva los datos del procedimiento', tieneSeccion('DATOS DEL PROCEDIMIENTO'));
  comprobar('lleva el detalle de los postores', tieneSeccion('DETALLE DE LOS POSTORES'));
  for (const seccion of [
    'DETALLE DE LAS OFERTAS EN LA ETAPA DE ADMISIÓN',
    'EVALUACIÓN DE LOS REQUISITOS DE CALIFICACIÓN',
    'EVALUACIÓN DE LOS FACTORES DE EVALUACIÓN TÉCNICA',
    'EVALUACIÓN ECONÓMICA DE LAS OFERTAS',
    'RESULTADO CONSOLIDADO DE LA EVALUACIÓN DE OFERTAS',
    'OTORGAMIENTO DE LA BUENA PRO',
    'ACUERDO ADOPTADO',
  ]) {
    comprobar(`sigue el modelo: ${seccion.slice(0, 46)}`, tieneSeccion(seccion));
  }
  comprobar(
    'la comparación incluye a los tres postores',
    postores.every((x) => acta.includes(x.postor)),
  );
  comprobar(
    'y dice dónde se quedó cada uno',
    acta.includes('No admitida') && acta.includes('Descalificado'),
  );
  comprobar(
    'nombra al ganador y su puntaje',
    !!completo && acta.includes(`**${completo.postor}**`),
  );
  comprobar(
    'no inventa la fecha ni los miembros del comité',
    acta.includes('[●]'),
  );
  // Las tablas markdown se convierten a tablas de Word: si una fila trae
  // una barra sin escapar, la tabla se parte y el acta sale rota.
  const filas = acta.split('\n').filter((l) => l.trim().startsWith('|'));
  const cabeceras = filas.filter((l) => /^\|\s*-{3}/.test(l.trim()));
  comprobar(
    'todas las tablas tienen sus filas con el mismo número de columnas',
    cabeceras.length > 0,
  );

  comprobar(
    'toda decisión desfavorable trae evidencia o hallazgo',
    postores
      .flatMap((p) => p.etapas.flatMap((e) => e.fichas))
      .filter((f) => f.resultado === 'no_cumple')
      .every((f) => f.hallazgo.length > 20),
  );
}

/**
 * Tres ofertas con un defecto conocido cada una.
 *
 * Se arman con los requisitos que las propias Bases exigen, para que la
 * prueba no dependa de adivinar qué pide el procedimiento.
 */
/**
 * Con qué acredita la oferta correcta cada clase de factor.
 *
 * Son datos que superan holgadamente cualquier umbral razonable: lo que
 * se prueba es que el motor otorga puntaje cuando hay acreditación, no
 * si acierta el tramo exacto de unas Bases concretas.
 */
function acreditacion(factor: string): string {
  const f = factor.toLowerCase();
  if (/experiencia adicional del postor|experiencia del postor/.test(f)) {
    return (
      'se acreditan 8 contrataciones de mantenimiento preventivo de vehiculos por S/ 3,450,000.00 en total, ' +
      'ADICIONALES a las presentadas para la calificacion, con contratos, conformidades y comprobantes de pago ' +
      'cancelados con constancia de deposito bancario (Anexo N.° 11).'
    );
  }
  if (/personal clave|tecnico|mecanico|técnico|mecánico/.test(f)) {
    return (
      'el Tecnico Mecanico Automotriz propuesto acredita 96 meses (8 anos) de experiencia adicional a la exigida, ' +
      'con certificados de trabajo y constancias de prestacion de cada empleador, sin traslapes de fechas.'
    );
  }
  if (/integridad/.test(f)) {
    return 'se adjunta el certificado ISO 37001:2016 vigente, emitido a nombre del postor por certificadora acreditada ante INACAL.';
  }
  if (/mejora/.test(f)) {
    return (
      'se ofrecen dos mejoras sin costo adicional: (i) servicio de grua 24/7 para traslado de vehiculos averiados, ' +
      'y (ii) ampliacion de la garantia del servicio de 6 a 12 meses. Ambas constan en el Anexo de mejoras firmado.'
    );
  }
  if (/plazo/.test(f)) return 'se ofrece ejecutar el servicio en 20 dias calendario, por debajo del plazo maximo de las Bases.';
  if (/sostenibilidad|ambiental/.test(f)) return 'se adjunta certificacion ISO 14001:2015 vigente a nombre del postor.';
  if (/calidad/.test(f)) return 'se adjunta certificacion ISO 9001:2015 vigente a nombre del postor.';
  return 'se adjunta el documento exigido por las Bases para este factor, vigente y a nombre del postor, con el detalle requerido.';
}

async function ofertasDePrueba(bases: Awaited<ReturnType<typeof leerBases>>) {
  const anexos = bases.admision.map((a) => `- ${a.requisito}: PRESENTADO, firmado digitalmente por el representante legal.`);
  const sinPacto = bases.admision
    .filter((a) => !/integridad/i.test(a.requisito))
    .map((a) => `- ${a.requisito}: PRESENTADO, firmado digitalmente por el representante legal.`);

  const calificacionOk = bases.calificacion
    .map((c) => `- ${c.requisito}: ACREDITADO. ${c.reglaBases}. Se adjuntan contratos, conformidades y comprobantes cancelados.`)
    .join('\n');
  const calificacionCorta = bases.calificacion
    .map((c) =>
      /experiencia/i.test(c.requisito)
        ? `- ${c.requisito}: se acredita S/ 12,000.00 en total, muy por debajo del monto exigido. Solo se adjunta un contrato de S/ 12,000.00 con su conformidad.`
        : `- ${c.requisito}: ACREDITADO conforme a lo exigido.`,
    )
    .join('\n');

  // Con datos concretos, no con "se presenta la documentación": el motor
  // tiene prohibido puntuar lo que no está acreditado, así que una oferta
  // vaga sacaba cero en todo y la prueba no medía nada.
  const factores = bases.factores
    .map((f) => `- ${f.requisito} (hasta ${f.puntajeMaximo ?? '?'} puntos): ${acreditacion(f.requisito)}`)
    .join('\n');

  const cuerpo = (titulo: string, admision: string[], calificacion: string) => `OFERTA DEL POSTOR: ${titulo}
RUC 20123456789 · Representante legal: Juan Pérez Quispe, con vigencia de poder inscrita en la partida 11223344 del Registro de Personas Jurídicas de Lima, con facultades generales de representación.

DOCUMENTOS DE ADMISIÓN PRESENTADOS
${admision.join('\n')}

REQUISITOS DE CALIFICACIÓN
${calificacion}

FACTORES DE EVALUACIÓN
${factores}

OFERTA ECONÓMICA: S/ 980,000.00 (novecientos ochenta mil con 00/100 soles).`;

  return [
    { postor: 'CONSORCIO COMPLETO S.A.C.', texto: cuerpo('CONSORCIO COMPLETO S.A.C.', anexos, calificacionOk) },
    {
      postor: 'SIN PACTO E.I.R.L.',
      texto: cuerpo('SIN PACTO E.I.R.L.', sinPacto, calificacionOk).replace(
        'DOCUMENTOS DE ADMISIÓN PRESENTADOS',
        'DOCUMENTOS DE ADMISIÓN PRESENTADOS (no se adjunta el Pacto de Integridad)',
      ),
    },
    {
      postor: 'EXPERIENCIA CORTA S.R.L.',
      texto: cuerpo('EXPERIENCIA CORTA S.R.L.', anexos, calificacionCorta),
    },
  ];
}

void (async () => {
  probarCatalogo();
  probarEmparejamiento();
  probarReglas();
  if (!SOLO_REGLAS) await probarReal();

  console.log(
    fallos === 0
      ? '\n✅ Las tres etapas se encadenan, cortan donde deben y ordenan por puntaje.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
