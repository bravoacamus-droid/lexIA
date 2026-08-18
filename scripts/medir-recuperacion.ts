#!/usr/bin/env tsx
/**
 * Mide, para cada pregunta del test de César, cuántos de sus puntos
 * clave están PRESENTES EN EL CONTEXTO que se le entrega al modelo.
 *
 * Por qué existe: el puntaje de test-cesar-qa.ts depende de lo que el
 * modelo redacte, y eso oscila mucho entre corridas —Q6 dio 77, 62, 69,
 * 54, 69 y 46 sin que cambiara la recuperación—. Con esa señal es
 * imposible saber si un cambio en la búsqueda ayuda o estorba.
 *
 * Esta medición no llama al modelo: solo busca y comprueba si el texto
 * recuperado contiene cada concepto. Es determinista y repetible, así
 * que sirve para decidir cambios de recuperación. Para juzgar la
 * REDACCIÓN sigue haciendo falta el otro test.
 *
 * Uso: npx tsx scripts/medir-recuperacion.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
import { expandLegalQuery } from '../src/lib/ai/query-expansion';
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '../src/lib/ai/panoramic-query';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

interface Caso {
  id: string;
  pregunta: string;
  claves: Array<[string, RegExp]>;
}

/** Mismos puntos clave que test-cesar-qa.ts. */
const CASOS: Caso[] = [
  {
    id: 'Q1-modalidades',
    pregunta: 'Quiero me resumas todo respecto a la contratación de las modalidades de la contratación pública eficiente',
    claves: [
      ['contratos menores', /contratos?\s+menor|8\s*UIT/i],
      ['compra por encargo', /compra\s+por\s+encargo|encargo\s+a\s+otra\s+entidad/i],
      ['compra centralizada', /compra\s+centralizada/i],
      ['compra corporativa', /compra\s+corporativa/i],
      ['CPI innovación', /compra\s+p[úu]blica\s+de\s+innovaci[óo]n|CPI\b/i],
      ['acuerdo marco', /acuerdos?\s+marco/i],
      ['catálogos electrónicos', /cat[áa]logos?\s+electr[óo]nicos?/i],
    ],
  },
  {
    id: 'Q2-impedimentos',
    pregunta: 'Quiero que me expliques todo respecto a los impedimentos de contratación',
    claves: [
      ['carácter personal', /car[áa]cter\s+personal|por\s+raz[óo]n\s+del\s+cargo|funcionarios/i],
      ['parentesco', /parentesco|c[óo]nyuge|conviviente/i],
      ['personas jurídicas', /personas?\s+jur[íi]dicas/i],
      ['sanciones', /inhabilitaci[óo]n|condena/i],
      ['6 meses post-cargo', /seis\s*\(?6?\)?\s*meses|6\s+meses/i],
      ['segundo grado', /segundo\s+grado/i],
      ['REDAM/REDERECI', /REDAM|REDERECI|deudores\s+alimentarios/i],
    ],
  },
  {
    id: 'Q3-discrecionalidad',
    pregunta: 'En qué casos el comité (evaluador) debe evaluar las ofertas y determinar una decisión técnicamente de manera discrecional bajo el principio de valor por dinero',
    claves: [
      ['negociación', /negocia|supera\s+la\s+cuant[íi]a/i],
      ['rechazo ofertas bajas', /rechaz|sustancialmente\s+(?:por\s+)?debajo/i],
      ['diálogo competitivo', /di[áa]logo\s+competitivo/i],
      ['concurso arquitectónico', /arquitect[óo]nic|jurado/i],
      ['valor por dinero', /valor\s+por\s+dinero/i],
      ['finalidad pública', /finalidad\s+p[úu]blica/i],
    ],
  },
  {
    id: 'Q5-difusion',
    pregunta: 'Que es la difusión de requerimiento',
    claves: [
      ['consulta al mercado', /consulta\s+al\s+mercado/i],
      ['previa a convocatoria', /previa?\s+a\s+la\s+convocatoria|antes\s+de\s+(?:la\s+)?convoca/i],
      ['Pladicop', /pladicop/i],
      ['plazo 5 días', /cinco\s*(?:\(\s*5\s*\))?\s*d[íi]as|5\s+d[íi]as/i],
      ['plazo 6 días', /seis\s*(?:\(\s*6\s*\))?\s*d[íi]as|6\s+d[íi]as/i],
    ],
  },
  {
    id: 'Q6-emergencias',
    pregunta: 'Quiero que me detalles paso a paso cuando una entidad debe aplicar las contrataciones para la prevención y atención de emergencias y que entidades pueden contratar a través de este mecanismo',
    claves: [
      ['contratación directa', /contrataci[óo]n\s+directa|no\s+competitiv/i],
      ['regularización 20 días', /veinte\s*(?:\(\s*20\s*\))?\s*d[íi]as|20\s+d[íi]as/i],
      ['contratos de contingencia', /contratos?\s+de\s+contingencia/i],
      ['cuadro multianual', /cuadro\s+multianual|CMN\b/i],
      ['acuerdos marco', /acuerdos?\s+marco/i],
      ['pago por disponibilidad', /pago\s+por\s+disponibilidad|pago\s+por\s+activaci[óo]n/i],
      ['entidades', /gobiernos?\s+(?:regional|local)|ministerios|fuerzas\s+armadas/i],
      ['garantía fiel cumplimiento', /garant[íi]a\s+de\s+fiel\s+cumplimiento|10\s*%/i],
    ],
  },
  {
    id: 'Q7-apelacion',
    pregunta: 'Quiero que me realices ejemplos en caso una empresa interpone un recurso de apelación ante el Tribunal y este señale que no existe conexión lógica entre los hechos expuestos en el recurso y petitorio y el impugnante carezca de interés para obrar o legitimidad procesal',
    claves: [
      ['improcedencia', /improcedent|improcedencia/i],
      ['conexión lógica', /conexi[óo]n\s+l[óo]gica/i],
      ['interés para obrar', /inter[ée]s\s+para\s+obrar/i],
      ['legitimidad procesal', /legitimidad\s+procesal/i],
      ['ejecución 50% garantía', /50\s*%/i],
    ],
  },
  {
    id: 'Q8-multa',
    pregunta: 'Con la ley 32069, si un postor no suscribe el contrato, cómo es el procedimiento de multa y qué pasa si no la paga',
    claves: [
      ['multa 3-10%', /3\s*%|tres\s+por\s+ciento/i],
      ['ejecución coactiva', /coactiv/i],
      ['retención', /retenci[óo]n|retener/i],
      ['artículo 365', /365/],
    ],
  },
  {
    id: 'Q9-area-usuaria',
    pregunta: 'Cuál es el rol del área usuaria en las contrataciones del Estado',
    claves: [
      ['formula requerimiento', /especificaciones\s+t[ée]cnicas|t[ée]rminos\s+de\s+referencia/i],
      ['CMN programación', /cuadro\s+multianual|programaci[óo]n/i],
      ['coordinación DEC', /\bDEC\b|dependencia\s+encargada/i],
      ['conformidad', /conformidad/i],
      ['finalidad pública', /finalidad\s+p[úu]blica/i],
    ],
  },
  {
    // Observación de César del 17/08/2026: la respuesta no enumeraba los
    // supuestos. La causa era de recuperación — la Directiva que regula
    // el trámite no llegaba al modelo. Queda como caso fijo.
    id: 'Q10-rnp-ejecutor',
    pregunta:
      'cuales son los requisitos para la inscripcion de rnp como ejecutor de obras en persona juridica',
    claves: [
      ['procedimiento de la directiva', /reinscripci[óo]n|art[íi]culo\s*381/i],
      ['persona jurídica extranjera', /extranjer[ao]/i],
      ['capacidad máxima de contratación', /capacidad\s+m[áa]xima\s+de\s+contrataci[óo]n/i],
      ['sin experiencia previa', /sin\s+experiencia|500\s*000|500,000/i],
      ['derecho de tramitación', /derecho\s+de\s+tramitaci[óo]n|tasa/i],
      ['ejecutor de obras', /ejecutor\s+de\s+obras?/i],
    ],
  },
];

interface Fila { chunk_id: string; content: string; doc_type: string }

async function buscar(q: string, e: number[], n: number): Promise<Fila[]> {
  const { data } = await admin.rpc('hybrid_search', {
    query_text: q, query_embedding: e, match_count: n,
    filter_type: null, filter_law: null,
  });
  return (data || []) as Fila[];
}

/** Reproduce la recuperación del chat, sin llamar al modelo. */
async function recuperar(pregunta: string): Promise<Fila[]> {
  const { expanded, focalQueries } = expandLegalQuery(pregunta);
  const panoramica = isPanoramicQuery(pregunta);
  const facetas = panoramica ? buildPanoramicFacets(extractCentralTopic(pregunta)) : [];

  // Se descartan las vacías: expandLegalQuery devuelve cadena vacía
  // cuando no encuentra patrón, y Gemini rechaza el lote entero con
  // "content contains an empty Part".
  const consultas = [pregunta, expanded, ...focalQueries, ...facetas]
    .map((c) => (c || '').trim())
    .filter((c) => c.length > 0);
  const embs = await Promise.all(consultas.map((c) => embedOne(c)));

  const vistos = new Set<string>();
  const todos: Fila[] = [];
  for (let i = 0; i < consultas.length; i++) {
    const n = i < 2 ? 15 : 5;
    for (const c of await buscar(consultas[i], embs[i], n)) {
      if (!vistos.has(c.chunk_id)) { vistos.add(c.chunk_id); todos.push(c); }
    }
  }
  return todos;
}

async function main() {
  let totalPresentes = 0;
  let totalClaves = 0;
  console.log('COBERTURA DE CONCEPTOS EN EL CONTEXTO RECUPERADO\n');

  for (const c of CASOS) {
    const filas = await recuperar(c.pregunta);
    const texto = filas.map((f) => f.content).join('\n');
    const presentes = c.claves.filter(([, re]) => re.test(texto));
    const faltan = c.claves.filter(([, re]) => !re.test(texto));
    totalPresentes += presentes.length;
    totalClaves += c.claves.length;
    const pct = Math.round((presentes.length / c.claves.length) * 100);
    const icono = pct === 100 ? '✅' : pct >= 75 ? '🟡' : '🔴';
    console.log(
      `${icono} ${c.id.padEnd(20)} ${presentes.length}/${c.claves.length} (${String(pct).padStart(3)}%) · ${filas.length} fragmentos`,
    );
    faltan.forEach(([n]) => console.log(`      ❌ ${n}`));
  }

  console.log(
    `\nTOTAL: ${totalPresentes}/${totalClaves} (${Math.round((totalPresentes / totalClaves) * 100)}%)`,
  );
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
