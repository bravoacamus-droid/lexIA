/**
 * La búsqueda por chips: documentos que contienen TODAS las palabras.
 *
 * César (27/09/2026): con «subsanación», «anexo n° 3», «falta» y
 * «apelación» el buscador devolvía documentos que tenían una sola de las
 * cuatro. La búsqueda semántica sirve para preguntas; para palabras
 * clave el abogado espera lo que hace un buscador jurídico: que estén
 * todas, y ver en qué pasaje aparece cada una.
 *
 * Las consultas viven en la base (migraciones 0072 y 0073). Aquí se
 * preparan los términos y se arma lo que la pantalla necesita.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormativeDocType } from '@/lib/supabase/types';

/** Un pasaje donde aparece uno de los términos, con ⟦marcas⟧. */
export interface Pasaje {
  /** Índice del término (0 = el primer chip). */
  termino: number;
  texto: string;
  chunkIndex: number;
}

export interface ResultadoConTodas {
  document_id: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  doc_title: string;
  date: string | null;
  source_url: string | null;
  summary: string | null;
  ai_summary: {
    de_que_trata?: string;
    temas?: string[];
    questions?: Array<{ key: string; label: string; answer: string }>;
  } | null;
  /** De qué trata, en una línea: el «VISTO…» de una resolución. */
  bajada: string | null;
  pasajes: Pasaje[];
  /** Compatibilidad con las tarjetas de la biblioteca. */
  topChunkContent: string;
  score: number;
  chunkCount: number;
  matchedCount: number;
  matchedQueries: number[];
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Plural y singular de una palabra, con las reglas regulares del español. */
function numeros(w: string): string[] {
  if (!/^\p{L}{3,}$/u.test(w)) return [];
  const f: string[] = [];
  // plural
  if (/[aeiouáéíóú]$/.test(w)) f.push(`${w}s`);
  else if (/z$/.test(w)) f.push(`${w.slice(0, -1)}ces`);
  else if (/ión$/.test(w)) f.push(`${w.slice(0, -3)}iones`);
  else if (/[áéíóú]n$/.test(w)) f.push(`${w.slice(0, -2)}${sinTildes(w.slice(-2, -1))}nes`);
  else if (/és$/.test(w)) f.push(`${w.slice(0, -2)}eses`);
  else if (!/s$/.test(w)) f.push(`${w}es`);
  // singular
  if (/iones$/.test(w)) f.push(`${w.slice(0, -5)}ión`);
  else if (/ces$/.test(w)) f.push(`${w.slice(0, -3)}z`);
  else if (/[^aeiou]es$/.test(w)) f.push(w.slice(0, -2), w.slice(0, -1));
  else if (/s$/.test(w)) f.push(w.slice(0, -1));
  return f;
}

/**
 * Las formas en que un término puede estar escrito en la biblioteca.
 *
 * La búsqueda es por palabra exacta (diccionario es_exacto, migración
 * 0074): «penalidad» no trae «penales», que es lo que pasaba reduciendo
 * a raíces. A cambio, las variantes que sí son la misma palabra se
 * buscan aquí, a la vista:
 *   - con y sin tilde: las resoluciones escaneadas o copiadas de gob.pe
 *     suelen venir sin ella («subsanacion»), y quien escribe también;
 *   - singular y plural: «apelación» encuentra «apelaciones».
 * En una frase («anexo n° 3») solo varían las tildes: pluralizarla
 * cambiaría lo que se busca.
 */
export function variantesDeTermino(termino: string): string {
  const t = termino.trim().toLowerCase().replace(/\|/g, ' ').replace(/\s+/g, ' ');
  const formas = new Set<string>([t]);
  const conTilde = t.replace(/([cs])ion(es)?\b/g, (_m, l: string, es?: string) => (es ? `${l}iones` : `${l}ión`));
  formas.add(conTilde);
  if (!t.includes(' ')) {
    for (const base of [t, conTilde]) for (const n of numeros(base)) formas.add(n);
  }
  for (const f of Array.from(formas)) formas.add(sinTildes(f));
  return Array.from(formas).join('|');
}

/**
 * La línea de «de qué trata» de una resolución del Tribunal.
 *
 * Todas empiezan igual: «VISTO en sesión del … el Expediente N° …, sobre
 * el recurso de apelación interpuesto por …, en el marco del …». Lo que
 * sigue a «sobre» es exactamente lo que un abogado quiere leer antes de
 * abrirla. No hay un resumen guardado para las 16 mil resoluciones, pero
 * sí está en su primera página.
 */
export function bajadaDeResolucion(texto: string): string | null {
  const plano = texto.replace(/\s+/g, ' ');
  const visto = plano.search(/\bVISTO\b/i);
  if (visto < 0) return null;
  const resto = plano.slice(visto);
  const m = resto.match(/\bsobre\s+(?:el|la|los|las)\s+/i);
  if (!m || m.index === undefined || m.index > 500) return null;
  let cuerpo = resto.slice(m.index + m[0].length);
  const fin = cuerpo.search(/;\s*y,?\s|\s+y,\s+atendiendo|\bCONSIDERANDO\b|\bI\.\s+ANTECEDENTES\b/);
  if (fin > 0) cuerpo = cuerpo.slice(0, fin);
  cuerpo = cuerpo.trim().replace(/[,;:\s]+$/, '');
  if (cuerpo.length < 20) return null;
  if (cuerpo.length > 420) {
    const corte = cuerpo.lastIndexOf(' ', 420);
    cuerpo = `${cuerpo.slice(0, corte > 300 ? corte : 420)}…`;
  }
  return cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1);
}

export interface FiltrosDeBusqueda {
  tipo?: string | null;
  ley?: string | null;
  entidad?: string | null;
  anioDesde?: number | null;
  anioHasta?: number | null;
  fechaDesde?: string | null;
}

export async function buscarConTodasLasPalabras(
  supabase: SupabaseClient,
  terminos: string[],
  filtros: FiltrosDeBusqueda,
  limite: number,
  desde: number,
  pasajesPorTermino = 3,
): Promise<{ total: number; resultados: ResultadoConTodas[] }> {
  const conVariantes = terminos.map(variantesDeTermino);

  const { data: filas, error } = await supabase.rpc('buscar_con_todas_las_palabras', {
    p_terminos: conVariantes,
    p_tipo: filtros.tipo ?? null,
    p_ley: filtros.ley ?? null,
    p_limite: limite,
    p_desde: desde,
    p_entidad: filtros.entidad ?? null,
    p_anio_desde: filtros.anioDesde ?? null,
    p_anio_hasta: filtros.anioHasta ?? null,
    p_fecha_desde: filtros.fechaDesde ?? null,
  });
  if (error) throw new Error(error.message);
  const encontrados = (filas ?? []) as Array<{ document_id: string; total: number }>;
  if (encontrados.length === 0) return { total: 0, resultados: [] };
  const ids = encontrados.map((f) => f.document_id);
  const total = Number(encontrados[0].total);

  const [{ data: docs, error: e1 }, { data: frags, error: e2 }, { data: primeros }] = await Promise.all([
    supabase
      .from('normative_documents')
      .select('id, type, number, title, date, source_url, summary, ai_summary')
      .in('id', ids),
    supabase.rpc('fragmentos_con_palabras', {
      p_documentos: ids,
      p_terminos: conVariantes,
      p_por_termino: pasajesPorTermino,
    }),
    supabase
      .from('normative_chunks')
      .select('document_id, content')
      .in('document_id', ids)
      .eq('chunk_index', 0),
  ]);
  if (e1) throw new Error(e1.message);
  // Sin pasajes el resultado sigue valiendo: se muestra sin ellos.
  if (e2) console.error('[busqueda] fragmentos_con_palabras:', e2.message);

  const porId = new Map(
    ((docs ?? []) as Array<{
      id: string;
      type: NormativeDocType;
      number: string | null;
      title: string;
      date: string | null;
      source_url: string | null;
      summary: string | null;
      ai_summary: ResultadoConTodas['ai_summary'];
    }>).map((d) => [d.id, d]),
  );
  const inicio = new Map(
    ((primeros ?? []) as Array<{ document_id: string; content: string }>).map((c) => [c.document_id, c.content]),
  );
  const pasajes = new Map<string, Pasaje[]>();
  for (const f of (frags ?? []) as Array<{ document_id: string; termino: number; chunk_index: number; fragmento: string }>) {
    const lista = pasajes.get(f.document_id) ?? [];
    // Un mismo fragmento puede traer el término dos veces: ts_headline ya
    // junta los trozos; lo que se evita es repetir el mismo pasaje.
    const texto = f.fragmento.replace(/\s+/g, ' ').trim();
    if (!lista.some((p) => p.termino === f.termino - 1 && p.texto === texto)) {
      lista.push({ termino: f.termino - 1, texto, chunkIndex: f.chunk_index });
    }
    pasajes.set(f.document_id, lista);
  }

  const todos = terminos.map((_t, i) => i);
  const resultados: ResultadoConTodas[] = [];
  for (const id of ids) {
    const d = porId.get(id);
    if (!d) continue;
    const suyos = (pasajes.get(id) ?? []).sort((a, b) => a.termino - b.termino || a.chunkIndex - b.chunkIndex);
    const bajada =
      d.type === 'resolucion_tce' && inicio.get(id)
        ? bajadaDeResolucion(inicio.get(id)!)
        : d.ai_summary?.de_que_trata ?? d.summary ?? null;
    resultados.push({
      document_id: d.id,
      doc_type: d.type,
      doc_number: d.number,
      doc_title: d.title,
      date: d.date,
      source_url: d.source_url,
      summary: d.summary,
      ai_summary: d.ai_summary,
      bajada,
      pasajes: suyos,
      topChunkContent: suyos[0]?.texto.replace(/[⟦⟧]/g, '') ?? '',
      score: 1,
      chunkCount: suyos.length,
      matchedCount: terminos.length,
      matchedQueries: todos,
    });
  }
  return { total, resultados };
}
