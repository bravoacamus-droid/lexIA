#!/usr/bin/env tsx
/**
 * Prueba la revisión global del requerimiento de punta a punta.
 *
 * POR QUÉ EXISTE
 *
 * Es lo segundo que pidió César: hasta ahora la ayuda era "parche por
 * parche uno por uno" y el documento no quedaba revisado como conjunto.
 * La revisión tiene que encontrar tres clases de problema, y ninguna de
 * las tres la detecta el compilador:
 *
 *   · incoherencia entre secciones (un plazo que contradice a otro),
 *   · algo escrito a mano que vulnera la norma —su ejemplo fue justo
 *     las penalidades—,
 *   · redacción pobre del conjunto.
 *
 * Así que se arma un requerimiento con defectos plantados a propósito y
 * se comprueba que salgan. Y, tan importante como eso: que la revisión
 * NO proponga reemplazar decisiones del área usuaria, ni cite norma que
 * no se le haya dado.
 *
 * Uso: npx tsx scripts/probar-revision-global.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import type { Seccion } from '../src/lib/generadores/plantilla-tipos';
import {
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import {
  inventarioRevisable,
  consultasRevision,
  promptRevisionSistema,
  promptRevisionUsuario,
  depurarHallazgos,
  type Hallazgo,
} from '../src/lib/generadores/revisor';
import { parseJsonLoose } from '../src/lib/ai/json-suelto';

config({ path: join(process.cwd(), '.env.local'), override: true });

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const modelo = google(process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash');
const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

let fallos = 0;
const problema = (m: string) => {
  console.log(`   ❌ ${m}`);
  fallos++;
};
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/**
 * Requerimiento con tres defectos plantados:
 *
 *   1. El plazo del servicio dice 90 días en un apartado y 30 en otro.
 *   2. La penalidad escrita a mano llega al 20% del contrato por día,
 *      muy por encima del tope del 10% del monto del contrato.
 *   3. La finalidad está escrita como un apunte, no como un documento.
 */
const RESPUESTAS: RespuestasRequerimiento = {
  ...respuestasVacias(),
  campos: {
    organo: 'Oficina de Tecnologías de la Información',
    // Nueve veces la cuantía: el tope es tres. El aviso lo calcula el
    // ensamblador y el modelo no debe repetirlo, pero sí puede señalar
    // que la cifra es desproporcionada.
    experiencia_monto: 'S/ 900,000.00 (novecientos mil con 00/100 soles)',
    denominacion: 'Servicio de soporte técnico para los equipos informáticos de la sede central',
    plazo_respuesta: '5',
    solicitante_nombre: 'Ana Quispe Ramírez',
    solicitante_cargo: 'Jefa de la Oficina de Tecnologías de la Información',
  },
  redacciones: {
    finalidad: 'que los equipos funcionen bien y no se malogren, es importante para la entidad.',
    objetivo_general:
      'Contratar el servicio de soporte técnico para los equipos informáticos de la sede central de la Entidad.',
    caracteristicas_tecnicas:
      'El servicio se prestará por un plazo de noventa (90) días calendario contados desde el día siguiente de la suscripción del contrato, en la sede central de la Entidad, en horario de lunes a viernes de 8:00 a 17:00 horas. El contratista deberá atender los requerimientos de soporte de los 40 equipos informáticos.',
    actividades:
      'El contratista realizará el diagnóstico, la reparación y la configuración de los equipos. Todas las actividades deberán quedar concluidas dentro del plazo de treinta (30) días calendario contados desde el inicio del servicio.',
    procedimiento_penalidades:
      'En caso de retraso injustificado en la atención de un requerimiento de soporte, la Entidad aplicará al contratista una penalidad equivalente al 20% del monto del contrato por cada día de retraso, la cual se descontará de los pagos a cuenta.',
  },
  // Todas las secciones "de corresponder" encendidas: si no, tres de los
  // apartados con defecto quedan fuera del documento y no hay nada que
  // revisar en ellos. Lo detectó esta misma prueba.
  condiciones: {},
};

const CUANTIA = 100_000;

/** Enciende todas las condiciones declaradas por la plantilla. */
function encenderCondiciones(secciones: Seccion[], acc: Record<string, boolean>) {
  for (const s of secciones) {
    if (s.condicion) acc[s.condicion] = true;
    if (s.subsecciones) encenderCondiciones(s.subsecciones, acc);
  }
  return acc;
}

async function sustento(consultas: string[]): Promise<string> {
  const { embedOne } = await import('../src/lib/ai/embeddings');
  const trozos: string[] = [];
  const vistos = new Set<string>();
  for (const consulta of consultas) {
    try {
      const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
      const { data } = await admin.rpc('hybrid_search', {
        query_text: consulta,
        query_embedding: embedding as unknown as number[],
        match_count: 4,
        filter_type: null,
      });
      for (const f of (data ?? []) as Array<{
        content: string;
        doc_title: string;
        doc_type: string;
        doc_number: string | null;
      }>) {
        const clave = `${f.doc_title}|${f.content.slice(0, 120)}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        trozos.push(
          `[${trozos.length + 1}] ${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''} — ${f.doc_title}\n${f.content.slice(0, 1200)}`,
        );
        if (trozos.length >= 14) return trozos.join('\n\n---\n\n');
      }
    } catch (e) {
      console.log(`   ⚠️  sin sustento para "${consulta.slice(0, 50)}…": ${(e as Error).message}`);
    }
  }
  return trozos.join('\n\n---\n\n');
}

/** Comprobaciones del filtro, que no dependen del modelo. */
function probarDepuracion(inventario: ReturnType<typeof inventarioRevisable>) {
  console.log('\n── Filtro de hallazgos (sin modelo) ──');
  const noEditable = inventario.find((a) => !a.editable);
  const editable = inventario.find((a) => a.editable)!;

  const crudos = [
    { apartado_id: 'apartado_que_no_existe', tipo: 'norma', gravedad: 'alta', detalle: 'x'.repeat(40) },
    { apartado_id: editable.id, tipo: 'coherencia', gravedad: 'alta', detalle: 'a'.repeat(40) },
    { apartado_id: editable.id, tipo: 'coherencia', gravedad: 'alta', detalle: 'a'.repeat(40) },
    { apartado_id: null, tipo: 'inventado', gravedad: 'urgente', detalle: 'b'.repeat(40) },
    { apartado_id: editable.id, tipo: 'redaccion', gravedad: 'baja', detalle: 'corto' },
    ...(noEditable
      ? [
          {
            apartado_id: noEditable.id,
            tipo: 'norma',
            gravedad: 'media',
            detalle: 'c'.repeat(40),
            texto_propuesto: 'Un reemplazo que no debe aceptarse porque el apartado no es editable.',
          },
        ]
      : []),
  ];

  const limpios = depurarHallazgos(crudos, inventario);
  comprobar('descarta el apartado inexistente', !limpios.some((h) => h.apartado_id === 'apartado_que_no_existe'));
  comprobar('descarta el hallazgo duplicado', limpios.filter((h) => h.detalle.startsWith('aaa')).length === 1);
  comprobar('descarta el detalle vacío de contenido', !limpios.some((h) => h.detalle === 'corto'));
  comprobar(
    'normaliza tipo y gravedad inventados',
    limpios.some((h) => h.apartado_id === null && h.tipo === 'redaccion' && h.gravedad === 'media'),
  );
  if (noEditable) {
    comprobar(
      'no propone reemplazo en un apartado no editable',
      !limpios.some((h) => h.apartado_id === noEditable.id && h.texto_propuesto),
    );
  }
  comprobar(
    'ordena por gravedad',
    limpios.every((h, i) => i === 0 || orden(limpios[i - 1].gravedad) <= orden(h.gravedad)),
  );
}

const orden = (g: Hallazgo['gravedad']) => ({ alta: 0, media: 1, baja: 2 })[g];

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Falta GOOGLE_GENERATIVE_AI_API_KEY');
    process.exit(1);
  }

  const plantilla = obtenerPlantilla('ps-servicios-general');
  if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

  encenderCondiciones(plantilla.secciones, RESPUESTAS.condiciones);

  const doc = ensamblarRequerimiento(plantilla, RESPUESTAS, { cuantia: CUANTIA });
  const inventario = inventarioRevisable(plantilla, RESPUESTAS);

  console.log('── Inventario de lo escrito a mano ──');
  console.log(`   ${inventario.length} apartados con contenido`);
  for (const id of [
    'finalidad',
    'caracteristicas_tecnicas',
    'actividades',
    'procedimiento_penalidades',
    'experiencia_monto',
    'organo',
  ]) {
    comprobar(`recoge "${id}"`, inventario.some((a) => a.id === id));
  }
  comprobar(
    'no recoge apartados en blanco',
    !inventario.some((a) => a.texto.trim().length === 0),
  );
  comprobar(
    'marca como editable el texto libre',
    inventario.find((a) => a.id === 'actividades')?.editable === true,
  );

  probarDepuracion(inventario);

  const consultas = consultasRevision(plantilla, inventario);
  console.log('\n── Sustento normativo ──');
  console.log(consultas.map((c) => `   · ${c.slice(0, 90)}`).join('\n'));
  const normativo = await sustento(consultas);
  console.log(`   ${normativo ? `${normativo.split('---').length} fragmentos` : 'sin sustento'}`);

  console.log('\n── Revisión con el modelo ──');
  const res = await generateText({
    model: modelo,
    system: promptRevisionSistema(plantilla),
    prompt: promptRevisionUsuario({
      denominacion: RESPUESTAS.campos.denominacion,
      documento: doc.markdown,
      inventario,
      avisos: doc.avisos,
      faltantes: doc.faltantes,
      sustento: normativo,
    }),
    temperature: 0.2,
  });

  let crudo: { resumen?: unknown; hallazgos?: unknown };
  try {
    crudo = parseJsonLoose(res.text ?? '');
  } catch (e) {
    problema(`el modelo no devolvió JSON legible: ${(e as Error).message}`);
    process.exit(1);
  }

  const hallazgos = depurarHallazgos(crudo.hallazgos, inventario);
  console.log(`\n   Resumen: ${String(crudo.resumen ?? '').slice(0, 300)}\n`);
  for (const h of hallazgos) {
    const ap = h.apartado_id ?? 'documento';
    console.log(`   [${h.gravedad}/${h.tipo}] ${ap}: ${h.detalle}`);
    if (h.fundamento) console.log(`        fundamento: ${h.fundamento}`);
    if (h.texto_propuesto) console.log(`        propone reemplazo (${h.texto_propuesto.length} car.)`);
  }

  console.log('\n── Qué encontró ──');
  const texto = hallazgos.map((h) => `${h.apartado_id ?? ''} ${h.detalle}`).join(' \n ').toLowerCase();

  comprobar('devuelve al menos un hallazgo', hallazgos.length > 0);
  comprobar(
    'detecta la contradicción de plazos (90 vs 30 días)',
    hallazgos.some(
      (h) =>
        h.tipo === 'coherencia' &&
        /30|treinta/.test(h.detalle) &&
        /90|noventa/.test(h.detalle),
    ),
  );
  comprobar(
    'detecta la penalidad que vulnera la norma',
    hallazgos.some((h) => h.tipo === 'norma' && /penalidad/i.test(h.detalle)),
  );
  // La experiencia desproporcionada la caza la aritmética, no el modelo:
  // 900 000 sobre una cuantía de 100 000 supera el tope de tres veces.
  // Y el prompt le pide que NO repita lo que el sistema ya calculó, así
  // que aquí lo correcto es que el aviso exista y el modelo calle.
  comprobar(
    'el tope de experiencia lo detecta el cálculo, no el modelo',
    doc.avisos.some((a) => a.validacion === 'experiencia_max' && a.nivel === 'error'),
  );
  comprobar(
    'señala la finalidad mal redactada',
    hallazgos.some((h) => h.apartado_id === 'finalidad'),
  );

  console.log('\n── Qué NO debe hacer ──');
  const ids = new Set(inventario.map((a) => a.id));
  comprobar(
    'todo hallazgo apunta a un apartado real o al documento',
    hallazgos.every((h) => h.apartado_id === null || ids.has(h.apartado_id)),
  );
  const editables = new Set(inventario.filter((a) => a.editable).map((a) => a.id));
  comprobar(
    'solo propone reemplazo donde se puede reemplazar',
    hallazgos.every((h) => !h.texto_propuesto || (h.apartado_id && editables.has(h.apartado_id))),
  );
  comprobar(
    'no repite los topes que ya calcula el sistema',
    doc.avisos.length === 0 ||
      !hallazgos.some((h) => doc.avisos.some((a) => h.detalle === a.mensaje)),
  );

  console.log(
    fallos === 0
      ? '\n✅ La revisión global encuentra lo plantado y respeta lo que no le toca.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

void main();
