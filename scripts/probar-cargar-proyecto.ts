#!/usr/bin/env tsx
/**
 * Prueba la carga de un proyecto de requerimiento y su reparto.
 *
 * POR QUÉ EXISTE
 *
 * Es la primera observación de César: "debe permitir agregar el
 * requerimiento proyecto, leer el proyecto y redistribuir según las
 * cláusulas correspondientes". Lo que hay que comprobar no es que
 * responda, sino que reparta BIEN, y sobre todo que no haga las tres
 * cosas que arruinarían la función:
 *
 *   · inventar contenido para apartados de los que el proyecto no habla,
 *   · perder en silencio lo que no encaja en el formato,
 *   · escribir en un apartado de una sección apagada, donde el texto
 *     queda guardado pero fuera del documento.
 *
 * El proyecto de prueba está escrito como los escribe un área usuaria:
 * con sus propios títulos, en otro orden que el formato, con cosas que
 * el formato no contempla y sin decir nada de varios apartados.
 *
 * Uso: npx tsx scripts/probar-cargar-proyecto.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import {
  destinosDistribucion,
  condicionesDeclaradas,
  promptDistribucionSistema,
  promptDistribucionUsuario,
  depurarDistribucion,
} from '../src/lib/generadores/distribuidor';
import { parseJsonLoose } from '../src/lib/ai/json-suelto';

config({ path: join(process.cwd(), '.env.local'), override: true });

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const modelo = google(process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash');

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/**
 * Proyecto tal como lo manda un área usuaria: títulos propios, orden
 * propio, y tres trampas puestas a mano.
 *
 *   · "Relación de anexos telefónicos" no tiene sitio en el formato:
 *     tiene que salir en sin_ubicar, no desaparecer.
 *   · La visita previa obligatoria pertenece a una sección "de
 *     corresponder" que está apagada: hay que encenderla.
 *   · El proyecto no dice nada del número de CMN ni de la actividad del
 *     POI: esos apartados tienen que quedarse vacíos.
 */
const PROYECTO = `PROYECTO DE REQUERIMIENTO
SERVICIO DE LIMPIEZA Y DESINFECCIÓN DE LAS INSTALACIONES DE LA SEDE INSTITUCIONAL

1. ¿POR QUÉ LO NECESITAMOS?
La sede institucional tiene 3 pisos y 1,850 m2 de área construida, con un flujo diario aproximado
de 400 personas entre personal y administrados. Desde el vencimiento del contrato anterior en
marzo de 2026, la limpieza la vienen cubriendo dos trabajadores de la Oficina de Administración
que no tienen esa función asignada, lo que ha generado quejas del personal y observaciones del
área de seguridad y salud en el trabajo. Necesitamos un servicio permanente que garantice
condiciones de salubridad para el personal y para los administrados que acuden a la sede.

2. LO QUE QUEREMOS LOGRAR
Contar con las instalaciones de la sede institucional permanentemente limpias y desinfectadas,
de modo que el personal desarrolle sus labores en condiciones adecuadas y la atención al
ciudadano se preste en un ambiente salubre.

De manera específica: mantener limpios los 3 pisos, los 12 servicios higiénicos y las áreas
comunes; desinfectar semanalmente las superficies de contacto frecuente; y asegurar el manejo
adecuado de los residuos sólidos conforme a las disposiciones municipales.

3. EN QUÉ CONSISTE EL SERVICIO
El servicio se prestará de lunes a viernes de 6:00 a 14:00 horas, en la sede institucional
ubicada en Av. Los Álamos 452, distrito de San Isidro. El contratista deberá destinar cuatro (4)
operarios de limpieza y un (1) supervisor. Todos los insumos, materiales y equipos de limpieza
son por cuenta del contratista, incluyendo dos máquinas lavadoras-abrillantadoras industriales.
Los insumos deben contar con registro sanitario vigente de DIGESA.

El plazo de ejecución del servicio es de doce (12) meses contados a partir del día siguiente de
la suscripción del contrato.

4. QUÉ TIENE QUE HACER EL CONTRATISTA
- Barrido y trapeado diario de pisos en las tres plantas.
- Limpieza y desinfección de los 12 servicios higiénicos, tres veces al día.
- Limpieza de vidrios y ventanas exteriores, una vez al mes.
- Desinfección de superficies de contacto frecuente (pasamanos, manijas, ascensores), semanal.
- Recojo y disposición de residuos sólidos en los puntos de acopio autorizados, diario.
- Abrillantado de pisos de las áreas comunes, una vez al mes.

5. VISITA PREVIA
Antes de presentar su oferta, el postor deberá realizar una visita obligatoria a las instalaciones,
en la fecha que señale la Entidad, a fin de verificar las áreas y las condiciones del servicio. La
visita se acreditará con la constancia que emita la Oficina de Administración.

6. QUIÉN PUEDE PARTICIPAR
El postor debe acreditar una facturación acumulada de S/ 240,000.00 por servicios de limpieza de
edificios o similares. Asimismo, debe contar con registro vigente ante el Ministerio de Trabajo
como empresa prestadora de servicios de tercerización.

7. RECEPCIÓN Y PAGO
La conformidad del servicio la otorgará la Oficina de Administración, previa verificación del
cumplimiento de las actividades del mes. Los pagos serán mensuales, contra presentación del
comprobante y del informe de actividades en la Mesa de Partes de la sede institucional.

8. RELACIÓN DE ANEXOS TELEFÓNICOS DEL PERSONAL DE LA OFICINA DE ADMINISTRACIÓN
Jefatura: anexo 201. Logística: anexo 205. Servicios generales: anexo 210. Mesa de partes:
anexo 118. Esta relación se adjunta para coordinaciones internas durante la ejecución.

9. PRESUPUESTO REFERENCIAL INTERNO
Se ha estimado un gasto mensual de S/ 9,800.00 según la cotización recibida el 12 de agosto,
lo que hace un total anual de S/ 117,600.00 que se afectará a la meta presupuestal 0034.`;

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Falta GOOGLE_GENERATIVE_AI_API_KEY');
    process.exit(1);
  }

  const plantilla = obtenerPlantilla('ps-servicios-general');
  if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

  // Un apartado ya escrito por el usuario, para comprobar que el reparto
  // lo marca como ocupado en vez de pisarlo sin avisar.
  const respuestas: RespuestasRequerimiento = {
    ...respuestasVacias(),
    campos: { organo: 'Oficina de Administración' },
  };

  const destinos = destinosDistribucion(plantilla, respuestas);
  const condiciones = condicionesDeclaradas(plantilla.secciones);

  console.log('── Destinos del reparto ──');
  console.log(`   ${destinos.length} apartados, ${condiciones.length} condiciones`);
  comprobar(
    'incluye apartados de secciones apagadas',
    destinos.some((d) => d.condiciones.length > 0),
  );
  comprobar(
    'marca como ocupado lo que ya estaba escrito',
    destinos.find((d) => d.id === 'organo')?.ocupado === true,
  );
  const anidado = destinos.find((d) => d.id === 'mantenimiento');
  comprobar(
    'arrastra la cadena de condiciones de las subsecciones',
    !!anidado &&
      anidado.condiciones.includes('tiene_prestaciones_accesorias') &&
      anidado.condiciones.includes('accesoria_mantenimiento'),
  );
  comprobar(
    'no ofrece como destino un texto invariable',
    !destinos.some((d) => d.id === 'items' || d.id === 'otras_penalidades'),
  );

  // ── Filtro, sin modelo ──────────────────────────────────────────────
  console.log('\n── Filtro del reparto (sin modelo) ──');
  const limpio = depurarDistribucion(
    {
      asignaciones: [
        { apartado_id: 'no_existe', texto: 'algo', confianza: 'alta' },
        { apartado_id: 'finalidad', texto: '   ', confianza: 'alta' },
        { apartado_id: 'visita', texto: 'Visita obligatoria previa.', confianza: 'alta' },
        { apartado_id: 'visita', texto: 'Repetido, se descarta.', confianza: 'baja' },
        { apartado_id: 'antecedentes', texto: 'Texto de antecedentes.', confianza: 'inventada' },
      ],
      sin_ubicar: ['Anexos telefónicos', '  ', 'Presupuesto interno'],
      condiciones: ['prevé_visita', 'condicion_que_no_existe'],
    },
    destinos,
    condiciones,
  );
  comprobar('descarta el apartado inexistente', !limpio.asignaciones.some((a) => a.apartado_id === 'no_existe'));
  comprobar('descarta el texto vacío', !limpio.asignaciones.some((a) => a.apartado_id === 'finalidad'));
  comprobar(
    'se queda con la primera asignación de un apartado repetido',
    limpio.asignaciones.filter((a) => a.apartado_id === 'visita').length === 1,
  );
  comprobar(
    'normaliza una confianza inventada',
    limpio.asignaciones.find((a) => a.apartado_id === 'antecedentes')?.confianza === 'media',
  );
  comprobar('descarta la condición inexistente', !limpio.condiciones.includes('condicion_que_no_existe'));
  comprobar('enciende la condición del apartado asignado', limpio.condiciones.includes('prevé_visita'));
  comprobar('limpia las líneas vacías de sin_ubicar', limpio.sin_ubicar.length === 2);
  comprobar(
    'ordena como el formulario',
    limpio.asignaciones[0].apartado_id === 'antecedentes',
  );

  // ── Reparto real ────────────────────────────────────────────────────
  console.log('\n── Reparto con el modelo ──');
  const res = await generateText({
    model: modelo,
    system: promptDistribucionSistema(plantilla),
    prompt: promptDistribucionUsuario({
      denominacion: 'Servicio de limpieza y desinfección de la sede institucional',
      destinos,
      condiciones,
      proyecto: PROYECTO,
    }),
    temperature: 0.1,
  });

  const crudo = parseJsonLoose(res.text ?? '');
  const reparto = depurarDistribucion(crudo, destinos, condiciones);

  const etiqueta = new Map(destinos.map((d) => [d.id, d.etiqueta]));
  for (const a of reparto.asignaciones) {
    console.log(
      `   [${a.confianza}] ${etiqueta.get(a.apartado_id)} (${a.apartado_id}): ${a.texto.slice(0, 110).replace(/\n/g, ' ')}…`,
    );
  }
  console.log('\n   Sin ubicar:');
  for (const s of reparto.sin_ubicar) console.log(`     · ${s}`);
  console.log(`\n   Condiciones a encender: ${reparto.condiciones.join(', ') || '(ninguna)'}`);

  console.log('\n── Qué repartió ──');
  const tiene = (id: string) => reparto.asignaciones.some((a) => a.apartado_id === id);
  const texto = (id: string) =>
    reparto.asignaciones.find((a) => a.apartado_id === id)?.texto ?? '';

  comprobar('llena los antecedentes', tiene('antecedentes'));
  comprobar('llena el objetivo general', tiene('objetivo_general'));
  comprobar('llena las características técnicas', tiene('caracteristicas_tecnicas'));
  comprobar('llena las actividades', tiene('actividades'));
  comprobar('recoge el plazo de doce meses', /12|doce/.test(texto('plazo_servicio') + texto('caracteristicas_tecnicas')));
  comprobar(
    'coloca la visita en su apartado',
    tiene('visita') && /visita/i.test(texto('visita')),
  );
  comprobar(
    'lleva la experiencia a su apartado, no a otro',
    /240/.test(texto('experiencia_monto') + texto('capacidad_tecnica_requisito')),
  );
  comprobar(
    'reconoce que hay contenido que no encaja',
    reparto.sin_ubicar.length > 0 &&
      reparto.sin_ubicar.some((s) => /anexo|tel|presupuesto|meta/i.test(s)),
  );

  console.log('\n── Qué NO hizo ──');
  comprobar(
    'no inventa el número de CMN, del que el proyecto no habla',
    !tiene('numero_cmn'),
  );
  comprobar(
    'no inventa la actividad del POI',
    !tiene('actividad_poi'),
  );
  const ids = new Set(destinos.map((d) => d.id));
  comprobar(
    'todo lo repartido apunta a un apartado real',
    reparto.asignaciones.every((a) => ids.has(a.apartado_id)),
  );

  // ── El reparto aplicado tiene que aparecer en el documento ──────────
  console.log('\n── El reparto aplicado sale en el Word ──');
  const aplicadas: RespuestasRequerimiento = {
    ...respuestas,
    campos: { ...respuestas.campos },
    redacciones: { ...respuestas.redacciones },
    condiciones: { ...respuestas.condiciones },
  };
  for (const a of reparto.asignaciones) {
    const d = destinos.find((x) => x.id === a.apartado_id)!;
    if (d.destino === 'campos') aplicadas.campos[a.apartado_id] = a.texto;
    else aplicadas.redacciones[a.apartado_id] = a.texto;
    for (const c of a.condiciones) aplicadas.condiciones[c] = true;
  }
  const doc = ensamblarRequerimiento(plantilla, aplicadas, { cuantia: 117_600 });
  const perdidos = reparto.asignaciones.filter(
    (a) => !doc.markdown.includes(a.texto.slice(0, 60)),
  );
  comprobar(
    'ningún texto repartido se queda fuera del documento',
    perdidos.length === 0,
  );
  if (perdidos.length > 0) {
    for (const p of perdidos) console.log(`      ⚠️  ${p.apartado_id} no aparece en el documento`);
  }

  console.log(
    fallos === 0
      ? '\n✅ El proyecto se reparte por cláusulas, sin inventar y sin perder nada.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

void main();
