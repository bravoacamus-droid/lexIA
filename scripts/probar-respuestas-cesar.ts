#!/usr/bin/env tsx
/**
 * Las respuestas de César, comprobadas contra la norma.
 *
 * POR QUÉ EXISTE
 *
 * El 21/08/2026 César reportó dos respuestas equivocadas del chat:
 * preguntó las condiciones para aprobar una ampliación de plazo en
 * bienes y el chat contestó "siete (7) días hábiles", y en otra pregunta
 * de plazos contestó quince donde el Reglamento dice diez. Los dos
 * números salían de opiniones escritas bajo la Ley N° 30225, derogada.
 *
 * Lo que se arregló —la jerarquía de tres capas— no se comprueba mirando
 * si "recupera el documento": los documentos ya estaban. Hay que mirar LO
 * QUE RESPONDE. Por eso esta prueba genera la respuesta de verdad y busca
 * en el texto la cifra que manda la norma, la que la contradice y de
 * dónde dice el chat que la saca.
 *
 * QUÉ DICE LA NORMA (verificado en la base, no de memoria)
 *
 *   · Reglamento 142.3 — el contratista solicita la ampliación "dentro
 *     de los diez días hábiles siguientes", con prórroga de hasta diez
 *     días hábiles más.
 *   · Reglamento 142.5 — la entidad resuelve y notifica "dentro de los
 *     doce días hábiles"; sin pronunciamiento, se tiene por aprobada.
 *   · Reglamento 200.1.a — en obras, la solicitud va "en un plazo no
 *     mayor de diez días hábiles".
 *
 * CÓMO SE PRUEBA
 *
 * Se replica la recuperación de la ruta del chat: la búsqueda híbrida y,
 * encima, los fragmentos de capa 1 que la ruta pide expresamente
 * (`src/app/api/chat/route.ts`). Luego el mismo constructor de prompt de
 * producción y el mismo modelo. Cada pregunta se hace tres veces: una
 * sola respuesta correcta no prueba nada cuando el modelo no es
 * determinista, y el fallo que reportó César tampoco salía siempre.
 *
 * Uso: npx tsx scripts/probar-respuestas-cesar.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { embedOne } from '../src/lib/ai/embeddings';
import { detectarEnumeracion } from '../src/lib/ai/enumeracion';
import { detectarReferencias } from '../src/lib/ai/referencia-documento';
import type { ChatSource } from '../src/lib/supabase/types';

config({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

/** Cuántas veces se repite cada pregunta. */
const VUELTAS = 3;

interface Caso {
  id: string;
  pregunta: string;
  /** Por qué se pregunta esto. */
  porque: string;
  /** Tiene que aparecer alguna de estas. */
  debeDecir: RegExp[];
  /** No puede darse por buena ninguna de estas. */
  noDebeDecir?: RegExp[];
  /** Debe apoyarse en la norma, no solo en criterios. */
  debeCitarNorma?: boolean;
}

const CASOS: Caso[] = [
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
    debeDecir: [
      /(?:corresponde a la DEC|est[áa] a cargo de la DEC|la DEC (?:es (?:la|quien)|asume|conduce|elabora)|recae en la DEC|responsabilidad de la DEC)/i,
      /coordinaci[óo]n con (?:el|dicho) jurado/i,
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
    id: 'plazo-entidad',
    pregunta:
      '¿En cuánto tiempo debe la entidad resolver y notificar una solicitud de ampliación de plazo en bienes y servicios?',
    porque: 'mismo artículo, otro numeral: el 142.5 dice doce días hábiles',
    debeDecir: [/(?:doce|12)\s*(?:\(\s*12\s*\))?\s*d[ií]as h[áa]biles/i],
    debeCitarNorma: true,
  },
];

/** La norma se cita nombrándola: Reglamento, Ley, artículo o numeral. */
const CITA_NORMA =
  /(?:art[íi]culo|numeral)\s*\d|reglamento|ley\s*n\.?\s*°?\s*32069|009-2025/i;

/** Señales de estar apoyándose en la norma derogada sin advertirlo. */
const NORMA_VIEJA = /30225/;
const ADVIERTE_VIEJA =
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
async function recuperar(pregunta: string): Promise<ChatSource[]> {
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
    (['ley', 'reglamento', 'directiva'] as const).map(async (tipo) => {
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
  return fuentes;
}

async function responder(pregunta: string): Promise<{ texto: string; fuentes: ChatSource[] }> {
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

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`     ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

function primeraLinea(t: string): string {
  const l = t.split('\n').find((x) => x.trim().length > 30) ?? t.slice(0, 120);
  return l.trim().slice(0, 150);
}

/** El primer trozo donde la respuesta habla de un plazo en días. */
function dondeHablaDePlazo(t: string): string {
  const m = /[^.]{0,120}d[ií]as h[áa]biles[^.]{0,60}/i.exec(t);
  return m ? m[0].replace(/\s+/g, ' ').trim().slice(0, 190) : '';
}

/** La oración donde cae una posición, sin invadir las vecinas. */
function oracionDe(t: string, i: number): string {
  const corte = /[.;\n]/;
  let a = i;
  while (a > 0 && !corte.test(t[a - 1])) a--;
  let b = i;
  while (b < t.length && !corte.test(t[b])) b++;
  return t.slice(a, b);
}

function contexto(t: string, i: number): string {
  return t.slice(Math.max(0, i - 90), i + 90).replace(/\s+/g, ' ');
}

/**
 * La otra mitad del reporte de César: pedir diez casos sobre una figura.
 *
 * Aquí no se comprueba el buscador —eso lo hace
 * `probar-enumeracion.ts`— sino LO QUE SE RESPONDE: que la respuesta
 * enumere casos distintos con su número, que esos números existan de
 * verdad en la biblioteca y que no dé a entender que son todos los que
 * hay.
 */
async function probarEnumeracion() {
  const PREGUNTA =
    'Quiero que me detalles al menos 10 casos en particular que resolvió el tribunal de ' +
    'contrataciones frente a un recurso de apelación respecto a los FACTORES DE EVALUACIÓN, ' +
    'específicamente respecto a la "Integridad en la contratación pública".';

  console.log('\n══ enumeracion · pidió diez casos y se dejó fuera cinco que él conoce ══');
  const peticion = detectarEnumeracion(PREGUNTA);
  comprobar('se reconoce como petición de casos', !!peticion);
  if (!peticion) return;

  const { data } = await admin.rpc('buscar_frase', {
    frase: peticion.frases[0],
    filtro_tipo: peticion.tipo ?? null,
    tope: peticion.cantidad,
    fragmentos_por_documento: 2,
  });
  const filas = (data ?? []) as Array<Fragmento & { hay_mas: boolean }>;
  const documentos = new Set(filas.map((f) => f.document_id)).size;

  const fuentes: ChatSource[] = filas.map((f) => ({
    chunk_id: f.chunk_id,
    doc_id: f.document_id,
    doc_title: f.doc_title,
    doc_type: f.doc_type as ChatSource['doc_type'],
    doc_number: f.doc_number,
    snippet: f.content,
  }));
  // El mismo aviso que arma la ruta.
  const aviso =
    `\\n\\nSOBRE "${peticion.frases[0]}": se han recuperado ${documentos} documentos que ` +
    `contienen esa expresión literal, de los más recientes hacia atrás` +
    `${filas[0]?.hay_mas ? ', y hay más en la biblioteca' : ' (no hay más en la biblioteca)'}. ` +
    'Enuméralos como casos distintos, uno por documento, citando su número. ' +
    (filas[0]?.hay_mas
      ? 'Advierte que existen más y que estos son los más recientes, no todos.'
      : '');

  const { text } = await generateText({
    model: chatModel,
    system: buildChatSystemPrompt(fuentes, null, [], null) + aviso,
    messages: [{ role: 'user', content: PREGUNTA }],
    temperature: 0.2,
  });

  // Los números de resolución que escribió la respuesta.
  // Los números de documento que escribió la respuesta. Tres cifras o
  // cinco: un pronunciamiento es "450-2026" y una resolución
  // "07524-2026", y contar solo las largas dejaba fuera la mitad.
  // Los documentos que enumera la respuesta. Se exige la palabra que
  // los nombra: sin ella, el "N° 009-2025-EF" del Decreto Supremo que
  // aprueba el Reglamento pasaba por un caso más.
  const citados = [
    ...new Set(
      [
        ...text.matchAll(
          /(?:Resoluci[óo]n|Pronunciamiento|Opini[óo]n)[^\n]{0,24}?N[.°ºo]{0,3}\s*D?0*(\d{2,5}-\d{4})/gi,
        ),
      ].map((m) => m[1]),
    ),
  ];
  console.log(`   ── ${documentos} documentos recuperados · ${citados.length} números en la respuesta`);
  comprobar('enumera al menos diez casos', citados.length >= 10, `citó ${citados.length}: ${citados.join(', ')}`);

  // Y que existan: es exactamente lo que César fue a comprobar. Se
  // comparan por correlativo y año, sin ceros de relleno, que es como
  // se nombra el mismo documento de dos maneras.
  const clave = (n: string) => n.replace(/^0+/, '');
  const traidos = new Set(
    filas
      .map((f) => /D?0*(\d{2,5})-+(\d{4})/.exec(f.doc_number ?? ''))
      .filter(Boolean)
      .map((m) => `${clave(m![1])}-${m![2]}`),
  );
  // Vale también el número que aparece DENTRO del texto de un
  // fragmento: una resolución cita a otra, y el prompt permite
  // nombrarla. Lo que no vale es un número que no esté en ninguno de
  // los dos sitios, que es la regla 4 de la whitelist.
  const enElTexto = filas.map((f) => f.content).join(' ');
  const inventados = citados.filter(
    (c) => !traidos.has(clave(c)) && !enElTexto.includes(clave(c)) && !enElTexto.includes(c),
  );
  comprobar(
    'y todos los números citados son de los documentos traídos',
    inventados.length === 0,
    inventados.join(', '),
  );
  comprobar(
    'avisa de que hay más en la biblioteca',
    /hay m[áa]s|no son todos|existen m[áa]s|m[áa]s recientes/i.test(text),
    primeraLinea(text),
  );
}

/**
 * Un caso pedido por su número tiene que ser ESE caso.
 *
 * César pidió la Resolución N° 01727-2026-TCP-S2 y no aparecía: el cero
 * de relleno y el "TCP-" impedían encontrarla.
 */
async function probarPorNumero() {
  const PREGUNTA = 'Resúmeme la Resolución N° 01727-2026-TCP-S2';
  console.log('\n══ por-numero · el cero de relleno impedía encontrarla ══');
  const ref = detectarReferencias(PREGUNTA)[0];
  comprobar('se reconoce el documento pedido', !!ref);
  if (!ref) return;
  comprobar('sin el cero de relleno', ref.correlativo === 1727, String(ref.correlativo));
  comprobar('y sin el TCP- pegado a la sala', ref.sufijo === 'S2', String(ref.sufijo));

  // La misma búsqueda de la ruta: por correlativo numérico y el año
  // decide, porque el correlativo se repite cada ejercicio.
  const { data } = await admin
    .from('normative_documents')
    .select('id, title, number, date, type')
    .eq('correlativo_num', ref.correlativo)
    .limit(30);
  const encontrados = ((data ?? []) as Array<{ number: string | null; date: string | null; title: string }>)
    .filter((d) => String(d.number ?? '').includes(ref.anio) || String(d.date ?? '').startsWith(ref.anio));
  comprobar(
    'y se encuentra en la biblioteca',
    encontrados.length > 0,
    'no salió con correlativo_num',
  );
  if (encontrados.length > 0) {
    console.log(`   ── ${encontrados.map((d) => d.number ?? d.title).join(' · ')}`);
  }
}

void (async () => {
  for (const caso of CASOS) {
    console.log(`\n══ ${caso.id} · ${caso.porque} ══`);
    console.log(`   Q: ${caso.pregunta.slice(0, 95)}`);
    for (let vuelta = 1; vuelta <= VUELTAS; vuelta++) {
      let texto = '';
      let fuentes: ChatSource[] = [];
      try {
        ({ texto, fuentes } = await responder(caso.pregunta));
      } catch (e) {
        comprobar(`vuelta ${vuelta}: la respuesta se generó`, false, String(e));
        continue;
      }
      const capa1 = fuentes.filter((f) =>
        ['ley', 'reglamento', 'directiva'].includes(f.doc_type as string),
      ).length;
      console.log(`   ── vuelta ${vuelta} · ${fuentes.length} fragmentos (${capa1} de capa 1)`);

      const acierta = caso.debeDecir.some((r) => r.test(texto));
      comprobar(
        'dice la cifra de la norma',
        acierta,
        // Cuando falla interesa lo que SÍ dijo del plazo, no el titular.
        dondeHablaDePlazo(texto) || primeraLinea(texto),
      );
      for (const mal of caso.noDebeDecir ?? []) {
        // Nombrar la cifra vieja PARA descartarla —"las opiniones del
        // régimen anterior hablaban de quince días; el Reglamento
        // vigente dice diez"— es justo lo que se le pide. Lo que no
        // vale es darla como respuesta.
        const sinContraste = [...texto.matchAll(new RegExp(mal.source, 'gi'))].find(
          (m) => !ADVIERTE_VIEJA.test(oracionDe(texto, m.index ?? 0)),
        );
        comprobar(
          'no da por buena la cifra de la norma derogada',
          !sinContraste,
          sinContraste ? contexto(texto, sinContraste.index ?? 0) : '',
        );
      }
      if (caso.debeCitarNorma) {
        comprobar('se apoya en la norma citándola', CITA_NORMA.test(texto), primeraLinea(texto));
      }
      if (NORMA_VIEJA.test(texto)) {
        comprobar(
          'si nombra la Ley 30225, advierte que está derogada',
          ADVIERTE_VIEJA.test(texto),
          contexto(texto, texto.search(NORMA_VIEJA)),
        );
      }
    }
  }

  await probarEnumeracion();
  await probarPorNumero();

  console.log(
    fallos === 0
      ? '\n✅ Las respuestas de plazos salen de la norma vigente.'
      : `\n❌ ${fallos} comprobación(es) fallida(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
