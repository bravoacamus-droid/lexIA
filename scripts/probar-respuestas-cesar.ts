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
import {
  CASOS,
  juzgar,
  responder,
  admin,
  ADVIERTE_VIEJA,
  NORMA_VIEJA,
  contexto,
  primeraLinea,
} from './lib/banco-chat';
// Las dos pruebas de abajo —enumerar casos y pedir un documento por su
// número— no pasan por el banco: comprueban otra cosa y llaman al
// modelo a su manera.
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { detectarEnumeracion } from '../src/lib/ai/enumeracion';
import { detectarReferencias } from '../src/lib/ai/referencia-documento';
import type { ChatSource } from '../src/lib/supabase/types';

const VUELTAS = 3;

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`     ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

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
    console.log(`
══ ${caso.id} · ${caso.porque} ══`);
    console.log(`   Q: ${caso.pregunta.slice(0, 95)}`);
    for (let vuelta = 1; vuelta <= VUELTAS; vuelta++) {
      let texto = '';
      let fuentes: Awaited<ReturnType<typeof responder>>['fuentes'] = [];
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
      for (const c of juzgar(caso, texto)) comprobar(c.nombre, c.ok, c.detalle);
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
