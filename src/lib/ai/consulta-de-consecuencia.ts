/**
 * Preguntas por la consecuencia de un defecto de la oferta: «¿corresponde
 * no admitirla o no otorgarle el puntaje?».
 *
 * POR QUÉ ES UN CASO APARTE
 *
 * César, documento 15 (17/10/2026). Las bases fijaban la entrega en 80
 * días «computado a partir del día siguiente de la suscripción del
 * contrato»; el postor, en el Anexo N° 12, se comprometió a 10 días «para
 * la primera entrega», contados desde el perfeccionamiento «o
 * notificación de la orden de compra según corresponda». Preguntó si eso
 * lleva a no admitir la oferta o a no otorgar el puntaje. El Tribunal ha
 * resuelto defectos así en los dos sentidos:
 *
 *   · no admitir: la Resolución N° 6259-2025-TCP-S1 (el plazo contado
 *     desde un «acta de inicio de actividades» que las bases no preveían:
 *     no hay certeza de que se cumpla el requerimiento mínimo, y limitar
 *     el efecto a quitar el puntaje dejaría la oferta en competencia) y la
 *     N° 8674-2026-TCP-S4 («365 días calendario o 1,000 toneladas»: una
 *     condición alternativa, incongruente con el Anexo N° 3, que no se
 *     subsana);
 *   · no otorgar el puntaje: la N° 7895-2026-TCP-S3 (un día «después de
 *     la firma del contrato» cuando las bases lo contaban desde la
 *     notificación del requerimiento: el puntaje exige cumplir el hito de
 *     cómputo) y la N° 05768-2026-TCP-S2 (desde «la firma» y no desde el
 *     día siguiente del perfeccionamiento: se revocan los 30 puntos).
 *
 * El chat no reconocía la pregunta —no es un «¿se puede exigir?»— y la
 * búsqueda del tema la reducía a «plazo de entrega» + «oferta» +
 * «admisibilidad»: 266 documentos, ninguno de los cuatro entre los que
 * leía el modelo. La respuesta no podía poner las dos posiciones.
 *
 * QUÉ HACE
 *
 *   1. Un filtro barato: la pregunta nombra dos consecuencias posibles
 *      (no admitir, descalificar, no otorgar o revocar el puntaje,
 *      subsanar). Si pasa, una llamada corta al modelo rápido confirma que
 *      se pregunta por la consecuencia de un defecto y devuelve de tres a
 *      cinco expresiones con que el Tribunal describe ese defecto.
 *   2. Los documentos se buscan por PARES de expresiones —todas a la vez
 *      casi nunca coinciden; una sola trae miles—, con la consulta de la
 *      búsqueda avanzada. Un documento sube por cada par que lo contiene,
 *      y más si el par es raro: «anexo n° 12» + «condición distinta» está
 *      en cuatro documentos, «plazo de entrega» + «orden de compra» en
 *      quinientos.
 *   3. Los mejores van al modelo con los fragmentos donde se analiza y se
 *      decide, y el modelo recibe la estructura: la regla de las bases,
 *      las posiciones agrupadas por la consecuencia que se APLICÓ y una
 *      conclusión condicional cuando las resoluciones discrepan.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { variantesDeTermino } from '@/lib/busqueda/todas-las-palabras';
import { armarFuentesDelTema, type FuentesDelTema } from '@/lib/ai/fuentes-del-tema';

/**
 * Las consecuencias que puede tener un defecto de la oferta, como se
 * nombran en una pregunta. El filtro pide dos: quien duda entre dos
 * consecuencias es quien necesita ver las dos posiciones.
 */
const CONSECUENCIAS: RegExp[] = [
  // no admitir
  /\b(?:no\s+(?:se\s+)?admit|inadmisi|inadmit|admisi[óo]n\s+de\s+(?:la|su)\s+oferta|admitir\s+(?:la|su)\s+oferta|declarar?\s+no\s+admitid)/i,
  // el puntaje
  /\bpuntaje|\bpuntos\b|factor(?:es)?\s+de\s+evaluaci[óo]n/i,
  // descalificar
  /\bdescalific|\bno\s+califica\b/i,
  // subsanar
  /\bsubsan/i,
];

export function pareceConsultaDeConsecuencia(texto: string): boolean {
  if (texto.length < 30 || texto.length > 2500) return false;
  return CONSECUENCIAS.filter((r) => r.test(texto)).length >= 2;
}

export interface ConsultaDeConsecuencia {
  /** El defecto de la oferta, en pocas palabras. */
  defecto: string;
  /** Las consecuencias entre las que duda la pregunta. */
  consecuencias: string[];
  /** El documento o factor afectado, como lo nombran las bases: «anexo n° 12», «plazo de entrega». */
  afectado: string[];
  /** La figura del defecto, como la escribe el Tribunal: «condición distinta», «inicio del cómputo». */
  figura: string[];
  /** Lo que el postor cambió o añadió, si tiene nombre propio: solo ayuda a elegir fragmentos. */
  elemento: string[];
}

const SISTEMA = `Clasificas consultas sobre ofertas en procedimientos de selección (contrataciones públicas peruanas, Ley N° 32069).

Responde SOLO un JSON, sin markdown:
{"es_consecuencia": true|false, "defecto": "...", "consecuencias": ["..."], "afectado": ["..."], "figura": ["..."], "elemento": ["..."]}

- es_consecuencia: true si se pregunta QUÉ CONSECUENCIA tiene en la evaluación un defecto, condición añadida, omisión o discrepancia de una oferta frente a las bases: no admitirla, descalificarla, no otorgarle o revocarle el puntaje de un factor, permitir subsanarla, o admitirla y puntuarla igual. False si se pregunta otra cosa (plazos, requisitos que puede pedir la entidad, qué dice un artículo).
- defecto: el defecto, en 5 a 12 palabras.
- consecuencias: las que la pregunta pone en duda, de entre "no admitir", "descalificar", "no otorgar puntaje", "subsanar", "otorgar puntaje".
- afectado: 1 o 2 expresiones con el documento o el factor de evaluación afectado, como lo nombran las bases ("anexo n° 12", "plazo de entrega", "garantía comercial", "experiencia del postor", "declaración jurada"). Un anexo siempre como "anexo n° X".
- figura: 2 o 3 expresiones CORTAS (2 o 3 palabras, minúsculas) con que una resolución del Tribunal describe ESE tipo de defecto. Incluye la que usa la pregunta y las que usa el Tribunal para lo mismo, por ejemplo: "condición distinta", "condición adicional", "inicio del cómputo", "cómputo del plazo", "información incongruente", "error material", "contenido esencial", "mejora del plazo".
- elemento: 0 o 1 expresión con lo que el postor cambió o añadió, si tiene nombre propio ("acta de inicio", "orden de servicio", "folio").
No pongas palabras que están en cualquier resolución ("oferta", "postor", "bases", "puntaje", "admisión", "contrato", "entidad", "procedimiento", "plazo") ni frases largas copiadas de la pregunta.

Ejemplo: "en la declaración jurada de garantía comercial ofreció 25 meses pero en otro folio dice 6 meses, ¿se le quita el puntaje o se descalifica?" → {"es_consecuencia": true, "defecto": "garantía comercial declarada con dos plazos distintos en la oferta", "consecuencias": ["no otorgar puntaje", "descalificar"], "afectado": ["garantía comercial"], "figura": ["información incongruente", "incertidumbre"], "elemento": ["folio"]}`;

const limpiar = (lista: unknown, tope: number): string[] =>
  Array.from(
    new Set(
      (Array.isArray(lista) ? lista : [])
        .map((t) => String(t).trim().toLowerCase().replace(/[«»"]/g, ''))
        // «anexo 12», «anexo nº 12», «anexo n.° 12» → como lo escriben las resoluciones.
        .map((t) => t.replace(/\banexo\s+(?:n\s*[°º.]*\s*)?(\d+)/, 'anexo n° $1'))
        // Una expresión de más de tres palabras ya no aparece literal.
        .filter((t) => t.length >= 3 && t.length <= 50 && t.split(/\s+/).length <= 4),
    ),
  ).slice(0, tope);

/** null si no se pregunta por la consecuencia de un defecto, o si el modelo no respondió a tiempo. */
export async function analizarConsultaDeConsecuencia(
  texto: string,
  tiempoMs = 4000,
): Promise<ConsultaDeConsecuencia | null> {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (!pareceConsultaDeConsecuencia(plano)) return null;
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: plano.slice(0, 2500),
      temperature: 0,
      maxTokens: 260,
      abortSignal: AbortSignal.timeout(tiempoMs),
    });
    const crudo = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
    if (!crudo.es_consecuencia) return null;
    const afectado = limpiar(crudo.afectado, 2);
    const figura = limpiar(crudo.figura, 3).filter((t) => !afectado.includes(t));
    // Sin figura no hay con qué cruzar: el documento afectado solo está en
    // cualquier resolución que lo evalúe.
    if (figura.length === 0 || afectado.length + figura.length < 3) return null;
    return {
      defecto: String(crudo.defecto ?? '').trim().slice(0, 140),
      consecuencias: limpiar(crudo.consecuencias, 4),
      afectado,
      figura,
      elemento: limpiar(crudo.elemento, 1).filter((t) => !afectado.includes(t) && !figura.includes(t)),
    };
  } catch (e) {
    console.warn('[consecuencia] omitido:', (e as Error).message);
    return null;
  }
}

/**
 * Los pares que se buscan: cada figura del defecto con cada documento o
 * factor afectado. Medido con la pregunta de César: «anexo n° 12» +
 * «condición distinta» está en 4 documentos —las cuatro resoluciones que
 * él esperaba—; «plazo de entrega» + «inicio del cómputo», en 53, tres de
 * ellas. Lo que el postor añadió («orden de compra») cruzado con lo
 * afectado no distingue nada (567 documentos con «plazo de entrega»), así
 * que solo sirve para elegir fragmentos.
 */
export function paresDeLaConsecuencia(c: ConsultaDeConsecuencia): Array<[string, string]> {
  const figura = conAfines(c.figura);
  const pares: Array<[string, string]> = [];
  if (c.afectado.length > 0) {
    for (const a of c.afectado) for (const f of figura) pares.push([a, f]);
  } else {
    for (let i = 0; i < figura.length; i++)
      for (let j = i + 1; j < figura.length; j++) pares.push([figura[i], figura[j]]);
  }
  return pares;
}

/**
 * Las formas con que el Tribunal nombra la misma figura. El modelo rápido
 * escoge una o dos, y no siempre la del Tribunal: con la pregunta de César
 * devolvió «condición adicional» —la palabra de la pregunta, que está en
 * una sola de las cuatro resoluciones— y no «condición distinta», que
 * está en las cuatro.
 */
const FIGURAS_AFINES: string[][] = [
  ['condición distinta', 'condición adicional', 'condición no prevista'],
  ['inicio del cómputo', 'cómputo del plazo'],
  ['información incongruente', 'incongruencia'],
  ['error material', 'error formal'],
  ['contenido esencial', 'alcance de la oferta'],
];
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const TOPE_FIGURAS = 5;

export function conAfines(figura: string[]): string[] {
  const salida = [...figura];
  for (const f of figura) {
    const grupo = FIGURAS_AFINES.find((g) => g.some((x) => sinTildes(x) === sinTildes(f)));
    for (const x of grupo ?? []) if (!salida.some((y) => sinTildes(y) === sinTildes(x))) salida.push(x);
  }
  return salida.slice(0, TOPE_FIGURAS);
}

/** Los tipos que resuelven casos: los que pueden aplicar una consecuencia. */
const CASUISTICA = new Set([
  'resolucion_tce',
  'pronunciamiento',
  'opinion',
  'acuerdo_sala_plena',
  'informe_vicio_nulidad',
  'dictamen',
]);
/** Por encima de esto un par no distingue el defecto: está en cualquier resolución. */
const MAX_POR_PAR = 100;
const POR_PAGINA = 50;

interface Par {
  terminos: [string, string];
  total: number;
  ids: string[];
}

/** Un documento que analiza el defecto: lo que necesita la voz para citarlo. */
export interface DocumentoQueAnaliza {
  document_id: string;
  tipo: string;
  numero: string | null;
  titulo: string;
  fecha: string | null;
}

/**
 * Los documentos que analizan el defecto, por pares de expresiones, del
 * más pertinente al menos. `pares` son los que dieron resultado, con sus
 * documentos: de ahí sale la lista que ve el usuario en el chat.
 */
export async function documentosDeLaConsecuencia(
  supabase: SupabaseClient,
  c: ConsultaDeConsecuencia,
  opciones: {
    ley?: string | null;
    tope?: number;
    /**
     * Tope por par, para la voz. Medido el 17/10/2026: con palabras
     * frecuentes («anexo n° 12» + «condición adicional») un par tarda 4 a
     * 6 s aunque se repita; con una rara («condición distinta»), 0,3 s. Un
     * par que no llega a tiempo se deja: los rápidos suelen ser los más
     * específicos.
     */
    tiempoPorParMs?: number;
    /** 1 para la voz: la segunda página de un par solo alarga la lista del chat. */
    paginas?: 1 | 2;
  } = {},
): Promise<{ elegidos: DocumentoQueAnaliza[]; pares: Par[] } | null> {
  const tope = opciones.tope ?? 8;
  const consulta = async (terminos: string[], desde: number) => {
    let pedido = supabase.rpc('buscar_con_todas_las_palabras', {
      p_terminos: terminos.map(variantesDeTermino),
      p_tipo: null,
      p_ley: opciones.ley ?? null,
      p_limite: POR_PAGINA,
      p_desde: desde,
    });
    if (opciones.tiempoPorParMs) pedido = pedido.abortSignal(AbortSignal.timeout(opciones.tiempoPorParMs));
    const { data, error } = await pedido;
    // Un error no es «no hay»: se dice en el registro y se sigue con los demás pares.
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ document_id: string; total: number }>;
  };

  const pares: Par[] = (
    await Promise.all(
      paresDeLaConsecuencia(c).map(async (terminos): Promise<Par | null> => {
        try {
          const primera = await consulta(terminos, 0);
          if (primera.length === 0) return null;
          const total = Number(primera[0].total);
          if (total > MAX_POR_PAR) return { terminos, total, ids: [] };
          const segunda = total > POR_PAGINA && opciones.paginas !== 1 ? await consulta(terminos, POR_PAGINA) : [];
          return { terminos, total, ids: [...primera, ...segunda].map((f) => f.document_id) };
        } catch (e) {
          console.error('[consecuencia] par no consultado:', terminos, (e as Error).message);
          return null;
        }
      }),
    )
  ).filter((p): p is Par => p !== null && p.ids.length > 0);
  if (pares.length === 0) return null;

  // Cada par suma, y más cuanto más raro: 1/log2(2 + total).
  const puntos = new Map<string, number>();
  for (const p of pares) {
    const peso = 1 / Math.log2(2 + p.total);
    for (const id of p.ids) puntos.set(id, (puntos.get(id) ?? 0) + peso);
  }

  const candidatos = Array.from(puntos.keys());
  const { data: fichas, error } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, date, oculto')
    .in('id', candidatos);
  if (error) throw new Error(error.message);
  type Ficha = { id: string; type: string; number: string | null; title: string; date: string | null; oculto: boolean | null };
  const ficha = new Map(((fichas ?? []) as Ficha[]).map((f) => [f.id, f]));
  const elegidos = candidatos
    .filter((id) => {
      const f = ficha.get(id);
      // Lo derogado o retirado no se ofrece (lib/normativa/ocultos).
      return f && !f.oculto && CASUISTICA.has(f.type);
    })
    .sort(
      (a, b) =>
        (puntos.get(b) ?? 0) - (puntos.get(a) ?? 0) ||
        String(ficha.get(b)?.date ?? '').localeCompare(String(ficha.get(a)?.date ?? '')),
    )
    .slice(0, tope)
    .map((id) => {
      const f = ficha.get(id)!;
      return { document_id: id, tipo: f.type, numero: f.number, titulo: f.title, fecha: f.date };
    });
  if (elegidos.length === 0) return null;
  console.log('[consecuencia] pares', {
    pares: pares.map((p) => `${p.terminos.join(' + ')} (${p.total})`),
    elegidos: elegidos.map((d) => `${d.numero}: ${(puntos.get(d.document_id) ?? 0).toFixed(2)}`),
  });
  return { elegidos, pares };
}

/**
 * Para el chat: los documentos que lee el modelo (en `lectura`) y la lista
 * del tema, la que ve el usuario debajo de la respuesta, con las dos
 * expresiones del par que mejor recoge a los elegidos, para que «Ver en la
 * búsqueda avanzada» muestre lo mismo que dice su cabecera.
 */
export async function buscarFuentesDeLaConsecuencia(
  supabase: SupabaseClient,
  c: ConsultaDeConsecuencia,
  opciones: { ley?: string | null; tope?: number; porDocumento?: number } = {},
): Promise<FuentesDelTema | null> {
  const hallado = await documentosDeLaConsecuencia(supabase, c, opciones);
  if (!hallado) return null;
  const elegidos = hallado.elegidos.map((d) => d.document_id);
  // El par que más elegidos contiene; a igualdad, el que lista más
  // documentos (todos contienen las dos expresiones, así que la lista
  // sigue siendo coherente con lo que dice su cabecera).
  const cubre = (p: Par) => elegidos.filter((id) => p.ids.includes(id)).length;
  const eje = [...hallado.pares].sort((a, b) => cubre(b) - cubre(a) || b.total - a.total)[0];
  const ids = Array.from(new Set([...elegidos, ...eje.ids]));
  const fuentes = await armarFuentesDelTema(supabase, ids, eje.terminos, [], eje.total);
  return {
    ...fuentes,
    lectura: {
      ids: elegidos,
      afectado: c.afectado,
      figura: conAfines(c.figura),
      elemento: c.elemento,
      porDocumento: opciones.porDocumento ?? 3,
    },
  };
}

/** Señales de que el Colegiado analiza o decide, no de que una parte alega. */
const ANALISIS =
  /\b(?:este\s+Colegiado|esta\s+Sala|la\s+Sala\s+(?:concluye|advierte|considera)|se\s+advierte|se\s+aprecia|cabe\s+(?:resaltar|precisar|indicar|se[ñn]alar)|en\s+consecuencia|por\s+lo\s+expuesto|corresponde\s+(?:revocar|confirmar|declarar|otorgar|asignar)|no\s+corresponde|no\s+resulta\s+subsanable|contenido\s+esencial|incongruen|certeza|incertidumbre)/gi;
const RESUELVE = /\b(?:LA\s+SALA\s+RESUELVE|SE\s+RESUELVE|RESUELVE\s*:)/;

/**
 * Los fragmentos que lee el modelo de cada documento: los que ANALIZAN el
 * defecto y la parte resolutiva.
 *
 * Con la elección general (lib/ai/fuentes-del-tema, fragmentosParaElModelo)
 * de la Resolución N° 8674-2026-TCP-S4 llegaban los antecedentes —el
 * recurso y los decretos, donde aparecen «Anexo N° 12», «no admitida» y
 * «subsanación» igual que en el análisis— y no los fundamentos 20 a 26,
 * donde el Colegiado explica por qué «365 días calendario o 1,000
 * toneladas» es una condición adicional que hace incongruente la oferta y
 * no se subsana. Aquí pesa la figura del defecto («condición distinta»,
 * «inicio del cómputo») más que lo afectado, cuentan las señales de
 * análisis del Colegiado y se prefiere la segunda mitad del documento,
 * donde están los fundamentos. Y se añade la parte resolutiva, que dice
 * sin margen qué consecuencia se aplicó.
 */
export async function fragmentosDeLaConsecuencia<D extends { document_id: string }>(
  supabase: SupabaseClient,
  documentos: D[],
  lectura: NonNullable<FuentesDelTema['lectura']>,
): Promise<{
  piezas: Array<{ id: string; document_id: string; content: string; doc: D; indice: number }>;
  /** Por documento, las frases donde el Tribunal dice qué consecuencia aplica. */
  decisiones: Map<string, string[]>;
}> {
  const formas = (lista: string[]) => lista.map((e) => variantesDeTermino(e).split('|').map(normalizar));
  const figura = formas(lectura.figura);
  const afectado = formas([...lectura.afectado, ...lectura.elemento]);
  const presentes = (plano: string, grupo: string[][]) => grupo.filter((vs) => vs.some((v) => v && plano.includes(v))).length;

  const porDoc = await Promise.all(
    documentos.map(async (d) => {
      const { data, error } = await supabase
        .from('normative_chunks')
        .select('id, chunk_index, content')
        .eq('document_id', d.document_id)
        .order('chunk_index', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      return { d, filas: (data ?? []) as Array<{ id: string; chunk_index: number; content: string }> };
    }),
  );

  const salida: Array<{ id: string; document_id: string; content: string; doc: D; indice: number }> = [];
  const decisiones = new Map<string, string[]>();
  for (const { d, filas } of porDoc) {
    if (filas.length === 0) continue;
    decisiones.set(d.document_id, decisionesDelDocumento(filas));
    const ultimo = Math.max(1, filas[filas.length - 1].chunk_index);
    const puntuados = filas
      .map((f) => {
        const plano = normalizar(f.content);
        const fig = presentes(plano, figura);
        const afe = presentes(plano, afectado);
        const analisis = Math.min((f.content.match(ANALISIS) ?? []).length, 8);
        const puntos = fig * 4 + afe * 2 + analisis + (f.chunk_index / ultimo) * 4;
        return { f, tema: fig + afe, puntos };
      })
      .filter((x) => x.tema > 0)
      .sort((a, b) => b.puntos - a.puntos || b.f.chunk_index - a.f.chunk_index)
      .slice(0, lectura.porDocumento);
    const elegidos = puntuados.map((x) => x.f);
    const resolutiva = filas.find((f) => RESUELVE.test(f.content));
    if (resolutiva && !elegidos.includes(resolutiva)) elegidos.push(resolutiva);
    // En el orden del documento: planteamiento, análisis, decisión.
    for (const f of elegidos.sort((a, b) => a.chunk_index - b.chunk_index))
      salida.push({ id: f.id, document_id: d.document_id, content: f.content, doc: d, indice: f.chunk_index });
  }
  return { piezas: salida, decisiones };
}

/** Una consecuencia sobre la oferta o el puntaje. */
const CONSECUENCIA_APLICADA =
  /\b(?:no\s+admitid|no\s+admisi[óo]n|revocar\s+(?:la\s+)?(?:admisi[óo]n|no\s+admisi[óo]n)|declar\w*\s+(?:la\s+oferta\s+)?(?:no\s+)?admitid|descalific|(?:no\s+)?asignaci[óo]n\s+del\s+puntaje|(?:asignar|otorgar|retirar|revocar|quitar|restar)(?:le)?\s+(?:el\s+|los\s+)?(?:puntaje|[\w()\s]{0,30}puntos)|no\s+(?:resulta|es)\s+subsanable)/i;
/** El que habla es el Colegiado, decidiendo. */
const DECIDE =
  /\b(?:corresponde|correspondiendo|confirmar|revocar|ratificar|se\s+declara|concluye|por\s+lo\s+expuesto|en\s+consecuencia|por\s+tanto|por\s+lo\s+tanto|no\s+resulta)/i;
/** El que habla es una parte: lo que alega no es lo que se decidió. */
const ALEGA =
  /\b(?:solicit[óa]|sostiene|sostuvo|se[ñn]al[óa]|refiere|refiri[óo]|manifest[óo]|indic[óo]|alega|aleg[óo]|argument[óa]|afirma|precis[óa]\s+que|considera\s+que)\b/i;
/** Enuncia lo que se va a analizar, no lo que se decidió. */
const ANUNCIA = /\b(?:determinar\s+si|corresponde\s+(?:revisar|analizar|determinar|verificar|evaluar|remitirnos|traer))\b/i;
const VOTO = /VOTO\s+(?:SINGULAR|EN\s+DISCORDIA|DIRIMENTE)|FUNDAMENTO\s+DE\s+VOTO/;

/**
 * Las frases en que el Tribunal dice qué consecuencia aplica: «corresponde
 * revocar la admisión …, cuya oferta se declara no admitida», «corresponde
 * revocar los treinta (30) puntos asignados …», «confirmar la no
 * asignación del puntaje …».
 *
 * Van al modelo junto a la lista de documentos. Con solo los fragmentos,
 * en la primera prueba con la pregunta de César puso la Resolución N°
 * 05768-2026-TCP-S2 —que revocó los 30 puntos del factor y dejó la oferta
 * admitida— entre las que no admitieron la oferta: el fragmento discute
 * la incertidumbre del plazo igual que una no admisión. La frase de la
 * decisión no deja margen.
 *
 * Se descartan las de la primera tercera parte, que son antecedentes, y
 * las que atribuyen la idea a una parte. Las del voto singular o en
 * discordia se marcan como tales.
 */
export function decisionesDelDocumento(filas: Array<{ chunk_index: number; content: string }>): string[] {
  // Los fragmentos se solapan: la frase con que empieza uno es la última del anterior.
  const vistas = new Set<string>();
  const frases: Array<{ texto: string; voto: boolean }> = [];
  let enVoto = false;
  for (const f of filas) {
    const texto = f.content.replace(/Tribunal de Contrataciones P[úu]blicas Resoluci[óo]n N[º°]?\s*[\w-]+(?:\s*-\s*\w+)?\s*P[áa]gina\s+\d+\s+de\s+\d+/g, ' ');
    for (const cruda of texto.split(/(?<=[.;])\s+(?=(?:\d{1,3}\.\s+)?[A-ZÁÉÍÓÚÑ¿«“"])/)) {
      const frase = cruda.replace(/\s+/g, ' ').trim();
      if (VOTO.test(frase)) enVoto = true;
      const clave = normalizar(frase).slice(0, 160);
      if (frase.length < 40 || vistas.has(clave)) continue;
      vistas.add(clave);
      frases.push({ texto: frase, voto: enVoto });
    }
  }
  const desde = Math.floor(frases.length / 3);
  const elegidas = frases
    .slice(desde)
    .filter(
      (x) =>
        CONSECUENCIA_APLICADA.test(x.texto) && DECIDE.test(x.texto) && !ALEGA.test(x.texto) && !ANUNCIA.test(x.texto),
    );
  const recortar = (t: string) => (t.length > 420 ? `${t.slice(0, 420)}…` : t);
  const mayoria = elegidas.filter((x) => !x.voto).slice(-3);
  const voto = elegidas.filter((x) => x.voto).slice(-1);
  return [
    ...mayoria.map((x) => recortar(x.texto)),
    ...voto.map((x) => `${PREFIJO_VOTO} ${recortar(x.texto)}`),
  ];
}

const PREFIJO_VOTO = '(voto singular o en discordia, no es la decisión)';

/**
 * Qué consecuencia aplica una frase de decisión. Con las frases solas, en
 * una prueba el modelo puso la Resolución N° 2207-2026-TCP-S4 —que revocó
 * la NO admisión de una oferta— entre las que no admitieron: «revocar» y
 * «no admisión» en la misma frase. El orden de las reglas importa: la
 * doble negación va primero.
 */
const ETIQUETAS: Array<[RegExp, string]> = [
  [/revocar\s+(?:la\s+)?(?:decisi[óo]n\s+[^.]{0,80}?de\s+)?(?:tener\s+por\s+)?no\s+admitid|revocar\s+(?:la\s+)?no\s+admisi/i, 'ADMITIR la oferta'],
  [/no\s+admitid|no\s+admisi|revocar\s+(?:la\s+)?admisi/i, 'NO ADMITIR la oferta'],
  [/descalific/i, 'DESCALIFICAR'],
  [/no\s+corresponde\s+(?:retirar|revocar|quitar)\s+(?:el\s+)?puntaje/i, 'MANTENER u OTORGAR el puntaje'],
  [/(?:no\s+asignaci[óo]n|no\s+asignar|no\s+corresponde\s+(?:la\s+)?asign|revocar|restar|retirar|quitar)[^.]{0,80}?(?:puntaje|puntos)/i, 'NO OTORGAR o REVOCAR el puntaje'],
  [/(?:otorgar|asignar)(?:le)?\s+(?:el\s+)?puntaje/i, 'OTORGAR el puntaje'],
  [/no\s+(?:resulta|es)\s+subsanable/i, 'NO SUBSANABLE'],
];

/** La frase entre comillas, con lo que aplica y la marca del voto fuera de ellas. */
export function citarDecision(frase: string): string {
  const voto = frase.startsWith(PREFIJO_VOTO);
  const texto = voto ? frase.slice(PREFIJO_VOTO.length).trim() : frase;
  const etiqueta = ETIQUETAS.find(([r]) => r.test(texto))?.[1];
  return `${voto ? `${PREFIJO_VOTO} ` : ''}${etiqueta ? `[${etiqueta}] ` : ''}«${texto}»`;
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

/**
 * Las instrucciones de respuesta.
 *
 * Lo que César espera (documento 15): la regla de las bases contrastada
 * con lo que declaró el postor, las resoluciones agrupadas por la
 * consecuencia que aplicaron, con el criterio de cada grupo, y una
 * conclusión condicional: «la presencia de esa frase, por sí sola, no
 * permite elegir automáticamente una consecuencia».
 */
export interface DocumentoDeConsecuencia {
  nombre: string;
  fecha: string | null;
  /** Dónde está entre las fuentes: el [N] que debe escribir. */
  fuentes: number[];
  /** Las frases donde el Tribunal dice qué consecuencia aplica. */
  decisiones: string[];
}

export function bloqueDeConsecuencia(c: ConsultaDeConsecuencia, documentos: DocumentoDeConsecuencia[] = []): string {
  const dudas = c.consecuencias.length > 0 ? c.consecuencias.map((x) => `«${x}»`).join(', ') : '';
  const presentes = documentos.filter((d) => d.fuentes.length > 0);
  const citas = (d: DocumentoDeConsecuencia) => d.fuentes.slice(0, 5).map((n) => `[${n}]`).join(' ');
  // Las que dicen qué consecuencia aplicaron, con sus frases; las demás
  // nombran las expresiones pero quizá no decidan nada sobre la oferta.
  const deciden = presentes.filter((d) => d.decisiones.length > 0);
  const otras = presentes.filter((d) => d.decisiones.length === 0);
  const lista = [
    ...deciden.map((d) => {
      const frases = d.decisiones.map((f) => `      · ${citarDecision(f)}`).join('\n');
      return `  - ${d.nombre}${d.fecha ? ` (${d.fecha})` : ''} — fuentes ${citas(d)}\n    Lo que decidió, en sus palabras:\n${frases}`;
    }),
    ...(otras.length > 0
      ? [
          `  Además tienes fragmentos de: ${otras.map((d) => `${d.nombre} ${citas(d)}`).join('; ')}. No se halló en ellas una frase que aplique una consecuencia a la oferta: inclúyelas solo si sus fragmentos tratan un defecto comparable.`,
        ]
      : []),
  ].join('\n');
  return `

═══════════════════════════════════════════════════════
CONSULTA SOBRE LA CONSECUENCIA DE UN DEFECTO DE LA OFERTA: «${c.defecto}»${dudas ? ` — duda entre ${dudas}` : ''}
═══════════════════════════════════════════════════════
Ante defectos de la oferta como este, el Tribunal de Contrataciones Públicas no siempre aplica la misma consecuencia: unas veces declara NO ADMITIDA la oferta y otras solo NO OTORGA (o revoca) el puntaje del factor, según si el defecto afecta una condición mínima del requerimiento o únicamente la acreditación de la mejora que se puntúa. Comprueba en tus fuentes qué aplicó cada resolución. Tu trabajo es poner delante del usuario esas posiciones con sus resoluciones y decirle de qué depende cada una en su caso. Esta estructura prevalece sobre la de «Marco normativo / Análisis del caso».
${
  lista
    ? `
RESOLUCIONES QUE ANALIZAN DEFECTOS COMPARABLES (de cada una tienes entre las fuentes los fragmentos del análisis y la parte resolutiva):
${lista}

Clasifica cada una por LO QUE DECIDIÓ, que es lo que dicen sus frases de arriba: «revocar los puntos», «no asignación del puntaje» es NO OTORGAR EL PUNTAJE aunque el análisis hable de incertidumbre y la oferta siga admitida; «no admitida», «revocar la admisión», «confirmar su no admisión» es NO ADMITIR; «revocar la no admisión» es ADMITIR. Si una frase es de un voto singular o en discordia, no es la decisión.${
        deciden.length > 0
          ? ` La sección «Posiciones del Tribunal» lleva un punto por CADA una de estas ${deciden.length} resoluciones, aunque sus hechos difieran del caso (otro anexo, otro plazo, otra condición añadida): di en qué se parecen. Si descartas alguna porque el defecto que analiza no es comparable, nómbrala al final de esa sección con el motivo, en una línea.`
          : ''
      }
`
    : ''
}
ESTRUCTURA OBLIGATORIA:

## Respuesta orientativa
Dos a cuatro oraciones. Si las resoluciones de tus fuentes aplican consecuencias distintas, la respuesta es CONDICIONAL: qué circunstancia lleva a cada consecuencia, y que la sola presencia del defecto no permite elegir automáticamente una. No respondas con un «sí» o un «no» que tus fuentes no sostienen.

## Lo que fijan las bases y lo que declaró el postor
Contrasta, elemento por elemento, lo que exigen las bases —en el requerimiento (la condición mínima: el plazo máximo, el hito desde el que se computa, si hay una o varias entregas) y en el factor de evaluación (qué mejora se puntúa y con qué condición)— con lo que declaró el postor. Revisa cada palabra de su declaración que no esté en las bases: un hito de cómputo distinto, un evento alternativo («o …», «según corresponda»), una limitación a una parte de la prestación (un plazo ofrecido solo para una entrega o una etapa cuando las bases fijan un plazo total) y lo que dejó sin precisar. Di para cada diferencia si toca la condición mínima, el factor de evaluación o los dos. Usa los datos que dio el usuario; no inventes los que no dio.

## Marco normativo
Los artículos de la Ley N° 32069 y del Reglamento que tengas en los fragmentos y vengan al caso (inicio del plazo de ejecución, subsanación de ofertas, admisión, evaluación), cada uno con su número y su cita [N]. Un artículo sin [N] no se escribe.

## Posiciones del Tribunal
Agrupa las resoluciones (y pronunciamientos u opiniones, si los hay) por la consecuencia que APLICARON en su parte resolutiva, cada grupo como ### con la consecuencia y su criterio (por ejemplo «No admitir la oferta: el defecto genera incertidumbre sobre el cumplimiento de una condición mínima» o «No otorgar el puntaje: el plazo no respeta el hito de cómputo que exige el factor»). Bajo cada grupo, un punto por documento: **su número completo y fecha** — qué exigían las bases, qué declaró el postor, qué decidió el Tribunal y por qué [N]. Recoge las razones que da cada resolución: si el defecto es o no subsanable (si cambia el contenido esencial de la oferta), si hay incongruencia entre los documentos de la oferta, por qué no basta quitar el puntaje o por qué basta. Clasifica por lo que se RESOLVIÓ, no por lo que alegaron las partes; si una resolución tiene un voto singular o en discordia que sostiene la otra consecuencia, dilo en el mismo punto, aclarando que es el voto y no la decisión. Incluye TODOS los documentos de la lista de arriba y de tus fuentes que analicen un defecto comparable, aunque los hechos no sean idénticos al caso (otro anexo, otro hito, otra condición añadida): di en qué se parecen y en qué no. Los que solo nombran las expresiones de paso no van.

## Conclusión y recomendación práctica
La conclusión condicional, con sus citas: «si el defecto … corresponde no admitir la oferta [N]; si afecta únicamente … corresponde no otorgar el puntaje [N]», aplicada a los datos del usuario y cerrando con que la sola presencia del defecto no permite elegir automáticamente una consecuencia. Luego qué conviene al evaluador (cómo motivar la decisión, qué revisar en la oferta completa) y al postor (qué argumentar si se le aplica una u otra).`;
}
