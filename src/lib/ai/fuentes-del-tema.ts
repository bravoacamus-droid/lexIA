/**
 * Las fuentes de la biblioteca que tratan el tema de la pregunta.
 *
 * POR QUÉ EXISTE
 *
 * César, documento 14 (16/10/2026). Preguntó si en un concurso de
 * servicios —fabricación e instalación de estructuras metálicas— puede
 * acreditarse la experiencia del postor con contratos de ejecución de
 * obras que tienen partidas de estructuras metálicas. La respuesta fue
 * correcta («no es posible»), pero se apoyó en dos documentos: la
 * Resolución N.° 5325-2026-TCP-S6 y el Pronunciamiento N° 359-2026/
 * OECE-DSAT. En la búsqueda avanzada, «servicios similares» + «obras
 * similares» trae 74 documentos que discuten exactamente eso (la
 * Resolución N° 8067-2026-TCP-S3, la 7146-2026-TCP-S3…). Lo que pide:
 * que la consulta por texto muestre el mayor número de fuentes
 * pertinentes que haya en la biblioteca, para un análisis mayor.
 *
 * La búsqueda por parecido no puede dar eso. Trae los quince fragmentos
 * que más se parecen a la pregunta —medido con esa pregunta: 34
 * fragmentos de 17 documentos, de los que la respuesta citó 2, y entre
 * ellos una directiva de homologación de Perú Compras—, y cuántos más
 * se le piden, más se cuela lo que no viene al caso. Lo que el abogado
 * hace a mano es buscar los documentos que contienen las palabras del
 * problema, todas a la vez. Eso es lo que se hace aquí:
 *
 *   1. una llamada corta al modelo rápido saca de la pregunta las dos o
 *      tres expresiones literales con que los documentos nombran el
 *      problema («servicios similares», «obras similares») y, aparte, el
 *      objeto concreto («estructuras metálicas»), que solo ordena;
 *   2. la misma consulta que la búsqueda avanzada (todas las palabras,
 *      migraciones 0072-0074) devuelve los documentos que las contienen;
 *   3. los más pertinentes —los que además nombran el objeto, los que
 *      repiten las expresiones— van al modelo con el fragmento donde se
 *      decide; los demás se listan debajo de la respuesta, con su número
 *      y una línea, en el orden de jerarquía que pidió César: Ley y
 *      Reglamento, bases estándar, resoluciones del Tribunal, Sala
 *      Plena, opiniones y pronunciamientos del OECE.
 *
 * Al modelo no se le da la lista entera: más contexto no es más
 * respuesta (ver la nota de las facetas en la ruta del chat). Se le dan
 * unos pocos documentos más, y la lista completa la ve el usuario.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { DECISION } from '@/lib/ai/consulta-de-criterio';
import { bajadaDeResolucion, variantesDeTermino } from '@/lib/busqueda/todas-las-palabras';
import type { ChatSource, NormativeDocType } from '@/lib/supabase/types';

export interface TemaDeLaPregunta {
  /** Expresiones que un documento sobre el problema contiene TODAS. */
  terminos: string[];
  /** El objeto concreto («estructuras metálicas»): no filtra, ordena. */
  objeto: string[];
}

const SISTEMA = `Preparas una búsqueda por palabras exactas en una biblioteca de contrataciones públicas peruanas (Ley N° 32069, su Reglamento, bases estándar, resoluciones del Tribunal, acuerdos de Sala Plena, opiniones y pronunciamientos del OECE).

Responde SOLO un JSON, sin markdown:
{"terminos": ["...", "..."], "objeto": ["..."]}

- terminos: 2 o 3 expresiones CORTAS (1 a 3 palabras, minúsculas) que un documento que discute EXACTAMENTE el problema jurídico de la pregunta contendría todas a la vez, escritas como las escriben el Tribunal y el OECE (términos técnicos: "servicios similares", "obras similares", "experiencia del postor", "subsanación", "declaración jurada", "penalidad", "ampliación de plazo"). La primera, la institución jurídica central. Prefiere las de dos o tres palabras que nombran la figura concreta ("obras similares", "anexo n° 3", "carta fianza", "representante legal"). No pongas el objeto concreto de la contratación ni palabras que están en casi cualquier resolución o pronunciamiento ("contrato", "entidad", "procedimiento", "postor", "oferta", "bases", "plazo", "ley", "recurso de apelación", "buena pro", "requisito").
- objeto: 0 a 2 expresiones con el bien, servicio u obra concreto de la pregunta ("estructuras metálicas", "limpieza"), si lo hay.
- Si la pregunta es un saludo, pide un documento por su número o no plantea un problema jurídico, responde {"terminos": [], "objeto": []}.

Ejemplo: "¿se puede subsanar la falta de firma en el anexo de la declaración jurada de la oferta?" → {"terminos": ["subsanación", "firma", "declaración jurada"], "objeto": []}`;

const limpiar = (lista: unknown, tope: number): string[] =>
  (Array.isArray(lista) ? lista : [])
    .map((t) => String(t).trim().toLowerCase().replace(/[«»"]/g, ''))
    // Una expresión de más de tres palabras ya no aparece literal.
    .filter((t) => t.length >= 3 && t.length <= 50 && t.split(/\s+/).length <= 3)
    .slice(0, tope);

/** null si la pregunta no plantea un tema, o si el modelo no respondió a tiempo. */
export async function temaDeLaPregunta(texto: string, tiempoMs = 4000): Promise<TemaDeLaPregunta | null> {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (plano.length < 30 || plano.length > 2000) return null;
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: plano.slice(0, 1500),
      temperature: 0,
      maxTokens: 120,
      abortSignal: AbortSignal.timeout(tiempoMs),
    });
    const crudo = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as {
      terminos?: unknown;
      objeto?: unknown;
    };
    const terminos = limpiar(crudo.terminos, 3);
    // Con una sola expresión no hay intersección: es la búsqueda por
    // frase de siempre, que trae miles de documentos que la mencionan.
    if (terminos.length < 2) return null;
    const objeto = limpiar(crudo.objeto, 2).filter((o) => !terminos.includes(o));
    return { terminos, objeto };
  } catch (e) {
    console.warn('[tema] omitido:', (e as Error).message);
    return null;
  }
}

/**
 * El orden de la lista, el que pidió César el 16/10/2026: «Ley/Reglamento
 * → bases estándar → resoluciones del Tribunal → Sala Plena →
 * opiniones/pronunciamientos OECE». Las directivas y lineamientos, que él
 * no nombró, van con la norma, detrás de las bases.
 */
const JERARQUIA: Record<string, number> = {
  ley: 0,
  reglamento: 0,
  bases_estandar: 1,
  directiva: 2,
  lineamiento: 2,
  resolucion_tce: 3,
  resolucion: 3,
  acuerdo_sala_plena: 4,
  opinion: 5,
  pronunciamiento: 5,
};
export const rangoDelTema = (tipo: string): number => JERARQUIA[tipo] ?? 6;

export interface DocumentoDelTema {
  document_id: string;
  tipo: NormativeDocType;
  numero: string | null;
  titulo: string;
  fecha: string | null;
  /** Una línea: el pasaje donde aparece la expresión, o de qué trata. */
  linea: string | null;
  /** Fragmento del pasaje: el que se abre al pulsar. */
  chunkIndex: number | null;
  /** Fragmentos (hasta 2 por expresión) donde aparecen las expresiones. */
  menciones: number;
  /** Nombra además el objeto concreto de la pregunta. */
  conObjeto: boolean;
  /** Índices de fragmento con alguna expresión: de aquí sale lo que lee el modelo. */
  fragmentos: number[];
}

export interface FuentesDelTema {
  terminos: string[];
  /** El objeto concreto, si lo hay: ordena y ayuda a elegir fragmentos. */
  objeto: string[];
  /** Cuántos documentos de la biblioteca contienen todas las expresiones. */
  total: number;
  documentos: DocumentoDelTema[];
}

/** Páginas de la búsqueda: la consulta topa en 50 por llamada. */
const POR_PAGINA = 50;
const PAGINAS = 2;
/**
 * Por encima de esto las expresiones no distinguen un tema: están en
 * cualquier resolución. «servicios similares» + «obras similares» da 74
 * documentos; «recurso de apelación» + «buena pro» + «plazo», 5 587.
 */
const MAX_DOCUMENTOS = 400;
/** Los tipos que mandan en la jerarquía y que, por fecha, podrían quedar fuera de las dos páginas. */
const TIPOS_DE_CABECERA = ['ley', 'bases_estandar', 'acuerdo_sala_plena'];

type Fila = { document_id: string; total: number };

/**
 * Los documentos que contienen todas las expresiones, con su línea.
 *
 * La consulta es la de la búsqueda avanzada, con las mismas variantes
 * (tildes, plural, ceros a la izquierda). Ordena por fecha y topa en 50:
 * se piden dos páginas, y si hay más de cien, también las leyes, bases
 * y acuerdos que las contengan, que son pocos y de los que una lista
 * «por jerarquía» no puede prescindir solo porque son más antiguos.
 */
export async function buscarFuentesDelTema(
  supabase: SupabaseClient,
  tema: TemaDeLaPregunta,
  opciones: { ley?: string | null } = {},
): Promise<FuentesDelTema | null> {
  const consulta = async (terminos: string[], desde: number, tipo: string | null = null): Promise<Fila[]> => {
    const { data, error } = await supabase.rpc('buscar_con_todas_las_palabras', {
      p_terminos: terminos.map(variantesDeTermino),
      p_tipo: tipo,
      p_ley: opciones.ley ?? null,
      p_limite: POR_PAGINA,
      p_desde: desde,
    });
    // Un error no es «no hay»: se dice en el registro y la respuesta sale sin la lista.
    if (error) throw new Error(error.message);
    return (data ?? []) as Fila[];
  };

  let terminos = tema.terminos;
  let primera = await consulta(terminos, 0);
  // Tres expresiones a la vez pueden no coincidir en ningún documento:
  // se suelta la última, que es la menos central.
  if (primera.length === 0 && terminos.length > 2) {
    terminos = terminos.slice(0, 2);
    primera = await consulta(terminos, 0);
  }
  if (primera.length === 0) return null;
  let total = Number(primera[0].total);
  // Demasiados: las expresiones no distinguen el tema. Medido el
  // 16/10/2026 con «¿cuál es el plazo para apelar la buena pro?»:
  // «recurso de apelación» + «buena pro» + «plazo» están en 5 587
  // documentos, y los más recientes eran resoluciones que corren
  // traslado «en el plazo de tres días» —ruido para el modelo, que
  // necesita el artículo del Reglamento, y una lista que no ayuda—. Con
  // el objeto concreto como expresión más puede acotarse; si no, nada.
  if (total > MAX_DOCUMENTOS && tema.objeto.length > 0) {
    const conObjeto = await consulta([...terminos, tema.objeto[0]], 0);
    if (conObjeto.length > 0 && Number(conObjeto[0].total) <= MAX_DOCUMENTOS) {
      terminos = [...terminos, tema.objeto[0]];
      primera = conObjeto;
      total = Number(conObjeto[0].total);
    }
  }
  if (total > MAX_DOCUMENTOS) {
    console.log('[tema] demasiado general, sin lista', { terminos, total });
    return null;
  }

  const resto = await Promise.all([
    ...Array.from({ length: PAGINAS - 1 }, (_x, i) =>
      total > POR_PAGINA * (i + 1) ? consulta(terminos, POR_PAGINA * (i + 1)) : Promise.resolve([] as Fila[]),
    ),
    ...(total > POR_PAGINA * PAGINAS ? TIPOS_DE_CABECERA.map((t) => consulta(terminos, 0, t)) : []),
  ]);
  const ids = Array.from(new Set([...primera, ...resto.flat()].map((f) => f.document_id)));

  // Los pasajes: uno por expresión y documento basta para la línea y para
  // saber dónde se decide; el objeto va detrás, como una expresión más.
  // Si el objeto pasó a filtrar (arriba), ya va entre los términos.
  const objeto = tema.objeto.filter((o) => !terminos.includes(o));
  const expresiones = [...terminos, ...objeto];
  const [{ data: docs, error: eDocs }, { data: frags, error: eFrags }, { data: primeros }] = await Promise.all([
    supabase
      .from('normative_documents')
      .select('id, type, number, title, date, summary, ai_summary, oculto')
      .in('id', ids),
    supabase.rpc('fragmentos_con_palabras', {
      p_documentos: ids,
      p_terminos: expresiones.map(variantesDeTermino),
      p_por_termino: 2,
    }),
    supabase.from('normative_chunks').select('document_id, content').in('document_id', ids).eq('chunk_index', 0),
  ]);
  if (eDocs) throw new Error(eDocs.message);
  // Sin pasajes la lista sigue valiendo: cada documento con su bajada.
  if (eFrags) console.error('[tema] fragmentos_con_palabras:', eFrags.message);

  const pasajes = new Map<string, Array<{ termino: number; chunk: number; texto: string }>>();
  for (const f of (frags ?? []) as Array<{ document_id: string; termino: number; chunk_index: number; fragmento: string }>) {
    const lista = pasajes.get(f.document_id) ?? [];
    lista.push({ termino: f.termino - 1, chunk: f.chunk_index, texto: f.fragmento.replace(/\s+/g, ' ').trim() });
    pasajes.set(f.document_id, lista);
  }
  const inicio = new Map(
    ((primeros ?? []) as Array<{ document_id: string; content: string }>).map((c) => [c.document_id, c.content]),
  );

  const documentos: DocumentoDelTema[] = [];
  for (const d of (docs ?? []) as Array<{
    id: string;
    type: NormativeDocType;
    number: string | null;
    title: string;
    date: string | null;
    summary: string | null;
    ai_summary: { de_que_trata?: string } | null;
    oculto: boolean | null;
  }>) {
    // Lo derogado, vencido o retirado no se ofrece (lib/normativa/ocultos).
    // Los criterios validados son la colección interna de A-LexIA, no un
    // documento de la biblioteca que el usuario pueda abrir y citar.
    if (d.oculto || d.type === ('criterio_validado' as NormativeDocType)) continue;
    const suyos = pasajes.get(d.id) ?? [];
    const delTema = suyos.filter((p) => p.termino < terminos.length);
    // La línea sale del pasaje de la expresión más específica (la última):
    // «servicios similares» está en cualquier bases; «obras similares»
    // en el contexto es lo que dice el documento sobre la pregunta.
    const pasaje = [...delTema].sort((a, b) => b.termino - a.termino || a.chunk - b.chunk)[0] ?? null;
    const bajada =
      d.type === 'resolucion_tce' && inicio.get(d.id)
        ? bajadaDeResolucion(inicio.get(d.id)!)
        : d.ai_summary?.de_que_trata ?? d.summary ?? null;
    documentos.push({
      document_id: d.id,
      tipo: d.type,
      numero: d.number,
      titulo: d.title,
      fecha: d.date,
      linea: pasaje ? recortar(pasaje.texto, 260) : bajada ? recortar(bajada, 260) : null,
      chunkIndex: pasaje?.chunk ?? null,
      menciones: delTema.length,
      conObjeto: suyos.some((p) => p.termino >= terminos.length),
      fragmentos: Array.from(new Set(suyos.map((p) => p.chunk))).sort((a, b) => a - b),
    });
  }

  documentos.sort(
    (a, b) => rangoDelTema(a.tipo) - rangoDelTema(b.tipo) || String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')),
  );
  return { terminos, objeto, total, documentos };
}

function recortar(texto: string, largo: number): string {
  // El pasaje empieza a media frase y arrastra la paginación del PDF.
  let t = texto.replace(/P[áa]gina\s+\d+\s+de\s+\d+/gi, ' ').replace(/\s+/g, ' ').trim();
  if (/^[\p{Ll},;:.)”"]/u.test(t)) t = `…${t.replace(/^[,;:.)”"\s]+/, '')}`;
  if (t.length <= largo) return t;
  const corte = t.lastIndexOf(' ', largo);
  return `${t.slice(0, corte > largo * 0.6 ? corte : largo)}…`;
}

/**
 * Los que lee el modelo: pocos y los mejores.
 *
 * Primero los que nombran además el objeto de la pregunta —la resolución
 * sobre estructuras metálicas antes que la de un servicio de vigilancia—,
 * después los que repiten las expresiones, y a igualdad lo más reciente.
 * Con un mínimo de cada lado: al menos un pronunciamiento u opinión del
 * OECE y al menos una resolución del Tribunal, si los hay, porque los dos
 * órganos no siempre dicen lo mismo y la respuesta tiene que poder
 * decirlo (regla 11 del prompt).
 */
export function elegirParaElModelo(documentos: DocumentoDelTema[], tope: number, excluir: Set<string>): DocumentoDelTema[] {
  const candidatos = documentos
    .filter((d) => !excluir.has(d.document_id) && d.fragmentos.length > 0)
    .sort(
      (a, b) =>
        Number(b.conObjeto) - Number(a.conObjeto) ||
        b.menciones - a.menciones ||
        String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')),
    );
  const elegidos: DocumentoDelTema[] = [];
  const asegurar = (pred: (d: DocumentoDelTema) => boolean) => {
    const d = candidatos.find((c) => pred(c) && !elegidos.includes(c));
    if (d && elegidos.length < tope) elegidos.push(d);
  };
  asegurar((d) => d.tipo === 'ley' || d.tipo === 'bases_estandar');
  asegurar((d) => d.tipo === 'resolucion_tce');
  asegurar((d) => d.tipo === 'pronunciamiento' || d.tipo === 'opinion');
  for (const c of candidatos) {
    if (elegidos.length >= tope) break;
    if (!elegidos.includes(c)) elegidos.push(c);
  }
  return elegidos;
}

/**
 * El texto entero de los fragmentos que leerá el modelo: hasta dos por
 * documento, los que ANALIZAN el punto.
 *
 * Los pasajes de la búsqueda son las primeras apariciones de cada
 * expresión, y en una resolución las primeras están en los antecedentes:
 * lo que alegó el impugnante. Probado el 16/10/2026 con la pregunta de
 * César: de la Resolución N° 7146-2026-TCP-S3 —un contrato de ejecución
 * de obra presentado como experiencia en un servicio, justo el caso— al
 * modelo le llegaban los dos fragmentos del recurso y no el del análisis
 * del Colegiado, y no la citó. Por eso se lee el documento entero (una
 * consulta por documento, por su id: nunca un barrido de normative_chunks)
 * y se eligen los fragmentos que tienen más expresiones del tema y más
 * señales de decisión («este Colegiado», «corresponde», «no acoger»), con
 * preferencia por los de más adelante.
 */
export async function fragmentosParaElModelo(
  supabase: SupabaseClient,
  elegidos: DocumentoDelTema[],
  expresiones: string[],
  porDocumento = 2,
): Promise<Array<{ id: string; document_id: string; content: string; doc: DocumentoDelTema }>> {
  if (elegidos.length === 0) return [];
  const formas = expresiones.map((e) => variantesDeTermino(e).split('|').map(normalizar));
  const porDoc = await Promise.all(
    elegidos.map(async (d) => {
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
  const salida: Array<{ id: string; document_id: string; content: string; doc: DocumentoDelTema }> = [];
  for (const { d, filas } of porDoc) {
    const puntuados = filas
      .map((f) => {
        const plano = normalizar(f.content);
        const presentes = formas.filter((vs) => vs.some((v) => v && plano.includes(v))).length;
        const decisiones = (f.content.match(DECISION) ?? []).length;
        return { f, presentes, puntos: presentes * 3 + Math.min(decisiones, 6) * 2 };
      })
      .filter((x) => x.presentes > 0)
      .sort((a, b) => b.puntos - a.puntos || b.f.chunk_index - a.f.chunk_index)
      .slice(0, porDocumento)
      // En el orden del documento: planteamiento antes que decisión.
      .sort((a, b) => a.f.chunk_index - b.f.chunk_index);
    for (const { f } of puntuados) salida.push({ id: f.id, document_id: d.document_id, content: f.content, doc: d });
  }
  return salida;
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

/**
 * La lista que ve el usuario debajo de la respuesta, como fuentes
 * marcadas `relacionada`: van DETRÁS de las que leyó el modelo, así que
 * no mueven la numeración [N], y se guardan con el mensaje como las
 * demás. El primer elemento lleva además las expresiones y el total,
 * para el enlace a la búsqueda avanzada.
 */
export function comoFuentesRelacionadas(f: FuentesDelTema, yaCitados: Set<string>, tope = 120): ChatSource[] {
  const lista = f.documentos.filter((d) => !yaCitados.has(d.document_id)).slice(0, tope);
  return lista.map((d, i) => ({
    // Sin fragmento propio a la vista: el «chunk» es el documento y su
    // pasaje, que es lo que muestra el cajón lateral al pulsar.
    chunk_id: `tema:${d.document_id}`,
    doc_id: d.document_id,
    doc_title: d.titulo,
    doc_type: d.tipo,
    doc_number: d.numero,
    snippet: (d.linea ?? '').replace(/[⟦⟧]/g, ''),
    relacionada: {
      fecha: d.fecha,
      linea: d.linea,
      ...(i === 0 ? { terminos: f.terminos, total: f.total } : {}),
    },
  }));
}

/**
 * Lo que se le dice al modelo de la lista.
 *
 * Con solo «úsalos», el modelo rápido seguía apoyándose en uno o dos
 * documentos: probado el 16/10/2026 con la pregunta de César, recibió
 * fragmentos de ocho resoluciones y pronunciamientos del tema y citó uno
 * más que antes. Por eso una sección propia, con un punto por documento,
 * y la lista de sus números [N] para que no tenga que buscarlos. Con la
 * consulta de criterio activa no se pide: esa ya tiene su sección de
 * posiciones, que hace lo mismo.
 */
export function bloqueDelTema(
  f: FuentesDelTema,
  leidos: DocumentoDelTema[],
  posiciones: Map<string, number[]>,
  conSeccion: boolean,
): string {
  const expresiones = f.terminos.map((t) => `«${t}»`).join(' y ');
  const nombres = leidos
    .map((d) => {
      const n = (posiciones.get(d.document_id) ?? []).slice(0, 3).map((x) => `[${x}]`).join(' ');
      return `  - ${d.numero && /\d/.test(d.numero) ? d.numero : d.titulo}${d.fecha ? ` (${d.fecha})` : ''}${n ? ` — fuentes ${n}` : ''}`;
    })
    .join('\n');
  const seccion = conSeccion
    ? `

ESTRUCTURA: además de las secciones habituales, antes de la conclusión escribe:

## Qué han resuelto el Tribunal y el OECE
Lee uno por uno los fragmentos de CADA documento de la lista de arriba y escribe un punto por cada uno que diga algo sobre el problema de la pregunta, aunque no sea idéntico al caso (otro objeto, otra etapa, una regla vecina como la de las partidas o componentes): el usuario pidió ver todo lo que la biblioteca tiene sobre el punto, no el documento que más se parece. Cada punto: **su número completo** (y fecha), qué se discutía en ese caso y qué se decidió y por qué, en una o dos oraciones, con su cita [N]. Agrupa los puntos por el criterio que aplican, cada grupo como ### con una frase que lo diga; si alguno resuelve en sentido contrario, va en su propio grupo. Clasifica por lo que se RESOLVIÓ o se CONCLUYÓ, no por lo que alegó una parte. Solo se omite el que únicamente nombra las expresiones de paso.`
    : '';
  return `

═══════════════════════════════════════════════════════
OTRAS FUENTES DE LA BIBLIOTECA SOBRE ESTE TEMA
═══════════════════════════════════════════════════════
La biblioteca tiene ${f.total} documentos que contienen ${expresiones}. Entre tus fuentes van fragmentos de ${leidos.length} de ellos:
${nombres}

Úsalos: cuando varias resoluciones o pronunciamientos sostienen lo mismo, nómbralos juntos, cada uno con su cita —«así lo resolvieron la Resolución N.° … [4], la N.° … [7] y el Pronunciamiento N.° … [9]»—, en lugar de apoyarte en uno solo, y si alguno resuelve distinto, dilo. Cada cita en su propio corchete: [4] [7], no [4, 7]. Solo con los que tengas en los fragmentos: el usuario verá debajo de tu respuesta la lista completa de los ${f.total} documentos, así que no enumeres de memoria los que no tienes delante ni digas que «hay muchos más».${seccion}`;
}
