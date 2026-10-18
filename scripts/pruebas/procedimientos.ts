/**
 * «PROCEDIMIENTOS DE EVALUACIÓN» de César (17/10/2026): el procedimiento de
 * cada bases y sus etapas finales, por código.
 *   · el tipo de procedimiento, por el título de las bases (12 tipos);
 *   · la económica: simultánea, posterior, limitada, fija, menor precio;
 *   · bonificaciones MYPE (5 %) y provincia (10 %);
 *   · desempate (art. 81), desierto (art. 84), consentimiento (art. 82);
 *   · el caso real de Kimbiri (LP Abreviada 005-2026-MDK/OC-2), con el
 *     Anexo N° 16 que presentaron los tres postores.
 * Uso: npx tsx scripts/pruebas/procedimientos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { claseDeLasBases, perfilDelProcedimiento } from '../../src/lib/evaluacion/procedimiento';
import { etapasFinales, type OfertaEconomica } from '../../src/lib/evaluacion/economica';
import { solicitudesDeBonificacion } from '../../src/lib/evaluacion/bonificaciones';
import { construirActa } from '../../src/lib/evaluacion/acta';
import type { LecturaBases } from '../../src/lib/evaluacion/motor';
import type { ResultadoPostor, SolicitudesDeBonificacion } from '../../src/lib/evaluacion/etapas';

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

const lectura = (o: Partial<LecturaBases['procedimiento']> & { eco?: LecturaBases['evaluacionEconomica']; minimo?: number | null } = {}): LecturaBases => ({
  procedimiento: { numero: o.numero, cuantiaMonto: o.cuantiaMonto },
  admision: [],
  calificacion: [],
  factores: [],
  evaluacionEconomica: o.eco ?? null,
  puntajeTecnicoMinimo: o.minimo ?? null,
  advertencias: [],
});

/** Un postor que superó admisión y calificación, con su puntaje técnico. */
const postor = (nombre: string, tecnico: number, bon?: Partial<SolicitudesDeBonificacion>, fuera = false): ResultadoPostor => ({
  postor: nombre,
  etapas: [
    { etapa: 'admision', fichas: [], resultado: 'cumple', subsanaciones: [], fundamento: '' },
    { etapa: 'calificacion', fichas: [], resultado: fuera ? 'no_cumple' : 'cumple', subsanaciones: [], fundamento: '' },
    { etapa: 'evaluacion', fichas: [], resultado: 'cumple', subsanaciones: [], fundamento: '', puntaje: tecnico },
  ],
  puntajeTecnico: tecnico,
  resultadoFinal: 'Evaluado',
  bonificacion: bon ? { mype: false, remype: false, provincia: false, ...bon } : undefined,
});
const montos = (m: Record<string, number>) => new Map<string, OfertaEconomica | null>(Object.entries(m).map(([k, v]) => [k, { monto: v, moneda: 'PEN', cita: '' }]));

void (async () => {
  // 1. Tipo de procedimiento por el título de las bases.
  const titulos: Array<[string, string]> = [
    ['LICITACIÓN PÚBLICA ABREVIADA PARA BIENES N° 005-2026-MDK/OC-2', 'bienes'],
    ['LICITACIÓN PÚBLICA PARA EL SUMINISTRO DE BIENES PARA EL PROGRAMA DEL VASO DE LECHE', 'bienes'],
    ['CONCURSO PÚBLICO ABREVIADO DE SERVICIOS N° 04-2026-MDS/C-1', 'servicios'],
    ['CONCURSO PÚBLICO PARA CONSULTORÍA EN GENERAL N° 2-2026', 'consultoria'],
    ['CONCURSO PÚBLICO ABREVIADO PARA CONSULTORÍA DE OBRA N° 3-2026', 'consultoria_obra'],
    ['LICITACIÓN PÚBLICA DE OBRAS N° 001-2026-MDP/J', 'obra'],
    ['CONCURSO PÚBLICO PARA SERVICIO DE MANTENIMIENTO VIAL CP SER-SM-6-2026', 'mantenimiento_vial'],
    ['CONCURSO PÚBLICO ABREVIADO PARA LA CONTRATACIÓN DE EXPERTOS Y GERENTES DE PROYECTOS', 'expertos'],
    ['CONCURSO DE PROYECTOS ARQUITECTÓNICOS Y URBANÍSTICOS N° 1-2026', 'proyectos'],
    ['SUBASTA INVERSA ELECTRÓNICA N° 8-2026', 'subasta_inversa'],
    ['COMPARACIÓN DE PRECIOS N° 12-2026', 'comparacion_precios'],
    ['PROCEDIMIENTO DE SELECCIÓN NO COMPETITIVO N° 1-2026', 'no_competitivo'],
  ];
  for (const [t, esperado] of titulos) ok(claseDeLasBases(`BASES INTEGRADAS ${t}`) === esperado, `${t.slice(0, 70)} → ${esperado}`);

  // 2. Bienes: simultánea, MYPE 5 % sobre el total.
  const lpa = 'LICITACIÓN PÚBLICA ABREVIADA PARA BIENES … Solicitud de bonificación del cinco por ciento (5%) por tener la condición de micro y pequeña empresa';
  const pBienes = perfilDelProcedimiento(lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), lpa);
  const b = [postor('A', 55, { mype: true, remype: true }), postor('B', 55), postor('C', 30, { mype: true })];
  const fb = etapasFinales(b, montos({ A: 331052.7, B: 354750, C: 360000 }), lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), pBienes);
  ok(pBienes.economica.tipo === 'simultanea' && pBienes.puntajeTecnicoMinimo === null, 'bienes: simultánea y sin mínimo técnico');
  ok(b[0].puntajeTotal === 99.75 && b[0].puntajeSinBonificacion === 95, `bienes: A 95 + 5 % = ${b[0].puntajeTotal}`);
  ok(b[1].puntajeTotal === 92.33 && !b[1].bonificacionesAplicadas, `bienes: B sin solicitud = ${b[1].puntajeTotal}`);
  ok(b[0].prelacion === 1 && fb.buenaPro.postor === 'A', 'bienes: buena pro a A');
  ok((fb.bonificaciones ?? []).some((x) => x.postor === 'C' && /no adjunta la constancia del REMYPE/.test(x.detalle)), 'bienes: C sin constancia REMYPE queda anotado para el comité');

  // 3. Servicios: posterior, mínimo 70, C1 y C2.
  const lServ = lectura({ eco: { tipo: 'posterior', coeficienteTecnico: 0.7, coeficienteEconomico: 0.3 } });
  const pServ = perfilDelProcedimiento(lServ, 'CONCURSO PÚBLICO DE SERVICIOS N° 1');
  const s = [postor('A', 80), postor('B', 65), postor('C', 90)];
  etapasFinales(s, montos({ A: 100000, B: 80000, C: 125000 }), lServ, pServ);
  ok(!s[1].accedeEconomica, 'servicios: B (65 puntos) no accede a la económica');
  ok(s[0].puntajeTotal === 86 && s[2].puntajeTotal === 87, `servicios: A = 0,7×80 + 0,3×100 = ${s[0].puntajeTotal}; C = 0,7×90 + 0,3×80 = ${s[2].puntajeTotal}`);
  ok(s[2].prelacion === 1, 'servicios: C primero');

  // 4. Obra con oferta limitada (95 %–110 %), sin rechazo.
  const lObra = lectura({ cuantiaMonto: 1_000_000, eco: { tipo: 'posterior', coeficienteTecnico: 0.6, coeficienteEconomico: 0.4 } });
  const pObra = perfilDelProcedimiento(lObra, 'LICITACIÓN PÚBLICA DE OBRAS … EVALUACIÓN ECONÓMICA (Puntaje Máximo: 100 Puntos) Oferta económica limitada: entre el 95% y 110% de la cuantía');
  const o = [postor('A', 80), postor('B', 85), postor('C', 90)];
  const fo = etapasFinales(o, montos({ A: 940000, B: 1000000, C: 1120000 }), lObra, pObra);
  ok(pObra.economica.tipo === 'limitada' && !pObra.rechazo, 'obra: limitada y sin rechazo del 132.5');
  ok(!!o[0].descalificadoEconomica && !!o[2].descalificadoEconomica && !o[1].descalificadoEconomica, 'obra: 94 % y 112 % descalificadas; 100 % sigue');
  ok(fo.buenaPro.postor === 'B' && fo.rechazo.length === 0, 'obra: buena pro a B');

  // 5. Obra con oferta fija al 100 %.
  const pFija = perfilDelProcedimiento(lObra, 'LICITACIÓN PÚBLICA DE OBRAS … EVALUACIÓN ECONÓMICA (Puntaje Máximo: 100 Puntos) Oferta económica fija al 100%: la oferta económica de los postores corresponde al 100% de la cuantía');
  const f = [postor('A', 80), postor('B', 85)];
  etapasFinales(f, montos({ A: 1000000, B: 990000 }), lObra, pFija);
  ok(pFija.economica.tipo === 'fija' && f[0].puntajeTotal === 80 && !!f[1].descalificadoEconomica, 'obra fija: total = técnico; 99 % descalificada');

  // 6. Comparación de precios: dos calificadas o desierto.
  const pComp = perfilDelProcedimiento(lectura(), 'COMPARACIÓN DE PRECIOS N° 3');
  const c1 = [postor('A', 0), postor('B', 0, undefined, true)];
  const fc1 = etapasFinales(c1, montos({ A: 50000, B: 45000 }), lectura(), pComp);
  ok(!!fc1.desierto && fc1.buenaPro.postor === null, 'comparación: una sola calificada → desierto');
  const c2 = [postor('A', 0), postor('B', 0)];
  const fc2 = etapasFinales(c2, montos({ A: 50000, B: 45000 }), lectura(), pComp);
  ok(fc2.buenaPro.postor === 'B' && c2[1].prelacion === 1, 'comparación: buena pro al menor precio');

  // 7. Empate (art. 81): técnico, luego MYPE, luego sorteo.
  const pE = perfilDelProcedimiento(lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), 'LICITACIÓN PÚBLICA PARA BIENES');
  const e1 = [postor('A', 50, { mype: false }), postor('B', 50, { remype: true })];
  const fe1 = etapasFinales(e1, montos({ A: 100, B: 100 }), lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), pE);
  ok(fe1.buenaPro.postor === 'B', 'empate en total y técnico: gana la MYPE (art. 81 c)');
  const e2 = [postor('A', 50), postor('B', 50)];
  const fe2 = etapasFinales(e2, montos({ A: 100, B: 100 }), lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), pE);
  ok(fe2.buenaPro.postor === null && /sorteo/.test(fe2.buenaPro.fundamento), 'empate sin MYPE: sorteo');

  // 8. Consentimiento (art. 82).
  ok(/82\.1/.test(fb.consentimiento ?? ''), 'consentimiento con dos o más ofertas: art. 82.1');
  const uno = [postor('A', 60)];
  const fu = etapasFinales(uno, montos({ A: 100 }), lectura({ eco: { tipo: 'simultanea', puntajeMaximo: 40 } }), pE);
  ok(/82\.2/.test(fu.consentimiento ?? ''), 'consentimiento con una sola oferta: art. 82.2');

  // 9. Provincia 10 %: misma provincia sí, otra va al comité.
  const lCPA = lectura({ cuantiaMonto: 150_000, eco: { tipo: 'posterior', coeficienteTecnico: 0.7, coeficienteEconomico: 0.3 } });
  const pCPA = perfilDelProcedimiento(lCPA, 'CONCURSO PÚBLICO ABREVIADO DE SERVICIOS … bonificación del diez por ciento (10%)');
  const pr = [postor('A', 80, { provincia: true, provinciaDomicilio: 'Huamanga', provinciaEjecucion: 'HUAMANGA' }), postor('B', 80, { provincia: true, provinciaDomicilio: 'Huanta', provinciaEjecucion: 'Huamanga' })];
  etapasFinales(pr, montos({ A: 100, B: 100 }), lCPA, pCPA);
  ok(pr[0].bonificacionesAplicadas?.includes('Provincia 10 %') && !pr[1].bonificacionesAplicadas, 'provincia: misma provincia se aplica; otra provincia queda para el comité');

  // 9 bis. El acta de otros procedimientos.
  const actaComp = construirActa({ bases: lectura(), postores: c2, finales: fc2 });
  ok(!/FACTORES DE EVALUACIÓN TÉCNICA/.test(actaComp) && /MENOR PRECIO/.test(actaComp), 'acta de comparación de precios: sin evaluación técnica, por menor precio');
  const actaDesierto = construirActa({ bases: lectura(), postores: c1, finales: fc1 });
  ok(/se declara desierto/.test(actaDesierto), 'acta de comparación con una calificada: desierto');
  const actaObra = construirActa({ bases: lObra, postores: o, finales: fo });
  ok(!/SUSTANCIALMENTE POR DEBAJO/.test(actaObra) && /Descalificada: su oferta/.test(actaObra) && /entre el 95 % y el 110 %/.test(actaObra), 'acta de obra limitada: sin rechazo, con las descalificadas y el rango');

  // 10. Kimbiri, con el resultado verificado del documento 15 y sus textos.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: r } = await db.from('evaluations').select('result').eq('id', 'a376b7dc-1684-4ab4-9de7-58b8283020a0').single();
  const { data: t } = await db.from('evaluations').select('textos').eq('id', 'c3d39b1c-b463-4f2e-b57a-20da6c2684de').single();
  const res = (r as any).result;
  const tx = (t as any).textos;
  const perfil = perfilDelProcedimiento(res.bases, tx.bases);
  ok(perfil.nombre === 'Licitación Pública Abreviada para Bienes' && perfil.bonificaciones.mype, 'Kimbiri: LP Abreviada para Bienes, con bonificación MYPE');
  const postores: ResultadoPostor[] = res.postores;
  for (const p of postores) {
    const i = tx.ofertas.findIndex((x: any) => x.texto.includes(p.postor.slice(0, 18)));
    if (i >= 0) p.bonificacion = await solicitudesDeBonificacion(tx.ofertas[i].texto, tx.bases);
  }
  ok(postores.every((p) => p.bonificacion?.mype), 'Kimbiri: los tres presentaron el Anexo N° 16');
  const m = new Map(postores.map((p) => [p.postor, p.ofertaEconomica ?? null] as const));
  const fk = etapasFinales(postores, m, res.bases, perfil);
  const ag = postores.find((p) => /AGUILAR/.test(p.postor))!;
  const pz = postores.find((p) => /POZO/.test(p.postor))!;
  ok(ag.puntajeTotal === 99.75 && pz.puntajeTotal === 75.95, `Kimbiri: AGUILAR ${ag.puntajeTotal} (95 + 5 %), POZO ${pz.puntajeTotal} (72,33 + 5 %)`);
  ok(fk.buenaPro.postor === ag.postor, 'Kimbiri: buena pro a AGUILAR');
  const acta = construirActa({ bases: res.bases, postores, finales: fk });
  for (const [frase, que] of [
    ['PROCEDIMIENTO DE EVALUACIÓN APLICABLE', 'apartado del procedimiento'],
    ['Licitación Pública Abreviada para Bienes', 'nombre del procedimiento'],
    ['SIMULTÁNEA A LA TÉCNICA', 'económica simultánea'],
    ['BONIFICACIONES', 'apartado de bonificaciones'],
    ['99.75 (95 + MYPE 5 %)', 'consolidado con bonificación'],
    ['82.1', 'consentimiento'],
    ['Art. 81 del Reglamento', 'regla de empate'],
  ] as const) {
    ok(acta.includes(frase), `acta: ${que}`);
  }
  ok(!/Puntaje mínimo \|/.test(acta) || /\| — \|/.test(acta), 'acta: en bienes no se exige puntaje técnico mínimo');

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Procedimientos de evaluación: todo bien.');
  process.exit(fallas ? 1 : 0);
})();
