/**
 * Implementación del tool search_normativa que el Abogado Virtual
 * llamará durante cada llamada de voz.
 *
 * Reutiliza el mismo hybrid_search (cosine + FTS español) que usa el
 * chat de LexIA, sobre la base de 371 documentos / 10,409 chunks.
 *
 * El modelo Gemini Live API decide cuándo llamarlo según el system
 * prompt. Esta función NO toca audio: solo recibe palabras clave,
 * consulta la BD y devuelve fragmentos textuales relevantes con su
 * cita normativa correspondiente.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import { expandLegalQuery } from '@/lib/ai/query-expansion';
import { rewriteToLegalQueries } from '@/lib/ai/query-rewrite';
import { fetchNeighborChunks, mergeNeighbors } from '@/lib/ai/neighbor-chunks';

export interface NormativaSearchResult {
  /** Tipo del documento (ley, reglamento, directiva, opinion, etc.). */
  type: string;
  /** Número/identificador del documento (ej. "Ley N° 32069 Art. 67.5"). */
  citation: string;
  /** Título completo del documento. */
  title: string;
  /** Fragmento de texto relevante. */
  snippet: string;
  /** Score de relevancia 0-1. */
  similarity: number;
}

export interface SearchOptions {
  query: string;
  /** Filtrar por tipo. Si no se pasa, busca en todos los tipos. */
  filter_type?: string | null;
  /**
   * Filtrar por ley aplicable. Valores válidos en cada elemento del
   * array: 'ley_32069' | 'ley_30225'. Si null/empty, no se filtra.
   * Configurado a nivel de llamada (voice_calls.law_filter).
   */
  filter_law?: string[] | null;
  /** Cuántos chunks devolver (default 5, max 10). */
  match_count?: number;
}

const VALID_TYPES = new Set([
  'ley',
  'reglamento',
  'directiva',
  'opinion',
  'pronunciamiento',
  'resolucion',
  'resolucion_tce',
  'lineamiento',
  'codigo_etica',
  'guia',
  'tupa',
  'bases_estandar',
  'manual_seace',
  'comunicado',
]);

/**
 * Ejecuta la búsqueda híbrida y normaliza los resultados a la forma
 * que el modelo Live API espera recibir.
 *
 * Si el filter_type no es válido (el modelo a veces lo inventa), se
 * ignora silenciosamente para no perder la consulta.
 */
export async function searchNormativa(
  opts: SearchOptions,
): Promise<NormativaSearchResult[]> {
  const matchCount = Math.min(opts.match_count ?? 5, 10);
  const filterType =
    opts.filter_type && VALID_TYPES.has(opts.filter_type)
      ? opts.filter_type
      : null;

  // Query expansion — feedback César 08/07/2026: cuando el usuario
  // preguntó por "gestión de riesgos en contrato menor", el embedding
  // pesó más "gestión de riesgos" y no trajo el Art. 226. La expansion
  // agrega términos técnicos y focalQueries cortas (una por patrón
  // detectado) que se usan para búsquedas dedicadas con filter_type='ley'.
  const { expanded: expandedQuery, focalQueries } = expandLegalQuery(opts.query);

  // Todos los embeds (query + expanded + N focales) son independientes.
  // Se lanzan en paralelo con Promise.all para reducir la latencia de
  // 3-4 embeds secuenciales (1.5-3s) a un solo round-trip (~500ms).
  const safeEmbed = (text: string) =>
    embedOne(text, 'RETRIEVAL_QUERY').catch((err: Error) => {
      console.error('[voice-search] embed_failed', {
        text_preview: text.slice(0, 60),
        err: err.message,
      });
      return null as number[] | null;
    });

  const embedPromises: Promise<number[] | null>[] = [safeEmbed(opts.query)];
  const doExpanded = !!expandedQuery && expandedQuery !== opts.query;
  if (doExpanded) embedPromises.push(safeEmbed(expandedQuery));
  const focalStartIdx = embedPromises.length;
  for (const focal of focalQueries) embedPromises.push(safeEmbed(focal));

  const allEmbeds = await Promise.all(embedPromises);
  const embedding = allEmbeds[0];
  if (!embedding) return []; // sin embedding principal no hay retrieval
  const expandedEmbedding = doExpanded ? allEmbeds[1] : null;
  const focalEmbeddings = allEmbeds.slice(focalStartIdx);

  const admin = createAdminClient();
  const filterLaw =
    opts.filter_law && opts.filter_law.length > 0 ? opts.filter_law : null;
  // Sobre-recuperamos (2x) para tener margen al rerankear. Antes traíamos
  // exactamente matchCount y perdíamos chunks importantes cuando quedaban
  // en posiciones 6-10 (ej: Ley 32069 Art. 66.6 sobre prevalencia).
  const oversample = Math.min(matchCount * 2, 15);
  const { data, error } = await admin.rpc('hybrid_search', {
    query_text: opts.query,
    query_embedding: embedding,
    match_count: oversample,
    filter_type: filterType,
    filter_law: filterLaw,
  });
  if (error) {
    console.error('[voice-search] hybrid_search error:', error.message);
    return [];
  }

  let combined = (data || []) as HybridRow[];

  // Segunda búsqueda con la query expandida — merge por document_id +
  // primeros 100 chars del content (misma firma que rerankAndDedupe).
  if (expandedEmbedding) {
    const seen = new Set(
      combined.map((c) => `${c.document_id}:${c.content.slice(0, 60)}`),
    );

    const { data: extraData } = await admin.rpc('hybrid_search', {
      query_text: expandedQuery,
      query_embedding: expandedEmbedding,
      match_count: 8,
      filter_type: filterType,
      filter_law: filterLaw,
    });
    if (extraData) {
      for (const r of extraData as HybridRow[]) {
        const k = `${r.document_id}:${r.content.slice(0, 60)}`;
        if (!seen.has(k)) {
          combined.push(r);
          seen.add(k);
        }
      }
    }

  }

  // Búsquedas FOCALIZADAS por artículo, una por focalQuery detectada.
  // La focal es corta y concentrada ("artículo 226 contrato menor 8 UIT"),
  // así el embedding no se diluye como con la expansión grande. Se
  // filtra por filter_type='ley' para garantizar que el texto base de
  // la Ley 32069 entre al pool aunque quede debajo en similarity global.
  //
  // Feedback César 08/07/2026: "gestión de riesgos en contrato menor"
  // traía pronunciamientos genéricos pero NO el Art. 226 de la Ley
  // que sí trata contratos menores. La focal query lo rescata.
  if (!filterType && focalQueries.length > 0) {
    const seen = new Set(
      combined.map((c) => `${c.document_id}:${c.content.slice(0, 60)}`),
    );
    // Paralelizamos las N focal RPCs — antes iban en secuencia sumando
    // 200-400ms cada una. Los embeds ya están precomputados arriba.
    const focalResults = await Promise.all(
      focalQueries.map(async (focal, i) => {
        const focalEmb = focalEmbeddings[i];
        if (!focalEmb) return null;
        const { data } = await admin.rpc('hybrid_search', {
          query_text: focal,
          query_embedding: focalEmb,
          match_count: 3,
          filter_type: 'ley',
          filter_law: filterLaw,
        });
        return data as HybridRow[] | null;
      }),
    );
    for (const rows of focalResults) {
      if (!rows) continue;
      for (const r of rows) {
        const k = `${r.document_id}:${r.content.slice(0, 60)}`;
        if (!seen.has(k)) {
          combined.push(r);
          seen.add(k);
        }
      }
    }
  }

  // BÚSQUEDA CON LA CONSULTA REESCRITA A LENGUAJE JURÍDICO (espejo de
  // /api/chat). Generaliza las focales manuales: el modelo traduce
  // cualquier consulta coloquial al vocabulario del articulado. Timeout
  // corto (1.8s) porque en la llamada la latencia se nota; si no llega a
  // tiempo, el retrieval continúa sin ella.
  // RESCATE CONDICIONAL: solo si el pool NO trae norma base. Inyectar
  // Ley/Reglamento en toda consulta desplaza a los fragmentos que sí
  // responden — medido: "modalidades de contratación" cayó de 100% a
  // 10% cuando esto se ejecutaba siempre (la voz solo devuelve 5).
  const esPrimariaTipo = (t: string) => t === 'ley' || t === 'reglamento';
  const necesitaRescate =
    !filterType && !combined.some((c) => esPrimariaTipo(c.doc_type));

  if (necesitaRescate) {
    const rewrites = await rewriteToLegalQueries(opts.query, 1800);
    if (rewrites.length > 0) {
      const seen = new Set(
        combined.map((c) => `${c.document_id}:${c.content.slice(0, 60)}`),
      );
      const rewriteEmbs = await Promise.all(rewrites.map(safeEmbed));
      const resultados = await Promise.all(
        rewrites.flatMap((frase, i) => {
          const emb = rewriteEmbs[i];
          if (!emb) return [];
          return (['ley', 'reglamento'] as const).map(async (tipo) => {
            const { data } = await admin.rpc('hybrid_search', {
              query_text: frase,
              query_embedding: emb,
              match_count: 3,
              filter_type: tipo,
              filter_law: filterLaw,
            });
            return data as HybridRow[] | null;
          });
        }),
      );
      for (const rowsR of resultados) {
        if (!rowsR) continue;
        for (const r of rowsR) {
          const k = `${r.document_id}:${r.content.slice(0, 60)}`;
          if (!seen.has(k)) {
            combined.push(r);
            seen.add(k);
          }
        }
      }
    }
  }

  // RED DE SEGURIDAD DE FUENTE PRIMARIA — se ejecuta SIEMPRE (misma
  // regla general que en /api/chat). Repite la pregunta original
  // restringida a la Ley y al Reglamento para que la norma base tenga
  // un lugar en el pool aunque la búsqueda global la desplace.
  // Origen (01/08/2026): preguntas narrativas de caso ("si la entidad
  // no tiene listo el contrato dentro de los tres días hábiles...")
  // recuperaban 100% pronunciamientos y la norma que respondía exacto
  // (Art. 91 del Reglamento) no entraba al contexto. Reusa el embedding
  // ya calculado, así que no agrega costo de embeddings.
  if (necesitaRescate) {
    const seen = new Set(
      combined.map((c) => `${c.document_id}:${c.content.slice(0, 60)}`),
    );
    const primarias = await Promise.all(
      (['ley', 'reglamento'] as const).map(async (tipo) => {
        const { data } = await admin.rpc('hybrid_search', {
          query_text: opts.query,
          query_embedding: embedding,
          match_count: 3,
          filter_type: tipo,
          filter_law: filterLaw,
        });
        return data as HybridRow[] | null;
      }),
    );
    for (const rowsP of primarias) {
      if (!rowsP) continue;
      for (const r of rowsP) {
        const k = `${r.document_id}:${r.content.slice(0, 60)}`;
        if (!seen.has(k)) {
          combined.push(r);
          seen.add(k);
        }
      }
    }
  }

  // La penalización de "ley vieja" (30225) solo aplica si el usuario NO
  // filtró explícitamente por la Ley 30225. Si eligió la 30225 en el
  // LawSelector, esos chunks son EXACTAMENTE lo que quiere.
  const userWantsOldLaw = (filterLaw || []).includes('ley_30225');
  let rows = rerankAndDedupe(combined, opts.query, matchCount, {
    penalizeOldLaw: !userWantsOldLaw,
  });

  // CUPO GARANTIZADO DE FUENTE PRIMARIA — regla general (espejo de
  // /api/chat). La voz devuelve pocos resultados (5 por defecto), así
  // que basta reservar 1 para la norma base: sin él, una pregunta
  // narrativa puede llegar al modelo de voz sin una sola norma.
  if (necesitaRescate) {
    if (!rows.some((r) => esPrimariaTipo(r.doc_type))) {
      const mejorPrimaria = combined
        .filter((c) => esPrimariaTipo(c.doc_type))
        .sort((a, b) => b.similarity - a.similarity)[0];
      if (mejorPrimaria) {
        rows = [...rows.slice(0, Math.max(rows.length - 1, 0)), mejorPrimaria];
      }
    }
  }
  // COSIDO DE VECINOS (ver neighbor-chunks.ts): el troceado corta
  // artículos y tablas a la mitad. Se traen los contiguos de los 2 más
  // relevantes — tope bajo porque la voz solo entrega 5 fragmentos y el
  // audio penaliza el contexto largo.
  const vecinos = await fetchNeighborChunks(admin, rows as never, {
    topN: 2,
    maxAdd: 2,
  });
  if (vecinos.length > 0) {
    rows = mergeNeighbors(rows as never, vecinos as never) as typeof rows;
  }

  return rows.map((r) => {
    const numberPart = r.doc_number ? ` ${r.doc_number}` : '';
    const typeLabel = formatTypeLabel(r.doc_type);
    return {
      type: r.doc_type,
      citation: `${typeLabel}${numberPart}`.trim(),
      title: r.doc_title,
      /**
       * IMPORTANTE 30/06/2026 — bug definitivo detectado:
       * Antes cortábamos con .slice(0, 1200). Los chunks del corpus
       * tienen avg 2750 chars. Truncar a 1200 causaba que la voz NO
       * viera plazos, sub-numerales o contenido después del primer
       * numeral. Ejemplo real: chunk 113 de Ley 32069 tiene los
       * plazos del Art 51.2/51.3/51.4 (5/6/3 días hábiles) entre el
       * carácter 1500 y 2500. La voz decía "no encuentro plazos"
       * porque nunca los veía.
       * El chat NO truncaba (usa c.content completo en route.ts).
       * Por eso el chat respondía bien y la voz no.
       * Fix: enviamos el chunk completo (max ~3000 chars, tokens
       * manejables para Gemini Live).
       */
      snippet: r.content,
      similarity: r.similarity,
    };
  });
}

/**
 * Formatea el resultado para inyectarlo de vuelta a Gemini Live como
 * respuesta de la function call. Texto legible para que el modelo lo
 * use en su respuesta hablada.
 *
 * Defensa contra citas SIN CONTEXTO: además de los fragmentos,
 * inyectamos una whitelist EXPLÍCITA de los identificadores de
 * documento primario CARGADOS EN ESTA BÚSQUEDA. El modelo debe citar
 * como fuente [N] SOLO estos, no números mencionados dentro del texto
 * de otros documentos (esos son citas internas — el documento sí
 * puede existir en la base, pero no está en el pool actual y por lo
 * tanto no tenemos su texto para transcribir).
 *
 * Corrección 13/07/2026: los ejemplos previos ("Directiva 007-2025-OECE-CD",
 * "Pronunciamiento 335-2026/OECE-DSAT") eran falso positivo — esos
 * documentos SÍ existen en BD, solo que no siempre están en el pool
 * de la consulta específica. La regla ahora se explica sin afirmar
 * inexistencia de documentos reales.
 */
export function formatResultsForLLM(
  results: NormativaSearchResult[],
): string {
  if (results.length === 0) {
    return 'No se encontraron resultados en la base normativa para esta consulta. Dile al usuario textualmente: "No encontré documentos sobre eso en mi base normativa actual. Te sugiero verificar en el portal del OECE o consultar a un abogado colegiado". NO INVENTES ninguna cita.';
  }

  const items = results
    .map((r, i) => {
      return `[Fuente ${i + 1}] ${r.citation} — ${r.title}\n${r.snippet}`;
    })
    .join('\n\n---\n\n');

  // Whitelist: solo estos identificadores son citables como documento
  // primario disponible en la base normativa de LexIA.
  const whitelistLines = results
    .map((r, i) => `  ${i + 1}. ${r.citation}`)
    .join('\n');

  return `Encontré ${results.length} fragmento(s) relevante(s) en la base normativa de LexIA.

═══════════════════════════════════════════════════════
DOCUMENTOS DISPONIBLES PARA CITAR (whitelist estricta):
═══════════════════════════════════════════════════════
${whitelistLines}

REGLA: cita como documento primario únicamente los que están en la lista de arriba — son los fragmentos que efectivamente traje en esta búsqueda. Si el texto de un fragmento menciona OTRA directiva, opinión, pronunciamiento o resolución por número, esa es una cita interna: el documento referenciado puede existir en la base normativa pero no está cargado en este pool, así que no tienes su contenido para transcribir. Menciónalo como "según se hace referencia en la [documento cargado arriba]" o llama de nuevo a search_normativa con ese número específico para traerlo.

Cuando cites un artículo de la Ley o el Reglamento por número, transcribe su texto solo si aparece en algún fragmento cargado. Si el fragmento solo lo menciona sin transcribirlo, di "el fragmento hace referencia al artículo X" sin inventar su contenido.

═══════════════════════════════════════════════════════
FRAGMENTOS:
═══════════════════════════════════════════════════════

${items}`;
}

/**
 * Rerank + dedupe de los chunks devueltos por hybrid_search.
 *
 * Problemas que resuelve:
 * 1. DUPLICADOS: la BD tiene varios documentos con el mismo contenido
 *    ingerido con distintos títulos (ej: "Pronunciamiento 298", "298",
 *    "8174689-pronunciamiento-n-298"). Sin dedup, el top-3 puede ser
 *    3 copias idénticas del mismo chunk y perdemos diversidad.
 *
 * 2. LEY vs PRONUNCIAMIENTOS: cuando la pregunta cita un concepto base
 *    del Reglamento (ej: "prevalencia entre pliego y bases integradas"),
 *    los pronunciamientos que aplican la regla a un caso concreto suelen
 *    ganar en similarity porque repiten el vocabulario. Pero la fuente
 *    primaria es la Ley/Reglamento. Damos un boost a los chunks de type
 *    'ley' o 'reglamento' cuando la query menciona palabras técnicas
 *    que sugieren consulta a fuente primaria.
 */
interface HybridRow {
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
  similarity: number;
}

function rerankAndDedupe(
  rows: HybridRow[],
  query: string,
  keepCount: number,
  opts: { penalizeOldLaw?: boolean } = {},
): HybridRow[] {
  const penalizeOldLaw = opts.penalizeOldLaw ?? true;
  const q = query.toLowerCase();

  // ¿La query pide una regla base? Términos que sugieren fuente primaria.
  // Ampliado 24/07/2026 tras test V2 (impedimentos): la pregunta "¿qué
  // tipos de impedimentos existen?" no matcheaba el patrón y el top-5
  // quedaba dominado por resoluciones TCE que citan la LEY VIEJA
  // (Art. 11 de la 30225) — la voz respondía con norma derogada.
  // Preguntas de definición/enumeración ("qué es", "qué tipos",
  // "cuáles son") también necesitan la fuente primaria vigente.
  const wantsBaseRule =
    /(?:prevalece|prevalecen|artículo|numeral|inciso|plazo|obliga|est[aá]blece|determina|dispone|regula|qu[ée]\s+(?:es|son|tipos)|cu[áa]les|tipos\s+de|impedimento|modalidad|requisito|procedimiento)/i.test(
      q,
    );

  // Score compuesto: similarity + boost por tipo + penalización por duplicado
  const seen = new Set<string>();
  const scored = rows
    .map((r) => {
      let score = r.similarity;
      // Boost fuente primaria si aplica
      if (wantsBaseRule && (r.doc_type === 'ley' || r.doc_type === 'reglamento')) {
        score += 0.08;
      }
      // Penalización LEY VIEJA: resoluciones TCE y pronunciamientos
      // antiguos citan la Ley 30225 (derogada). Si el chunk cita
      // explícitamente la 30225 o su reglamento (DS 344-2018) y NO
      // menciona la 32069, restamos score para que la fuente vigente
      // gane. La resolución sigue disponible como jurisprudencia si
      // no hay nada mejor.
      if (penalizeOldLaw) {
        const mentions30225 = /30225|344-2018/.test(r.content);
        const mentions32069 = /32069|009-2025/.test(r.content);
        if (mentions30225 && !mentions32069) {
          score -= 0.06;
        }
      }
      return { row: r, score };
    })
    .sort((a, b) => b.score - a.score);

  const out: HybridRow[] = [];
  for (const { row } of scored) {
    // Dedup: primeros 200 chars como firma
    const sig = row.content.slice(0, 200).replace(/\s+/g, ' ').trim();
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(row);
    if (out.length >= keepCount) break;
  }
  return out;
}

function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ley: 'Ley',
    reglamento: 'Reglamento',
    directiva: 'Directiva',
    opinion: 'Opinión DTN',
    pronunciamiento: 'Pronunciamiento OECE',
    resolucion: 'Resolución',
    resolucion_tce: 'Resolución TCE',
    lineamiento: 'Lineamiento',
    codigo_etica: 'Código de Ética',
    guia: 'Guía',
    tupa: 'TUPA',
    manual_seace: 'Manual SEACE',
    comunicado: 'Comunicado',
    bases_estandar: 'Bases Estándar',
  };
  return labels[type] || type;
}
