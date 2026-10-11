/**
 * El contraste jurisprudencial de cada ficha.
 *
 * POR QUÉ
 *
 * Documento 13 de César (10/10/2026), sobre la evaluación del CP
 * SER-SM-6-2026: «Lo que se quiere es que A-LexIA tenga un nivel muy alto
 * de análisis de comparar con otras resoluciones del Tribunal en un caso
 * similar […] y en caso de encontrar dos posiciones distintas debe
 * advertir ambas posiciones y en caso de solo encontrar una sola posición
 * […] tomando como respaldo esta resolución». Y el orden en que se miran
 * las fuentes: «la Ley, el Reglamento de la Ley 32069, las bases
 * estándar, las bases definitivas, las resoluciones del Tribunal y las
 * opiniones del OECE, después recién vienen las demás normas».
 *
 * Hasta ahora cada etapa se evaluaba con los «casos semilla» del
 * requisito (`criterios.generado.ts`) y nada más: la biblioteca, con sus
 * diecisiete mil resoluciones, no se consultaba.
 *
 * CÓMO
 *
 * Después de evaluar una etapa, cada ficha que lo merece —las que no
 * cumplen, las sujetas a subsanación y las de los requisitos que más se
 * litigan— se revisa con:
 *   · los casos de su sección en la guía de César (`casos-tribunal`),
 *     elegidos por parecido con lo que se discute;
 *   · lo que la biblioteca trae para ese problema, por capas: Ley y
 *     Reglamento, bases estándar, resoluciones del Tribunal, acuerdos de
 *     Sala Plena y opiniones del OECE.
 * El modelo confirma o corrige la ficha y deja dichas las posiciones
 * cuando el Tribunal está dividido.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { CASOS_DEL_TRIBUNAL, SECCIONES_DE_CASOS, type CasoDelTribunal } from './casos-tribunal.generado';
import type { Etapa, FichaRequisito, Resultado } from './etapas';

/** Qué sección de la guía corresponde a un requisito, por su nombre. */
const SECCIONES: Array<{ etapa: Etapa; id: string; rx: RegExp }> = [
  { etapa: 'admision', id: '1.6', rx: /desafectaci/i },
  { etapa: 'admision', id: '1.1', rx: /datos del postor|anexo\s*n?[°º.]?\s*0?1\b/i },
  { etapa: 'admision', id: '1.2', rx: /pacto de integridad|anexo\s*n?[°º.]?\s*0?2\b/i },
  { etapa: 'admision', id: '1.3', rx: /representaci[óo]n|vigencia de poder|quien suscribe/i },
  { etapa: 'admision', id: '1.5', rx: /promesa|consorcio|anexo\s*n?[°º.]?\s*0?4\b/i },
  { etapa: 'admision', id: '1.4', rx: /veracidad|impedimento|anexo\s*n?[°º.]?\s*0?3\b/i },
  { etapa: 'calificacion', id: '2.5', rx: /capacitaci/i },
  { etapa: 'calificacion', id: '2.3', rx: /formaci[óo]n|grado acad|t[íi]tulo profesional|colegiatura/i },
  { etapa: 'calificacion', id: '2.4', rx: /personal|residente|especialista|jefe de|ingenier|profesional/i },
  { etapa: 'calificacion', id: '2.2', rx: /experiencia|facturaci|especialidad/i },
  { etapa: 'calificacion', id: '2.6', rx: /equipamiento|equipo|maquinaria|veh[íi]culo/i },
  { etapa: 'calificacion', id: '2.7', rx: /infraestructura|local|almac[ée]n|taller|oficina/i },
  { etapa: 'calificacion', id: '2.1', rx: /capacidad legal|habilitaci|licencia|registro|autorizaci/i },
  { etapa: 'calificacion', id: '2.8', rx: /consorcio/i },
];

/** Las secciones de la guía para un requisito: la suya y, en admisión, la de subsanación. */
export function seccionesDe(etapa: Etapa, requisito: string): string[] {
  const propias = SECCIONES.filter((s) => s.etapa === etapa && s.rx.test(requisito)).map((s) => s.id);
  const base = propias.length > 0 ? [propias[0]] : [];
  if (etapa === 'admision') base.push('1.7');
  if (etapa === 'evaluacion') base.push('3.1');
  if (etapa === 'calificacion' && base.length === 0) base.push('2.1');
  return [...new Set(base)];
}

const PALABRAS_VACIAS = new Set(
  'para como sobre entre desde hasta donde cuando porque segun según esta este esto estas estos dicha dicho cual cuales tiene tienen debe deben puede pueden fueron siendo había habia sido ser fue del los las una uno unos unas que con por sin más mas ante tras bases postor oferta ofertas tribunal resolución resolucion requisito'.split(
    ' ',
  ),
);
function palabras(t: string): Set<string> {
  return new Set(
    (t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{4,}/g) ?? []).filter(
      (w) => !PALABRAS_VACIAS.has(w),
    ),
  );
}

/** Los casos de la guía que más se parecen a lo que se discute en la ficha. */
export function casosParaFicha(etapa: Etapa, ficha: FichaRequisito, tope = 10): CasoDelTribunal[] {
  const secciones = new Set(seccionesDe(etapa, `${ficha.requisito} ${ficha.reglaBases}`));
  const objetivo = palabras(`${ficha.requisito} ${ficha.reglaBases} ${ficha.hallazgo} ${ficha.documentoPresentado}`);
  return CASOS_DEL_TRIBUNAL.filter((c) => secciones.has(c.seccion))
    .map((c) => {
      const p = palabras(`${c.cuestionamiento} ${c.resolvio}`);
      let comunes = 0;
      for (const w of p) if (objetivo.has(w)) comunes++;
      return { c, puntos: comunes / Math.sqrt(p.size + 10) };
    })
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, tope)
    .map((x) => x.c);
}

interface Fragmento {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
  similarity: number;
}

/**
 * Lo que trae la biblioteca para el problema de la ficha, por capas y
 * en el orden de César. Cada capa con su propio cupo: si compitieran
 * juntas, las resoluciones —diecisiete mil— taparían a la norma.
 */
const CAPAS: Array<{ tipo: string; nombre: string; cupo: number }> = [
  { tipo: 'ley', nombre: 'LEY N° 32069 Y SU REGLAMENTO', cupo: 3 },
  { tipo: 'bases_estandar', nombre: 'BASES ESTÁNDAR', cupo: 2 },
  { tipo: 'resolucion_tce', nombre: 'RESOLUCIONES DEL TRIBUNAL', cupo: 7 },
  { tipo: 'acuerdo_sala_plena', nombre: 'ACUERDOS DE SALA PLENA', cupo: 1 },
  { tipo: 'opinion', nombre: 'OPINIONES DEL OECE', cupo: 3 },
];

export async function fuentesDeLaBiblioteca(
  cliente: SupabaseClient,
  consulta: string,
): Promise<Array<{ capa: string; fragmentos: Fragmento[] }>> {
  const texto = consulta.slice(0, 600);
  let emb: number[];
  try {
    emb = await embedOne(texto, 'RETRIEVAL_QUERY');
  } catch {
    return [];
  }
  return Promise.all(
    CAPAS.map(async (capa) => {
      const { data } = await cliente.rpc('hybrid_search', {
        query_text: texto,
        query_embedding: emb,
        match_count: capa.cupo * 2,
        filter_type: capa.tipo,
      });
      // Un fragmento por documento: siete fragmentos de la misma
      // resolución no son siete criterios.
      const vistos = new Set<string>();
      const filas = ((data ?? []) as Fragmento[])
        .filter((f) => !vistos.has(f.document_id) && (vistos.add(f.document_id), true))
        .slice(0, capa.cupo);
      return { capa: capa.nombre, fragmentos: filas };
    }),
  );
}

/**
 * Las resoluciones que la ficha ya nombra («Resolución N° 3362-2021-TCE-S3»),
 * leídas de la biblioteca por su número.
 *
 * El contraste solo puede citar lo que recibe (regla 8). Si la búsqueda
 * por parecido no trae la resolución que la verificación aplicó —la 8305
 * para el personal clave, la 3362 para los compromisos condicionados—, el
 * contraste la descartaba y citaba otra. De cada una se toman los dos
 * fragmentos que más se parecen al requisito.
 */
export async function resolucionesCitadas(
  cliente: SupabaseClient,
  ficha: Pick<FichaRequisito, 'requisito' | 'hallazgo' | 'reglaBases'>,
): Promise<Fragmento[]> {
  const numeros = new Set<string>();
  for (const m of `${ficha.hallazgo} ${ficha.reglaBases}`.matchAll(/(\d{1,5})-(\d{4})-(TCE|TCP)-S(\d+)/gi)) {
    numeros.add(`${Number(m[1])}-${m[2]}-${m[3].toUpperCase()}-S${Number(m[4])}`);
  }
  const palabras = new Set(
    `${ficha.requisito} ${ficha.hallazgo}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z]{6,}/g) ?? [],
  );
  const salida: Fragmento[] = [];
  for (const n of [...numeros].slice(0, 4)) {
    const { data: docs } = await cliente
      .from('normative_documents')
      .select('id, number, title, type')
      .ilike('number', `%N° ${n}%`)
      .limit(1);
    const doc = (docs ?? [])[0] as { id: string; number: string; title: string; type: string } | undefined;
    if (!doc) continue;
    const { data: trozos } = await cliente
      .from('normative_chunks')
      .select('id, content')
      .eq('document_id', doc.id)
      .limit(80);
    const puntuados = ((trozos ?? []) as Array<{ id: string; content: string }>)
      .map((t) => {
        const ws = new Set(
          t.content.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]{6,}/g) ?? [],
        );
        return { t, puntos: [...palabras].filter((w) => ws.has(w)).length };
      })
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 2);
    for (const { t } of puntuados) {
      salida.push({
        chunk_id: t.id,
        document_id: doc.id,
        content: t.content,
        doc_title: doc.title,
        doc_type: doc.type,
        doc_number: doc.number,
        similarity: 1,
      });
    }
  }
  return salida;
}

const SISTEMA = `Eres el revisor jurídico del comité de selección. Recibes UNA ficha ya evaluada de una oferta —un requisito, lo que exigen las Bases, lo que presentó el postor y la conclusión provisional— y la contrastas con la normativa y la jurisprudencia antes de que pase al acta.

ORDEN DE LAS FUENTES (así las pesas): 1) Ley N° 32069; 2) su Reglamento (DS N° 009-2025-EF); 3) bases estándar; 4) bases definitivas del procedimiento (la exigencia de la ficha); 5) resoluciones del Tribunal de Contrataciones; 6) opiniones del OECE; 7) lo demás. Una fuente inferior no deja sin efecto a una superior.

QUÉ HACES
1. Identifica el problema jurídico concreto de la ficha (no el tema general).
2. Busca entre los CASOS DE LA GUÍA y los FRAGMENTOS DE LA BIBLIOTECA los que resuelven ese MISMO problema con hechos comparables. Una resolución que trata el mismo requisito pero otro problema NO es comparable.
3. Si los comparables apuntan en UN solo sentido: aplica ese criterio a la ficha, nombrando la resolución con su número completo, y corrige la conclusión si hace falta.
4. Si apuntan en sentidos DISTINTOS: descríbelo en "conflicto" con las dos posiciones y sus resoluciones; propone el resultado de la posición que mejor se ajusta a los hechos y explica por qué, con confianza "media". Si ninguna se ajusta con seguridad, "revision_humana".
5. Si ningún caso es comparable: conserva la conclusión y dilo en "cambio".
6. Coherencia: si "resultado" es "no_cumple", "subsanable" es false y el "hallazgo" no puede decir que el defecto se subsana; si es "subsanable", el "hallazgo" dice qué se subsana y por qué cabe hacerlo.
7. No cambies una conclusión por un caso que no comparte los hechos determinantes. No conviertas el alegato de una parte en criterio: cuenta lo que el Tribunal resolvió.
8. Solo puedes citar resoluciones, opiniones y artículos que aparezcan en los casos o fragmentos que recibes. Ningún número de memoria.
9. Esta es la PRIMERA evaluación de la oferta: no hay observación previa del comité, ni apelante, ni impugnación. No escribas como si las hubiera. Los casos de la guía son de otros procedimientos: de ellos tomas el criterio, no los hechos.
10. Si la ficha dice "verificada": true, ya se revisó ítem por ítem contra la oferta, con folios. Esos hechos no se discuten aquí: conserva en el "hallazgo" CADA ítem observado con su problema y su folio, y añade la jurisprudencia. Si un caso comparable dice que un problema verificado no impide cumplir, no lo borres: explica las dos lecturas en "conflicto".

Devuelve SOLO este JSON:
{"resultado": "cumple"|"subsanable"|"no_cumple"|"revision_humana", "subsanable": true|false, "naturalezaDefecto": "formal"|"sustancial"|"ninguno", "hallazgo": "la conclusión final de la ficha, completa y coherente", "norma": "artículo o numeral aplicable si consta en los fragmentos", "jurisprudencia": [{"resolucion": "N.° …", "criterio": "qué resolvió", "aplicable": "por qué se aplica o no a este caso"}], "conflicto": "las posiciones divergentes, si las hay; si no, vacío", "cambio": "qué cambió respecto de la conclusión provisional y por qué, o «sin cambio»", "confianza": "alta"|"media"|"baja"}`;

function bloqueCasos(casos: CasoDelTribunal[]): string {
  if (casos.length === 0) return '(ninguno)';
  return casos
    .map(
      (c) =>
        `· ${c.resolucion} — Cuestionamiento: ${c.cuestionamiento.slice(0, 600)}\n  Resolvió: ${c.resolvio.slice(0, 900)}${c.precision ? `\n  Advertencia de la guía: ${c.precision.slice(0, 300)}` : ''}`,
    )
    .join('\n');
}

function bloqueBiblioteca(capas: Array<{ capa: string; fragmentos: Fragmento[] }>): string {
  return capas
    .filter((c) => c.fragmentos.length > 0)
    .map(
      (c) =>
        `── ${c.capa}\n` +
        c.fragmentos
          .map((f) => `· ${f.doc_number ?? f.doc_title}: ${f.content.replace(/\s+/g, ' ').slice(0, 1600)}`)
          .join('\n'),
    )
    .join('\n\n');
}

const RESULTADOS: Resultado[] = ['cumple', 'subsanable', 'no_cumple', 'revision_humana'];

export interface Contraste {
  ficha: FichaRequisito;
  cambio: string;
}

/** Contrasta una ficha. Si algo falla, la devuelve como estaba. */
export async function contrastarFicha(args: {
  cliente: SupabaseClient;
  etapa: Etapa;
  ficha: FichaRequisito;
  nombrePostor: string;
  identificacion?: string;
}): Promise<Contraste> {
  const { cliente, etapa, ficha } = args;
  const casos = casosParaFicha(etapa, ficha);
  const biblioteca = await fuentesDeLaBiblioteca(
    cliente,
    `${ficha.requisito}. ${ficha.hallazgo} ${ficha.reglaBases}`,
  );
  const citadas = await resolucionesCitadas(cliente, ficha).catch(() => []);
  if (citadas.length > 0) {
    biblioteca.unshift({ capa: 'RESOLUCIONES QUE LA FICHA YA APLICA (léelas: confirma si su criterio se ajusta a estos hechos)', fragmentos: citadas });
  }
  const seccion = SECCIONES_DE_CASOS.find((s) => s.id === seccionesDe(etapa, ficha.requisito)[0]);

  const peticion = `POSTOR: ${args.nombrePostor}
${args.identificacion ?? ''}

FICHA PROVISIONAL (etapa: ${etapa})
${JSON.stringify(
  {
    requisito: ficha.requisito,
    reglaBases: ficha.reglaBases,
    documentoPresentado: ficha.documentoPresentado,
    evidencia: ficha.evidencia,
    hallazgo: ficha.hallazgo,
    naturalezaDefecto: ficha.naturalezaDefecto,
    subsanable: ficha.subsanable,
    jurisprudencia: ficha.jurisprudencia,
    conflicto: ficha.conflicto,
    resultado: ficha.resultado,
    verificada: ficha.verificada ?? false,
  },
  null,
  1,
)}

═══ CASOS DE LA GUÍA DEL TRIBUNAL${seccion ? ` — ${seccion.id} ${seccion.titulo}` : ''} ═══
${seccion?.antes ? `Orientación de la guía: ${seccion.antes}\n` : ''}${bloqueCasos(casos)}

═══ FRAGMENTOS DE LA BIBLIOTECA (por orden de jerarquía) ═══
${bloqueBiblioteca(biblioteca) || '(ninguno)'}

Contrasta la ficha y devuelve el JSON.`;

  try {
    const { text } = await generateText({
      model: chatModel,
      system: SISTEMA,
      prompt: peticion,
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(150_000),
    });
    const o = parseJsonLoose(text) as Record<string, unknown>;
    const resultado = RESULTADOS.includes(o.resultado as Resultado) ? (o.resultado as Resultado) : ficha.resultado;
    const jurisprudencia = Array.isArray(o.jurisprudencia)
      ? (o.jurisprudencia as Array<Record<string, unknown>>)
          .map((j) => ({
            resolucion: String(j.resolucion ?? '').trim(),
            criterio: String(j.criterio ?? '').trim(),
            aplicable: String(j.aplicable ?? '').trim(),
          }))
          .filter((j) => j.resolucion)
      : ficha.jurisprudencia;
    // Lo verificado ítem por ítem no se pierde en el contraste. En el CP
    // SER-SM-6-2026 el contraste reescribió el equipamiento como «cumple»
    // citando un caso sobre facturas, y desaparecieron los ítems
    // observados. Un no_cumple verificado solo puede pasar al comité, y
    // con las dos lecturas a la vista.
    let final = resultado;
    let conflicto = String(o.conflicto ?? '').trim();
    if (ficha.verificada && ficha.resultado !== 'cumple' && resultado === 'cumple') {
      final = 'revision_humana';
      conflicto = [
        conflicto,
        `La verificación ítem por ítem encontró: ${ficha.hallazgo.replace(/\s+/g, ' ').slice(0, 900)}. La jurisprudencia contrastada sugiere que cumple: ${String(o.hallazgo ?? '').slice(0, 600)}`,
      ]
        .filter(Boolean)
        .join(' ');
    }
    const detalle = ficha.verificada ? ficha.hallazgo.match(/Detalle: [\s\S]*$/)?.[0] : undefined;
    let hallazgo = String(o.hallazgo ?? '').trim() || ficha.hallazgo;
    // El detalle ítem por ítem es el de la verificación, no uno reescrito:
    // el contraste devolvió el suyo con «siete volquetes» ya corregidos.
    if (detalle) hallazgo = `${hallazgo.replace(/\s*Detalle: [\s\S]*$/, '')} ${detalle}`;
    const nueva: FichaRequisito = {
      ...ficha,
      resultado: final,
      subsanable:
        final === 'no_cumple' || final === 'revision_humana'
          ? false
          : typeof o.subsanable === 'boolean'
            ? o.subsanable
            : ficha.subsanable,
      naturalezaDefecto: ['formal', 'sustancial', 'ninguno'].includes(String(o.naturalezaDefecto))
        ? (String(o.naturalezaDefecto) as FichaRequisito['naturalezaDefecto'])
        : ficha.naturalezaDefecto,
      hallazgo,
      norma: String(o.norma ?? '').trim() || ficha.norma,
      jurisprudencia,
      conflicto: conflicto || undefined,
      confianza: ['alta', 'media', 'baja'].includes(String(o.confianza))
        ? (String(o.confianza) as FichaRequisito['confianza'])
        : ficha.confianza,
      contrastada: true,
    };
    // En la etapa de evaluación el puntaje lo decide la etapa: el
    // contraste no lo toca, salvo que deje el factor sin acreditar.
    if (etapa === 'evaluacion' && final === 'no_cumple') nueva.puntaje = 0;
    return { ficha: nueva, cambio: String(o.cambio ?? '').trim() };
  } catch (e) {
    console.warn(`[evaluacion] contraste de «${ficha.requisito}» omitido:`, (e as Error).message.slice(0, 160));
    return { ficha, cambio: '' };
  }
}

/** Qué fichas de una etapa se contrastan. */
export function fichasAContrastar(etapa: Etapa, fichas: FichaRequisito[]): FichaRequisito[] {
  const elegidas = fichas.filter((f) => {
    if (f.resultado !== 'cumple') return true;
    // Calificación entera: es donde se gana o se pierde, y donde el
    // Tribunal más ha dicho. En admisión, la representación y la promesa
    // de consorcio, que son las que más se discuten.
    if (etapa === 'calificacion') return true;
    if (etapa === 'admision') return /representaci|vigencia de poder|promesa|consorcio/i.test(f.requisito);
    return false;
  });
  return elegidas.slice(0, 12);
}
