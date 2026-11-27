/**
 * Contraste del requerimiento con la biblioteca, tema por tema.
 *
 * POR QUÉ (Fase 1, reunión con César del 27/11/2026)
 *
 * Hasta aquí la biblioteca solo adornaba lo que el auditor general ya
 * había decidido: una cláusula que él no marcaba («otras penalidades»)
 * nunca se contrastaba con nada, y César lo notaba («¿por qué no observó
 * esto, si yo lo identifico?»). Ahora, en paralelo con el auditor:
 *
 *   1. el requerimiento se parte en cláusulas con su página, numeral y
 *      literal (`segmentar.ts`);
 *   2. para cada tema de la lista (`comprobaciones.ts`) se toman sus
 *      cláusulas y se traen de la biblioteca TODOS los documentos que lo
 *      tratan, con la misma búsqueda por palabras exactas de la búsqueda
 *      avanzada (`buscarFuentesDelTema`), y de los más pertinentes, los
 *      fragmentos donde se decide (`fragmentosParaElModelo`);
 *   3. un juez por tema contrasta las cláusulas con esos precedentes y con
 *      lo que hay que revisar, y observa lo que no procede —o la omisión,
 *      si el tema es obligatorio y no está—, citando solo los precedentes
 *      que tiene delante, por su código.
 *
 * La ubicación sale de la cláusula, no del modelo; la cita literal se
 * comprueba contra el texto. Cada tema que falla se salta: el auditor
 * general sigue cubriendo el documento.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import {
  buscarFuentesDelTema,
  elegirParaElModelo,
  fragmentosParaElModelo,
  temaDeLaPregunta,
  type DocumentoDelTema,
} from '@/lib/ai/fuentes-del-tema';
import { embedOne } from '@/lib/ai/embeddings';
import { NOMBRE_DE_FUENTE, type FuenteCitada, type TipoDeFuente } from '@/lib/evaluacion/bases/fuentes';
import type { HallazgoDeAuditoria, Solicitud } from '@/lib/evaluacion/auditoria-tdr';
import { segmentarRequerimiento, dondeEsta, type Clausula } from './segmentar';
import {
  esObligatorio,
  temasPara,
  type ObjetoDeContratacion,
  type Regimen,
  type TemaDeComprobacion,
} from './comprobaciones';

export interface CoberturaDelTema {
  tema: string;
  nombre: string;
  /** Cláusulas del requerimiento que tratan el tema. */
  clausulas: number;
  /** Documentos de la biblioteca que contienen sus expresiones. */
  documentosEnLaBiblioteca: number;
  /** Los que leyó el juez. */
  leidos: number;
  hallazgos: number;
  error?: string;
}

export interface ResultadoDelContraste {
  hallazgos: HallazgoDeAuditoria[];
  cobertura: CoberturaDelTema[];
}

const TOPE_TEXTO_DEL_TEMA = 14_000;
const DOCUMENTOS_POR_TEMA = 8;
const SOLICITUDES: Solicitud[] = ['modificar', 'suprimir', 'ampliar', 'precisar', 'incorporar'];
const SEVERIDADES = ['critico', 'alto', 'medio', 'bajo'] as const;

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function sistemaDelJuez(tema: TemaDeComprobacion, ctx: { regimen?: Regimen | null; objeto?: ObjetoDeContratacion | null }, obligatorio: boolean) {
  const regimen =
    ctx.regimen === 'menor_8uit'
      ? 'contrato menor (≤ 8 UIT), sin procedimiento de selección: lo exigido debe ser proporcional a ese monto'
      : ctx.regimen === 'seleccion'
        ? 'procedimiento de selección'
        : 'régimen no indicado';
  return `Eres especialista en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento). Revisas SOLO un tema de un requerimiento: ${tema.nombre.toUpperCase()}.
Contratación: ${regimen}; objeto: ${ctx.objeto ?? 'no indicado'}.

Recibes:
- Las cláusulas del requerimiento sobre el tema, cada una con su código [C1], [C2]… y su ubicación.
- Lo que se debe revisar en este tema.
- Precedentes de la biblioteca de A-LexIA con su código [F1], [F2]…: fragmentos de resoluciones del Tribunal, acuerdos de Sala Plena, pronunciamientos, opiniones, informes de vicio de nulidad y dictámenes del OECE, y de la Ley o el Reglamento.

Tu trabajo: contrastar cada cláusula con lo que se debe revisar y con los precedentes, como lo haría un especialista. Si un precedente decidió que una exigencia igual o parecida no procede (o sí procede), úsalo.
- Reporta solo problemas reales. Si una cláusula está bien, no la reportes.
${obligatorio ? '- Si no hay cláusulas sobre el tema, o falta algo de lo que se debe revisar, repórtalo como omisión (clausula: null).\n' : '- Si no hay cláusulas sobre el tema, no reportes nada.\n'}- Cita en "fuentes" SOLO los códigos F que traten el mismo punto y respalden lo que dices; si ninguno aplica, deja "fuentes" vacío. Nunca inventes números de resoluciones ni de pronunciamientos.
- En "norma" pon el artículo de la Ley o del Reglamento solo si estás seguro; si no, vacío.

Responde SOLO JSON:
{"hallazgos": [{
  "clausula": "C2" | null,
  "titulo": "máx. 90 caracteres",
  "severidad": "critico" | "alto" | "medio" | "bajo",
  "extracto_literal": "cita LITERAL de la cláusula (máx. 300 caracteres), o '(omisión) …'",
  "descripcion": "fundamento: por qué no procede y qué riesgo genera, apoyado en los precedentes (máx. 600 caracteres)",
  "solicitud": "modificar" | "suprimir" | "ampliar" | "precisar" | "incorporar",
  "recomendacion": "qué hacer, con la redacción sugerida cuando ayude (máx. 500 caracteres)",
  "norma": "",
  "fuentes": [{"codigo": "F3", "criterio": "qué decidió ese precedente sobre este punto, en una oración"}]
}]}`;
}

export interface Precedente {
  id: string;
  document_id: string;
  tipo: string;
  numero: string;
  content: string;
}

/** Los tipos donde se decide un caso: de ahí salen los precedentes. */
const CASUISTICOS = ['pronunciamiento', 'resolucion_tce', 'informe_vicio_nulidad', 'opinion', 'acuerdo_sala_plena', 'dictamen'] as const;
const POR_TIPO_SEMANTICO: Record<(typeof CASUISTICOS)[number], number> = {
  pronunciamiento: 3,
  resolucion_tce: 2,
  informe_vicio_nulidad: 2,
  opinion: 1,
  acuerdo_sala_plena: 1,
  dictamen: 1,
};
const TOPE_PRECEDENTES = 18;

/**
 * Dos búsquedas que se completan:
 *
 *   · Literal, como el abogado a mano: los documentos que contienen las
 *     expresiones del tema. «otras penalidades» está en 2 969 documentos
 *     (medido el 27/11/2026): así no distingue nada, y `buscarFuentesDelTema`
 *     se rinde pasando 400. Entonces se afina con el objeto de las propias
 *     cláusulas («uniforme», «informe mensual»), que saca el modelo rápido
 *     (`temaDeLaPregunta`, el mismo del chat).
 *   · Por parecido con la cláusula real, tipo por tipo (pronunciamientos,
 *     resoluciones, IVN, opiniones…), con la expresión del tema como texto:
 *     trae el caso más parecido aunque la literal no alcance.
 */
export async function precedentesParaTexto(
  db: SupabaseClient,
  args: {
    /** El texto del documento observado (cláusulas); vacío si es una omisión. */
    muestra: string;
    /** Con qué se busca por parecido. */
    consulta: string;
    /** Grupos de expresiones literales (cada grupo, todas a la vez). */
    expresiones: string[][];
    /** Para el registro. */
    etiqueta: string;
  },
) {
  const { muestra, consulta } = args;

  // ── Literal ──
  let objeto: string[] = [];
  if (muestra) {
    const t = await temaDeLaPregunta(muestra, 5_000).catch(() => null);
    objeto = (t?.objeto ?? []).filter((o) => o.length >= 4).slice(0, 2);
  }
  const documentos = new Map<string, DocumentoDelTema>();
  let total = 0;
  // Sin cláusulas (una omisión) no hay objeto con que afinar, y la
  // expresión sola («forma de pago») está en miles de documentos: la
  // búsqueda por parecido, abajo, basta.
  for (const grupo of muestra ? args.expresiones.slice(0, 2) : []) {
    try {
      // Con el objeto de la cláusula ya entre las palabras, la consulta es
      // angosta desde el principio. Buscar primero la expresión sola
      // («forma de pago», miles de documentos) y afinar después se pasaba
      // del tiempo de la base con varios temas a la vez.
      const terminos = objeto.length ? [...grupo, objeto[0]] : grupo;
      const f = await buscarFuentesDelTema(db, { terminos, objeto: objeto.slice(1) });
      if (!f) continue;
      total += f.total;
      for (const d of f.documentos) if (!documentos.has(d.document_id)) documentos.set(d.document_id, d);
    } catch (e) {
      console.warn('[contraste] literal', args.etiqueta, grupo, (e as Error).message);
    }
  }
  const elegidos = elegirParaElModelo([...documentos.values()], DOCUMENTOS_POR_TEMA, new Set());
  const literales: Precedente[] = (await fragmentosParaElModelo(db, elegidos, [...args.expresiones.flat(), ...objeto], 2).catch(() => [])).map(
    (f) => ({ id: f.id, document_id: f.document_id, tipo: f.doc.tipo, numero: f.doc.numero ?? f.doc.titulo, content: f.content }),
  );

  // ── Por parecido ──
  const semanticos: Precedente[] = [];
  try {
    const emb = (await embedOne(consulta.replace(/\s+/g, ' ').slice(0, 1_500), 'RETRIEVAL_QUERY')) as unknown as number[];
    // De a tres tipos y con un reintento: con todos los temas a la vez, la
    // búsqueda en las resoluciones (diecisiete mil documentos) se pasaba
    // del tiempo de la base (lo vio la prueba con el CPA 008-2026).
    const buscar = async (tipo: (typeof CASUISTICOS)[number]) => {
      for (let intento = 1; intento <= 2; intento++) {
        const r = await db.rpc('hybrid_search', {
          query_text: (args.expresiones[0]?.join(' ') || consulta.replace(/\s+/g, ' ').slice(0, 120)),
          query_embedding: emb,
          match_count: POR_TIPO_SEMANTICO[tipo] * 3,
          filter_type: tipo,
        });
        if (!r.error) return r;
        if (intento === 2) return r;
        await new Promise((ok) => setTimeout(ok, 1_000));
      }
      throw new Error('inalcanzable');
    };
    const porTipo = await deAPocos([...CASUISTICOS], 3, async (tipo): Promise<Precedente[]> => {
      const r = await buscar(tipo);
      if (r.error) {
        console.warn('[contraste] parecido', args.etiqueta, tipo, r.error.message);
        return [];
      }
      const vistos = new Set<string>();
      return ((r.data ?? []) as Array<{ chunk_id: string; document_id: string; content: string; doc_type: string; doc_number: string | null; doc_title: string }>)
        .filter((f) => !vistos.has(f.document_id) && (vistos.add(f.document_id), true))
        .slice(0, POR_TIPO_SEMANTICO[tipo])
        .map((f) => ({ id: f.chunk_id, document_id: f.document_id, tipo: f.doc_type, numero: f.doc_number ?? f.doc_title, content: f.content }));
    });
    semanticos.push(...porTipo.flat());
  } catch (e) {
    console.warn('[contraste] parecido', args.etiqueta, (e as Error).message);
  }

  // Ocultos fuera (duplicados, derogados).
  const todos = [...literales, ...semanticos];
  const ocultos = new Set<string>();
  if (todos.length) {
    const { data } = await db.from('normative_documents').select('id').in('id', Array.from(new Set(todos.map((f) => f.document_id)))).eq('oculto', true);
    for (const d of data ?? []) ocultos.add((d as { id: string }).id);
  }
  const vistos = new Set<string>();
  const fragmentos = todos
    .filter((f) => !ocultos.has(f.document_id) && !vistos.has(f.id) && (vistos.add(f.id), true))
    .slice(0, TOPE_PRECEDENTES);
  return { total: Math.max(total, new Set(fragmentos.map((f) => f.document_id)).size), fragmentos };
}


/** Los precedentes de un tema del requerimiento, para el juez de ese tema. */
async function precedentesDelTema(db: SupabaseClient, tema: TemaDeComprobacion, clausulas: Clausula[]) {
  const muestra = clausulas.map((c) => c.texto).join('\n').slice(0, 1_800);
  const consulta = muestra || `${tema.nombre}. ${tema.revisar.join(' ')}`;
  return precedentesParaTexto(db, { muestra, consulta, expresiones: tema.expresiones, etiqueta: tema.id });
}

function textoDeLasClausulas(clausulas: Clausula[]): string {
  let largo = 0;
  const partes: string[] = [];
  clausulas.forEach((c, i) => {
    if (largo > TOPE_TEXTO_DEL_TEMA) return;
    const t = `[C${i + 1}] ${dondeEsta(c)}\n${c.texto}`;
    largo += t.length;
    partes.push(t);
  });
  return partes.join('\n\n');
}

async function juzgarTema(
  db: SupabaseClient,
  tema: TemaDeComprobacion,
  clausulas: Clausula[],
  ctx: { regimen?: Regimen | null; objeto?: ObjetoDeContratacion | null },
  obligatorio: boolean,
  alUsar?: (u: { entrada: number; salida: number }) => void,
): Promise<{ hallazgos: HallazgoDeAuditoria[]; cobertura: CoberturaDelTema }> {
  const prec = await precedentesDelTema(db, tema, clausulas);
  const bloquesF = prec.fragmentos.map(
    (f, k) => `[F${k + 1}] ${f.tipo} — ${f.numero}\n${f.content.replace(/\s+/g, ' ').slice(0, 1400)}`,
  );
  const r = await generateText({
    model: generatorModel,
    system: sistemaDelJuez(tema, ctx, obligatorio),
    prompt: `QUÉ SE DEBE REVISAR:\n${tema.revisar.map((x) => `- ${x}`).join('\n')}\n\nCLÁUSULAS DEL REQUERIMIENTO:\n${
      clausulas.length ? textoDeLasClausulas(clausulas) : '(el requerimiento no tiene cláusulas sobre este tema)'
    }\n\nPRECEDENTES DE LA BIBLIOTECA:\n${bloquesF.join('\n\n') || '(ninguno)'}\n\nResponde SOLO con el JSON, empezando por {.`,
    temperature: 0.1,
    maxTokens: 16000,
    abortSignal: AbortSignal.timeout(120_000),
  });
  alUsar?.({ entrada: r.usage?.promptTokens ?? 0, salida: r.usage?.completionTokens ?? 0 });

  const crudo = parseJsonLoose<{ hallazgos?: Array<Record<string, unknown>> }>(r.text);
  const hallazgos: HallazgoDeAuditoria[] = [];
  for (const [i, h] of (crudo.hallazgos ?? []).entries()) {
    if (!h || typeof h.titulo !== 'string' || !h.titulo.trim()) continue;
    const idx = typeof h.clausula === 'string' ? Number(h.clausula.replace(/\D/g, '')) - 1 : -1;
    const c = idx >= 0 ? clausulas[idx] : undefined;
    // Sin cláusula solo vale como omisión de un tema obligatorio.
    if (!c && !obligatorio) continue;
    let extracto = String(h.extracto_literal ?? '').trim();
    if (c) {
      const cita = normalizar(extracto.replace(/…$/, '')).slice(0, 50);
      if (!cita || !normalizar(c.texto).includes(cita)) extracto = c.texto.replace(/\s+/g, ' ').slice(0, 300);
    } else if (!extracto.startsWith('(omisión)')) {
      extracto = `(omisión) ${extracto}`.trim();
    }
    const fuentes = (Array.isArray(h.fuentes) ? h.fuentes : [])
      .map((f) => f as { codigo?: string; criterio?: string })
      .map((f) => ({ k: Number(String(f.codigo ?? '').replace(/\D/g, '')) - 1, criterio: String(f.criterio ?? '').trim() }))
      .filter((f) => f.k >= 0 && f.k < prec.fragmentos.length && f.criterio);
    const vistos = new Set<string>();
    const fundamento: Array<{ norma: string; articulo?: string }> = [];
    const citadas: FuenteCitada[] = [];
    const norma = String(h.norma ?? '').trim();
    if (norma) fundamento.push({ norma });
    for (const f of fuentes) {
      const doc = prec.fragmentos[f.k];
      const numero = doc.numero;
      if (vistos.has(numero)) continue;
      vistos.add(numero);
      const nombre = NOMBRE_DE_FUENTE[doc.tipo as TipoDeFuente] ?? doc.tipo;
      fundamento.push({ norma: numero, articulo: `${nombre}: ${f.criterio}` });
      citadas.push({ tipo: doc.tipo as TipoDeFuente, numero, documentId: doc.document_id, criterio: f.criterio });
    }
    const severidad = (SEVERIDADES as readonly string[]).includes(String(h.severidad))
      ? (h.severidad as HallazgoDeAuditoria['severidad'])
      : 'medio';
    const solicitud = SOLICITUDES.includes(h.solicitud as Solicitud) ? (h.solicitud as Solicitud) : undefined;
    const detalle = c
      ? { pagina: c.pagina, capitulo: c.rotulo || tema.nombre, numeral: c.numeral, literal: c.literal }
      : { pagina: 'No corresponde', capitulo: tema.nombre, numeral: 'No corresponde', literal: 'No corresponde' };
    hallazgos.push({
      id: `tema_${tema.id}_${i + 1}`,
      categoria: tema.categoria,
      severidad,
      titulo: h.titulo.trim().slice(0, 140),
      ubicacion: `Pág. ${detalle.pagina} · Cap. ${detalle.capitulo} · Numeral ${detalle.numeral} · Literal ${detalle.literal}`,
      ubicacion_detalle: detalle,
      extracto_literal: extracto,
      descripcion: String(h.descripcion ?? ''),
      recomendacion: String(h.recomendacion ?? ''),
      ...(solicitud ? { solicitud } : {}),
      terminos_clave: tema.expresiones[0],
      fundamento_normativo: fundamento,
      fuentes: citadas,
      origen: 'tema',
    });
  }
  return {
    hallazgos,
    cobertura: {
      tema: tema.id,
      nombre: tema.nombre,
      clausulas: clausulas.length,
      documentosEnLaBiblioteca: prec.total,
      leidos: new Set(prec.fragmentos.map((f) => f.document_id)).size,
      hallazgos: hallazgos.length,
    },
  };
}

/** De a `n` a la vez: con todos juntos, la base corta búsquedas por tiempo. */
async function deAPocos<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = new Array(items.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (siguiente < items.length) {
        const i = siguiente++;
        salida[i] = await fn(items[i]);
      }
    }),
  );
  return salida;
}

export async function contrastarPorTema(
  db: SupabaseClient,
  texto: string,
  ctx: { regimen?: Regimen | null; objeto?: ObjetoDeContratacion | null; conPaginas: boolean },
  opciones: { alUsar?: (u: { entrada: number; salida: number }) => void; concurrencia?: number } = {},
): Promise<ResultadoDelContraste> {
  const clausulas = segmentarRequerimiento(texto, { conPaginas: ctx.conPaginas });
  const tareas = temasPara(ctx.objeto)
    .map((tema) => {
      const delTema = clausulas.filter((c) => tema.reconocer.test(c.texto) || tema.reconocer.test(c.rotulo));
      const obligatorio = esObligatorio(tema, ctx.regimen, ctx.objeto);
      return { tema, delTema, obligatorio };
    })
    .filter((t) => t.delTema.length > 0 || t.obligatorio);

  const resultados = await deAPocos(tareas, opciones.concurrencia ?? 3, async ({ tema, delTema, obligatorio }) => {
    try {
      return await juzgarTema(db, tema, delTema, ctx, obligatorio, opciones.alUsar);
    } catch (e) {
      console.error('[contraste] tema', tema.id, (e as Error).message);
      return {
        hallazgos: [],
        cobertura: { tema: tema.id, nombre: tema.nombre, clausulas: delTema.length, documentosEnLaBiblioteca: 0, leidos: 0, hallazgos: 0, error: (e as Error).message.slice(0, 200) },
      };
    }
  });
  return { hallazgos: resultados.flatMap((r) => r.hallazgos), cobertura: resultados.map((r) => r.cobertura) };
}
