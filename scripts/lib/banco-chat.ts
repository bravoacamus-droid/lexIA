#!/usr/bin/env tsx
/**
 * El banco de preguntas del chat, y la maquinaria para responderlas.
 *
 * POR QUÉ ESTÁ APARTE
 *
 * Lo usaban dos scripts con su propia copia de la recuperación, y una
 * copia se queda vieja: al subir el rescate de capa 1 de tres a ocho
 * fragmentos hubo que tocar tres archivos, y si se olvida uno la prueba
 * mide algo que no es la aplicación. Aquí vive una sola vez: las
 * preguntas, la recuperación —que replica la de
 * `src/app/api/chat/route.ts`— y el juicio de cada respuesta.
 *
 * Quien pregunta si algo está roto usa `probar-respuestas-cesar.ts`.
 * Quien quiere saber CUÁNTO acierta usa `medir-respuestas-chat.ts`:
 * este modelo no es determinista y un aprobado suelto no dice nada.
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../../src/lib/ai/prompts';
import { embedOne } from '../../src/lib/ai/embeddings';
import type { ChatSource } from '../../src/lib/supabase/types';
import {
  detectarGeneracionEnBloque,
  temasDeLaPeticion,
} from '../../src/lib/ai/generacion-en-bloque';

config({ path: join(process.cwd(), '.env.local'), override: true });

export const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

export interface Caso {
  id: string;
  pregunta: string;
  /** Por qué se pregunta esto. */
  porque: string;
  /** Tiene que aparecer alguna de estas. */
  debeDecir: RegExp[];
  /**
   * Tienen que aparecer TODAS estas, y solo se buscan en la conclusión.
   *
   * El cuerpo de la respuesta cita la norma —y hace bien: el artículo
   * 66 enumera tres órganos—, así que buscar ahí no distingue una
   * respuesta que resuelve el caso de otra que se limita a copiar la
   * lista. La conclusión es donde el chat contesta lo que se le
   * preguntó.
   *
   * `debeDecir` se conforma con una, y eso deja pasar respuestas a
   * medias: en la del jurado bastaba con nombrar la «coordinación con
   * el jurado» —que también dice la respuesta genérica— para dar el
   * caso por bueno, sin comprobar lo que de verdad se preguntaba, que
   * es a quién le corresponde.
   */
  debeDecirTodas?: RegExp[];
  /** No puede darse por buena ninguna de estas. */
  noDebeDecir?: RegExp[];
  /** Debe apoyarse en la norma, no solo en criterios. */
  debeCitarNorma?: boolean;
}

export const CASOS: Caso[] = [
  {
    id: 'plazo-bienes',
    pregunta:
      'CUALES SON LAS CONDICIONES PARA QUE SE APRUEBA UNA SOLICITUD DE AMPLIACION DE PLAZO EN CASO DE BIENES',
    porque: 'la que falló: respondió siete días, de una opinión de la norma derogada',
    debeDecir: [/(?:diez|10)\s*(?:\(\s*10\s*\))?\s*d[ií]as h[áa]biles/i],
    noDebeDecir: [/(?:siete|7)\s*(?:\(\s*7\s*\))?\s*d[ií]as/i],
    debeCitarNorma: true,
  },
  {
    id: 'plazo-obras',
    pregunta:
      '¿En qué plazo debe el contratista solicitar la ampliación de plazo en la ejecución de obras?',
    porque: 'el artículo 200 dice diez días hábiles; llegó a responder quince',
    debeDecir: [/(?:diez|10)\s*(?:\(\s*10\s*\))?\s*d[ií]as h[áa]biles/i],
    noDebeDecir: [/(?:quince|15)\s*(?:\(\s*15\s*\))?\s*d[ií]as/i],
    debeCitarNorma: true,
  },
  {
    id: 'pliego-jurado',
    pregunta:
      '¿Quién debe absolver las consultas y observaciones cuando un proceso de selección de ejecución de obras es conducido por un jurado?',
    porque:
      'reportada el 31/08/2026: contestó la enumeración del artículo 66 —«el oficial de compra o el comité o la DEC»— sin resolver el «según corresponda» que la pregunta plantea. Con jurado, el artículo 60 deja la conducción en la DEC: los jurados le remiten los puntajes y es ella quien elabora las bases',
    // Las dos, no una: la respuesta genérica del artículo 66 ya dice
    // «en coordinación con el jurado», así que sola no distingue una
    // respuesta buena de una que no resuelve el caso preguntado.
    debeDecir: [/\bDEC\b|Dependencia Encargada de las? Contrataciones/i],
    debeDecirTodas: [
      // Nombrar a la DEC, no «la instancia administrativa encargada».
      /\bDEC\b|Dependencia Encargada/i,
      // Y ligarla al jurado en la misma oración.
      /(?:\bDEC\b|Dependencia Encargada)[^.]{0,140}jurado|jurado[^.]{0,140}(?:\bDEC\b|Dependencia Encargada)/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'plazo-apelacion',
    pregunta:
      '¿Cuál es el plazo para interponer recurso de apelación contra el otorgamiento de la buena pro en una licitación pública?',
    porque:
      'reportada el 31/08/2026: contestó «tres (3) días hábiles» y le puso cita. El artículo 304.1 del Reglamento dice ocho días hábiles desde la notificación en la Pladicop',
    debeDecir: [/(?:ocho|8)\s*(?:\(\s*8\s*\))?\s*d[ií]as h[áa]biles/i],
    noDebeDecir: [/(?:tres|3)\s*(?:\(\s*3\s*\))?\s*d[ií]as h[áa]biles/i],
    debeCitarNorma: true,
  },
  {
    id: 'cotizaciones-contrato-menor',
    pregunta:
      'En los contratos menores, ¿cómo se denomina: indagación de mercado, interacción de mercado u otros?, cuando la DEC en las actuaciones preparatorias quiere determinar el precio del bien y/o servicio a contratar',
    porque:
      'reportada el 01/09/2026: contestó «indagación de condiciones competitivas del mercado», que es el nombre que usan las disposiciones internas de la SUNARP. El artículo 228.2 del Reglamento dice que la DEC, por la Pladicop, «solicita y recibe cotizaciones»; la indagación y la consulta al mercado son los dos tipos de interacción con el mercado (artículos 47 y 48), que es otra cosa y no aplica aquí',
    debeDecir: [/cotizacion/i],
    // Solo la terminología ajena, que es inequívoca. Se probó también a
    // buscar «se denomina … indagación» y marcaba como error la
    // respuesta buena: «NO se denomina indagación … sino solicitud y
    // recepción de cotizaciones». Una expresión que no distingue la
    // afirmación de la negación mide el chat al revés.
    noDebeDecir: [/indagaci[óo]n de condiciones competitivas/i],
    debeCitarNorma: true,
  },
  {
    id: 'comite-tras-nulidad',
    pregunta:
      'En el supuesto de que un procedimiento de selección sea declarado nulo y se disponga su retroacción hasta la etapa de convocatoria, previa reformulación del requerimiento, ¿corresponde dejar sin efecto la designación del Comité de Selección que condujo el procedimiento declarado nulo y conformar un nuevo Comité de Selección para continuar con el procedimiento desde la etapa a la que se retrotrae?',
    porque:
      'reportada el 02/09/2026: contestó que SÍ corresponde reconformar el comité, «para garantizar un nuevo inicio con plena imparcialidad», que no es un motivo de la norma. No corresponde, y la cadena está verificada en la base: el artículo 313.1.d) dice que la nulidad precisa la etapa hasta la que se retrotrae LA FASE DE SELECCIÓN; el 63.2 dice que esa fase INICIA con la convocatoria, y el 63.1 exige que para convocar ya existan los evaluadores, porque las bases las elaboran ellos. La designación es un acto anterior, que la retroacción no alcanza. Y el 59.2 solo permite remover a un integrante por caso fortuito, fuerza mayor, cese, conflicto de intereses u otra situación justificada, con documento motivado',
    debeDecir: [/comit[ée]/i],
    // Decir que el comité continúa es responder que no corresponde
    // reconformarlo: la primera versión solo aceptaba la forma negada
    // y contaba como fallo una respuesta correcta dicha en afirmativo.
    debeDecirTodas: [
      /no\s+(?:corresponde|es necesario|resulta necesario|procede|se requiere|hay que)[^.]{0,100}(?:dejar sin efecto la designaci|reconform|conformar (?:un|uno) nuevo|nuevo comit)|(?:el )?comit[ée][^.]{0,80}(?:contin[úu]a|se mantiene|mantiene su|conserva su|sigue a cargo)/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'plazo-entidad',
    pregunta:
      '¿En cuánto tiempo debe la entidad resolver y notificar una solicitud de ampliación de plazo en bienes y servicios?',
    porque: 'mismo artículo, otro numeral: el 142.5 dice doce días hábiles',
    debeDecir: [/(?:doce|12)\s*(?:\(\s*12\s*\))?\s*d[ií]as h[áa]biles/i],
    debeCitarNorma: true,
  },
];

/** La norma se cita nombrándola: Reglamento, Ley, artículo o numeral. */
export const CITA_NORMA =
  /(?:art[íi]culo|numeral)\s*\d|reglamento|ley\s*n\.?\s*°?\s*32069|009-2025/i;

/** Señales de estar apoyándose en la norma derogada sin advertirlo. */
export const NORMA_VIEJA = /30225/;
export const ADVIERTE_VIEJA =
  /derogad|ya no [^.]{0,25}vigente|no (?:se encuentran? )?vigentes?|no resultan? aplicables?|ya no (?:resultan?|son) aplicables?|(?:norma|ley|r[ée]gimen|marco|normativa) anterior|anterior (?:ley|r[ée]gimen|norma)|r[ée]gimen vigente/i;

interface Fragmento {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

/**
 * La recuperación de la ruta del chat, replicada: búsqueda híbrida más
 * los fragmentos de capa 1 que se piden aparte y van delante.
 */
export async function recuperar(pregunta: string): Promise<ChatSource[]> {
  const emb = await embedOne(pregunta, 'RETRIEVAL_QUERY');
  const { data, error } = await admin.rpc('hybrid_search', {
    query_text: pregunta,
    query_embedding: emb,
    match_count: 15,
    filter_type: null,
  });
  if (error) throw new Error(`hybrid_search: ${error.message}`);

  const aFuente = (c: Fragmento): ChatSource => ({
    chunk_id: c.chunk_id,
    doc_id: c.document_id,
    doc_title: c.doc_title,
    doc_type: c.doc_type as ChatSource['doc_type'],
    doc_number: c.doc_number,
    snippet: c.content,
  });

  let fuentes = ((data ?? []) as Fragmento[]).map(aFuente);

  const deCapa1 = await Promise.all(
    (['ley', 'directiva'] as const).map(async (tipo) => {
      const { data: d } = await admin.rpc('hybrid_search', {
        query_text: pregunta.slice(0, 400),
        query_embedding: emb,
        match_count: 8,
        filter_type: tipo,
      });
      return (d ?? []) as Fragmento[];
    }),
  );
  const yaEstan = new Set(fuentes.map((s) => s.chunk_id));
  const norma = deCapa1
    .flat()
    .filter((c) => !yaEstan.has(c.chunk_id))
    .map(aFuente);
  if (norma.length > 0) fuentes = [...norma, ...fuentes];

  // La descomposición en temas, igual que en la ruta: si se pide en
  // bloque, se busca tema por tema.
  // SIN_DESCOMPOSICION=1 mide el brazo de control: la recuperación de
  // antes, para poder comparar los dos con el mismo número de vueltas.
  const enBloque = process.env.SIN_DESCOMPOSICION ? null : detectarGeneracionEnBloque(pregunta);
  if (enBloque) {
    const temas = await temasDeLaPeticion(pregunta, enBloque.cuantas ?? 8);
    const porTema = await Promise.all(
      temas.map(async (tema) => {
        const e = await embedOne(tema, 'RETRIEVAL_QUERY');
        const { data } = await admin.rpc('hybrid_search', {
          query_text: tema,
          query_embedding: e,
          match_count: 4,
          filter_type: null,
        });
        return (data ?? []) as Fragmento[];
      }),
    );
    const vistos = new Set(fuentes.map((f) => f.chunk_id));
    const extra = porTema
      .flat()
      .filter((c) => !vistos.has(c.chunk_id) && (vistos.add(c.chunk_id), true))
      .map(aFuente);
    fuentes = [...fuentes, ...extra];
  }

  return fuentes;
}

export async function responder(pregunta: string): Promise<{ texto: string; fuentes: ChatSource[] }> {
  const fuentes = await recuperar(pregunta);
  const system = buildChatSystemPrompt(fuentes, null, [], null);
  const { text } = await generateText({
    model: chatModel,
    system,
    messages: [{ role: 'user', content: pregunta }],
    temperature: 0.2,
  });
  return { texto: text, fuentes };
}

export function primeraLinea(t: string): string {
  const l = t.split('\n').find((x) => x.trim().length > 30) ?? t.slice(0, 120);
  return l.trim().slice(0, 150);
}

/** El primer trozo donde la respuesta habla de un plazo en días. */
export function dondeHablaDePlazo(t: string): string {
  const m = /[^.]{0,120}d[ií]as h[áa]biles[^.]{0,60}/i.exec(t);
  return m ? m[0].replace(/\s+/g, ' ').trim().slice(0, 190) : '';
}

/** La oración donde cae una posición, sin invadir las vecinas. */
export function oracionDe(t: string, i: number): string {
  const corte = /[.;\n]/;
  let a = i;
  while (a > 0 && !corte.test(t[a - 1])) a--;
  let b = i;
  while (b < t.length && !corte.test(t[b])) b++;
  return t.slice(a, b);
}

export function contexto(t: string, i: number): string {
  return t.slice(Math.max(0, i - 90), i + 90).replace(/\s+/g, ' ');
}


/** Una comprobación sobre una respuesta concreta. */
export interface Comprobacion {
  /** Estable entre ejecuciones: es la clave con la que se mide. */
  clave: string;
  nombre: string;
  ok: boolean;
  detalle?: string;
}

/**
 * Juzga una respuesta.
 *
 * Devuelve la lista en vez de imprimirla porque hay dos lectores: el
 * que quiere saber si algo se rompió, y el que quiere la proporción de
 * acierto sobre muchas vueltas. Cada comprobación lleva una clave
 * estable —el mismo caso da siempre las mismas claves— para poder
 * sumarlas entre ejecuciones.
 */
/** La conclusión, que es donde el chat contesta lo que se le preguntó. */
export function conclusionDe(texto: string): string {
  const i = texto.search(/Conclusi[óo]n/i);
  return i >= 0 ? texto.slice(i) : texto.slice(-700);
}

export function juzgar(caso: Caso, texto: string): Comprobacion[] {
  const salida: Comprobacion[] = [];

  const conclusion = conclusionDe(texto);
  (caso.debeDecirTodas ?? []).forEach((r, i) => {
    salida.push({
      clave: `${caso.id}/tambien-dice-${i + 1}`,
      nombre: 'resuelve el caso concreto en la conclusión',
      ok: r.test(conclusion),
      detalle: conclusion.slice(0, 190).replace(/\s+/g, ' '),
    });
  });

  salida.push({
    clave: `${caso.id}/dice-lo-que-manda`,
    nombre: 'dice lo que manda la norma',
    ok: caso.debeDecir.some((r) => r.test(texto)),
    detalle: dondeHablaDePlazo(texto) || primeraLinea(texto),
  });

  (caso.noDebeDecir ?? []).forEach((mal, i) => {
    // Nombrar la versión equivocada PARA descartarla —«las opiniones
    // del régimen anterior hablaban de quince días; el Reglamento
    // vigente dice diez»— es justo lo que se le pide. Lo que no vale
    // es darla como respuesta.
    const sinContraste = [...texto.matchAll(new RegExp(mal.source, 'gi'))].find(
      (m) => !ADVIERTE_VIEJA.test(oracionDe(texto, m.index ?? 0)),
    );
    salida.push({
      clave: `${caso.id}/no-da-por-buena-${i + 1}`,
      nombre: 'no da por buena la versión equivocada',
      ok: !sinContraste,
      detalle: sinContraste ? contexto(texto, sinContraste.index ?? 0) : '',
    });
  });

  if (caso.debeCitarNorma) {
    salida.push({
      clave: `${caso.id}/cita-la-norma`,
      nombre: 'se apoya en la norma citándola',
      ok: CITA_NORMA.test(texto),
      detalle: primeraLinea(texto),
    });
  }

  // Condicional: solo cuenta cuando la respuesta nombra la ley
  // derogada. Se marca aparte para no contar como acierto las vueltas
  // en las que ni siquiera se planteó.
  if (NORMA_VIEJA.test(texto)) {
    salida.push({
      clave: `${caso.id}/advierte-derogada`,
      nombre: 'si nombra la Ley 30225, advierte que está derogada',
      ok: ADVIERTE_VIEJA.test(texto),
      detalle: contexto(texto, texto.search(NORMA_VIEJA)),
    });
  }

  return salida;
}
