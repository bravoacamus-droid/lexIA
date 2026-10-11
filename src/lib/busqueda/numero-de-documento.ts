/**
 * Buscar un documento por su número: «9056-2026», «N° 09056-2026-TCP-S3»,
 * «D000054-2026», «Pronunciamiento 566-2026».
 *
 * POR QUÉ EXISTE
 *
 * César, documento 13 (10/10/2026): «Al poner enter solo el número y año
 * de la resolución no ubica la norma consultada». Ni la búsqueda por
 * significado ni la de todas las palabras sirven para esto. Para un
 * vector, «9056» y «9065» son casi lo mismo; y la búsqueda por palabras
 * mira el texto de los fragmentos, donde el número aparece escrito de mil
 * maneras («09056-2026-TCP- S3») o no aparece. Un número no se busca por
 * parecido: se va a buscar el documento que lo lleva.
 *
 * Se compara el número NORMALIZADO —correlativo sin ceros de relleno y
 * año—, contra la columna correlativo_num (migración 0037) y, de
 * respaldo, contra number/title. Las dos consultas van sobre
 * normative_documents (20 mil filas, índice (anio, correlativo_num)):
 * nunca sobre normative_chunks, que agota el tiempo.
 *
 * La sigla (TCP/TCE), la sala (S3) y la palabra que precede al número
 * («Resolución», «Opinión») no filtran: ordenan. Quien escribe «TCE» de
 * una resolución que la biblioteca guarda como «TCP» —en la transición de
 * 2025 el PDF y la ficha de gob.pe no siempre coinciden— la encuentra
 * igual, primera.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormativeDocType } from '@/lib/supabase/types';
import { bajadaDeResolucion } from './todas-las-palabras';

export interface NumeroDeDocumento {
  /** Tal como se escribió: «N° 09056-2026-TCP-S3». */
  texto: string;
  /** Sin ceros de relleno: 9056. */
  correlativo: number;
  anio: number;
  sigla: 'TCE' | 'TCP' | null;
  /** «S3». */
  sala: string | null;
  /** Lo demás que acompaña al número: «OECE», «DTN», «DSAT»… */
  sufijos: string[];
  /** El tipo que sugiere la palabra de delante, si la hay. */
  tipos: NormativeDocType[];
  /**
   * La consulta no es más que el número, con su «Resolución N°» o «del
   * Tribunal» alrededor. Entonces no hace falta buscar por significado.
   */
  soloNumero: boolean;
}

// El acuerdo va antes que «resolución»: «Acuerdo de Sala Plena del
// Tribunal» no es una resolución.
const TIPOS: Array<[RegExp, NormativeDocType[]]> = [
  [/acuerdo|sala\s+plena/i, ['acuerdo_sala_plena']],
  [/resoluci[óo]n|\bres\b|tribunal/i, ['resolucion_tce', 'resolucion']],
  [/opini[óo]n/i, ['opinion']],
  [/pronunciamiento/i, ['pronunciamiento']],
  [/directiva/i, ['directiva', 'directiva_entidad']],
  [/lineamiento/i, ['lineamiento']],
  [/decreto|reglamento|\bD\.?\s?S\.?/i, ['reglamento']],
];

/**
 * Palabras que pueden rodear al número sin cambiar lo que se busca. Si
 * después de quitar el número solo queda esto, la consulta es el número.
 */
const ACOMPANANTES = new Set(
  [
    'resolucion', 'res', 'opinion', 'pronunciamiento', 'directiva', 'lineamiento', 'acuerdo',
    'n', 'no', 'nro', 'num', 'numero', 'del', 'de', 'la', 'el', 'tribunal', 'contrataciones',
    'publicas', 'estado', 'sala', 'plena', 'tce', 'tcp', 'oece', 'osce', 'dtn', 'dsat', 'dgr', 'cd',
  ],
);

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * «9056-2026», «09056-2026-TCP-S3», «D000054-2026-OECE-DTN»,
 * «566-2026/OECE-DSAT». La letra de delante es la de las opiniones
 * («D000054»); detrás, segmentos separados por guion o barra.
 */
const PATRON =
  /(?<![\p{L}\d])([A-Za-z]{1,2})?0*(\d{1,6})\s*[-–]\s*((?:19|20)\d{2})(?!\d)((?:\s*[-–/]\s*[A-Za-zÑñ][A-Za-zÑñ0-9.]{0,12})*)/u;

export function reconocerNumeroDeDocumento(consulta: string): NumeroDeDocumento | null {
  const m = consulta.match(PATRON);
  if (!m || m.index === undefined) return null;
  const correlativo = Number(m[2]);
  if (!correlativo) return null;

  let sigla: 'TCE' | 'TCP' | null = null;
  let sala: string | null = null;
  const sufijos: string[] = [];
  for (const t of (m[4] ?? '').split(/[-–/\s.]+/).filter(Boolean)) {
    const u = t.toUpperCase();
    if (u === 'TCE' || u === 'TCP') sigla = u;
    else if (/^S\d$/.test(u)) sala = u;
    else sufijos.push(u);
  }

  const antes = consulta.slice(Math.max(0, m.index - 40), m.index);
  // «D000054-2026»: la «D» delante del correlativo es de las opiniones.
  const tipos = TIPOS.find(([re]) => re.test(antes))?.[1] ?? (/^d$/i.test(m[1] ?? '') ? ['opinion' as const] : []);

  const resto = sinTildes(consulta.slice(0, m.index) + ' ' + consulta.slice(m.index + m[0].length))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const soloNumero = resto.every((p) => ACOMPANANTES.has(p) || /^s\d$/.test(p));

  return { texto: m[0].trim(), correlativo, anio: Number(m[3]), sigla, sala, sufijos, tipos, soloNumero };
}

export interface DocumentoPorNumero {
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
  /** De qué trata, en una línea. */
  bajada: string | null;
  topChunkContent: string;
  score: number;
  chunkCount: number;
  matchedCount: number;
  matchedQueries: number[];
  /** Lo encontró el número, no el texto: la tarjeta puede decirlo. */
  porNumero: true;
}

interface Fila {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  date: string | null;
  source_url: string | null;
  summary: string | null;
  ai_summary: DocumentoPorNumero['ai_summary'];
  metadata: Record<string, unknown> | null;
  correlativo_num: number | null;
}

const COLUMNAS = 'id, type, number, title, date, source_url, summary, ai_summary, metadata, correlativo_num';

/**
 * Los documentos que llevan ese número, el más probable primero.
 *
 * `tipo` es el filtro de tipo que el usuario tenga puesto en la
 * biblioteca: se respeta, porque sirve para separar la «566-2026» del
 * Tribunal del Pronunciamiento N° 566-2026. Los demás filtros (año,
 * régimen, entidad) no se aplican: quien escribe un número quiere ese
 * documento, y un filtro olvidado que lo escondiera es justo el «no
 * ubica la norma consultada» que reportó César.
 */
export async function buscarPorNumero(
  supabase: SupabaseClient,
  ref: NumeroDeDocumento,
  opciones: { tipo?: string | null; indiceDeConsulta?: number; limite?: number } = {},
): Promise<DocumentoPorNumero[]> {
  const anio = String(ref.anio);
  const nucleo = `${ref.correlativo}-${anio}`;

  let porCorrelativo = supabase
    .from('normative_documents')
    .select(COLUMNAS)
    .eq('metadata->>anio', anio)
    .eq('correlativo_num', ref.correlativo)
    .eq('oculto', false)
    .limit(40);
  // Respaldo para los que no tienen correlativo cargado (o lo tienen de
  // otro año que el del número). «%9056-2026%» también trae «19056-2026»:
  // se descarta abajo con la comparación estricta.
  let porTexto = supabase
    .from('normative_documents')
    .select(COLUMNAS)
    .or(`number.ilike.%${nucleo}%,title.ilike.%${nucleo}%`)
    .eq('oculto', false)
    .limit(40);
  if (opciones.tipo) {
    porCorrelativo = porCorrelativo.eq('type', opciones.tipo);
    porTexto = porTexto.eq('type', opciones.tipo);
  }
  const [a, b] = await Promise.all([porCorrelativo, porTexto]);
  if (a.error) throw new Error(a.error.message);
  if (b.error) throw new Error(b.error.message);

  const estricto = new RegExp(`(?<!\\d)0*${ref.correlativo}\\s*[-–]\\s*${anio}(?!\\d)`);
  const vistos = new Map<string, Fila>();
  for (const f of [...((a.data ?? []) as Fila[]), ...((b.data ?? []) as Fila[])]) {
    if (vistos.has(f.id)) continue;
    const enElNumero = estricto.test(`${f.number ?? ''} ${f.title}`);
    const porSuCorrelativo = f.correlativo_num === ref.correlativo && String(f.metadata?.anio ?? '') === anio;
    if (enElNumero || porSuCorrelativo) vistos.set(f.id, f);
  }
  if (vistos.size === 0) return [];

  const puntuar = (f: Fila): number => {
    const numero = `${f.number ?? ''} ${f.title}`.toUpperCase();
    let p = estricto.test(numero) ? 2 : 0;
    if (ref.sala) {
      const suSala = numero.match(/-\s*S(\d)\b/)?.[1] ?? String(f.metadata?.sala ?? '').replace(/^S/i, '');
      if (suSala) p += `S${suSala}` === ref.sala ? 4 : -4;
    }
    if (ref.sigla) p += numero.includes(ref.sigla) ? 2 : numero.includes(ref.sigla === 'TCP' ? 'TCE' : 'TCP') ? -1 : 0;
    if (ref.tipos.includes(f.type)) p += 3;
    for (const s of ref.sufijos) if (numero.includes(s)) p += 1;
    return p;
  };

  const ordenados = [...vistos.values()]
    .map((f) => ({ f, p: puntuar(f) }))
    .sort((x, y) => y.p - x.p || String(y.f.date ?? '').localeCompare(String(x.f.date ?? '')))
    .slice(0, opciones.limite ?? 12);

  // La línea de «de qué trata» de las resoluciones sale de su primer
  // fragmento (no hay resumen guardado para las 17 mil).
  const resoluciones = ordenados.filter((o) => o.f.type === 'resolucion_tce').map((o) => o.f.id);
  const inicio = new Map<string, string>();
  if (resoluciones.length > 0) {
    const { data } = await supabase
      .from('normative_chunks')
      .select('document_id, content')
      .in('document_id', resoluciones)
      .eq('chunk_index', 0);
    for (const c of (data ?? []) as Array<{ document_id: string; content: string }>) inicio.set(c.document_id, c.content);
  }

  return ordenados.map(({ f, p }) => {
    const bajada =
      f.type === 'resolucion_tce' && inicio.get(f.id)
        ? bajadaDeResolucion(inicio.get(f.id)!)
        : f.ai_summary?.de_que_trata ?? f.summary ?? null;
    return {
      document_id: f.id,
      doc_type: f.type,
      doc_number: f.number,
      doc_title: f.title,
      date: f.date,
      source_url: f.source_url,
      summary: f.summary,
      ai_summary: f.ai_summary,
      bajada,
      topChunkContent: bajada ?? '',
      // Por encima de cualquier similitud (que no pasa de 1): va primero.
      score: 10 + p,
      chunkCount: 0,
      matchedCount: 1,
      matchedQueries: [opciones.indiceDeConsulta ?? 0],
      porNumero: true as const,
    };
  });
}
