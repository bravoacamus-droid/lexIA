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
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
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
lo que hace un total anual de S/ 117,600.00 que se afectará a la meta presupuestal 0034.

10. PENALIDADES DISTINTAS A LA MORA
Además de la penalidad por mora, aplicaremos estas penalidades:
- Si el personal no usa el uniforme e identificación durante la jornada: 0.5 UIT por cada vez.
  Se verifica con el informe del supervisor del servicio y el registro fotográfico.
- Si el contratista no repone en 24 horas a un trabajador ausente: 1 UIT por cada día de ausencia,
  verificado con el reporte de asistencia y la conformidad del área usuaria.
- Si los insumos entregados no corresponden a las fichas técnicas ofertadas: 2 UIT por cada
  entrega observada, según el acta de recepción y el informe del área usuaria.
`;

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
  // Los cuadros SÍ reciben contenido desde agosto de 2026. Era la
  // observación de César: "al cargar un proyecto de requerimiento, LexIA
  // no reparte el contenido: al cuadro de otras penalidades, experiencia
  // del personal clave". Su proyecto los trae en cuadros y había que
  // copiarlos a mano.
  const cuadro = destinos.find((d) => d.id === 'otras_penalidades');
  comprobar('los cuadros se ofrecen como destino', !!cuadro && cuadro.destino === 'tablas');
  comprobar(
    `y se le dicen sus columnas, para que no corra las celdas (${cuadro?.columnas?.join(' | ') ?? '—'})`,
    (cuadro?.columnas?.length ?? 0) >= 2,
  );

  // Lo que sigue sin recibir contenido: el texto que manda el formato y
  // las opciones, que son una decisión del área usuaria y no un texto
  // que se copie. Se comprueba por clase y no por un id concreto, que es
  // lo que hacía esta prueba antes y se rompió al añadir los cuadros.
  const porClase = new Map<string, string>();
  const recorrer = (secciones: typeof plantilla.secciones) => {
    for (const sec of secciones) {
      for (const b of sec.bloques) {
        if ('id' in b && typeof b.id === 'string') porClase.set(b.id, b.clase);
      }
      recorrer(sec.subsecciones ?? []);
    }
  };
  recorrer(plantilla.secciones);
  const intocables = destinos.filter((d) => ['fijo', 'opcion', 'nota', 'titulo'].includes(porClase.get(d.id) ?? ''));
  comprobar(
    'el texto invariable y las opciones siguen sin ser destino',
    intocables.length === 0,
    intocables.map((d) => `${d.id} (${porClase.get(d.id)})`).join(', '),
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
  if (process.env.VOLCAR) {
    const bruto = (crudo as { asignaciones?: unknown[] }).asignaciones ?? [];
    for (const a of bruto as Array<Record<string, unknown>>) {
      if (String(a.apartado_id).includes('penalidad')) console.log('   CRUDO:', JSON.stringify(a).slice(0, 400));
    }
  }
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

  // El cuadro, que era la observación de César. No basta con que exista
  // la asignación: tiene que traer FILAS con el ancho del formato, o la
  // tabla sale corrida.
  const penalidades = reparto.asignaciones.find((a) => a.apartado_id === 'otras_penalidades');
  const anchoCuadro = destinos.find((d) => d.id === 'otras_penalidades')?.columnas?.length ?? 0;
  console.log(
    `   cuadro de otras penalidades: ${penalidades?.filas?.length ?? 0} fila(s) de ${anchoCuadro} columnas`,
  );
  comprobar('reparte al cuadro de otras penalidades', !!penalidades?.filas?.length);
  comprobar(
    'con las tres penalidades del proyecto',
    (penalidades?.filas?.length ?? 0) >= 3,
    `${penalidades?.filas?.length ?? 0} filas`,
  );
  comprobar(
    'y cada fila con una celda por columna',
    (penalidades?.filas ?? []).every((f) => f.length === anchoCuadro),
  );
  comprobar(
    'las celdas traen lo que decía el proyecto',
    (penalidades?.filas ?? []).some((f) => f.some((c) => /uniforme|identificaci/i.test(c))) &&
      (penalidades?.filas ?? []).some((f) => f.some((c) => /UIT/i.test(c))),
  );

  comprobar('llena los antecedentes', tiene('antecedentes'));
  comprobar('llena el objetivo general', tiene('objetivo_general'));
  comprobar('llena las características técnicas', tiene('caracteristicas_tecnicas'));
  comprobar('llena las actividades', tiene('actividades'));
  // El plazo tiene que sobrevivir, pero no necesariamente dentro del
  // campo de plazo: el formato lo pide en días y el proyecto lo da en
  // meses, así que dejarlo en "no encaja" con la advertencia es mejor
  // criterio que convertir 12 meses en 360 o 365 días por su cuenta.
  // Eso sería decidir por el área usuaria.
  const plazoEnAlgunSitio =
    /12|doce/.test(texto('plazo_servicio') + texto('caracteristicas_tecnicas')) ||
    reparto.sin_ubicar.some((s) => /12|doce/.test(s) && /plazo/i.test(s));
  comprobar('el plazo de doce meses no se pierde', plazoEnAlgunSitio);
  // Lo que importa es que la visita previa del proyecto acabe en el
  // apartado de la visita y con contenido de verdad. Exigir la palabra
  // "visita" dentro del texto comprueba el estilo del modelo, no el
  // reparto: una redacción por "Objeto / Lugar / Oportunidad" es
  // correcta y no la contiene.
  comprobar(
    'coloca la visita en su apartado',
    tiene('visita') && texto('visita').trim().length > 30,
  );
  comprobar(
    'y enciende la sección de la visita, que estaba apagada',
    reparto.condiciones.includes('prevé_visita'),
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
    tablas: { ...respuestas.tablas },
    condiciones: { ...respuestas.condiciones },
  };
  for (const a of reparto.asignaciones) {
    const d = destinos.find((x) => x.id === a.apartado_id)!;
    if (d.destino === 'campos') aplicadas.campos[a.apartado_id] = a.texto;
    else if (d.destino === 'tablas') aplicadas.tablas[a.apartado_id] = a.filas ?? [];
    else aplicadas.redacciones[a.apartado_id] = a.texto;
    for (const c of a.condiciones) aplicadas.condiciones[c] = true;
  }
  const doc = ensamblarRequerimiento(plantilla, aplicadas, { cuantia: 117_600 });
  // Y las filas del cuadro, que es lo nuevo: no basta con repartirlas,
  // tienen que aparecer en el documento que se descarga.
  const filasPenalidad = reparto.asignaciones.find((a) => a.apartado_id === 'otras_penalidades')?.filas ?? [];
  const celdasPerdidas = filasPenalidad
    .flat()
    .filter((c) => c.trim().length > 15)
    .filter((c) => !doc.markdown.includes(c.trim()));
  comprobar(
    'las filas del cuadro salen en el Word',
    filasPenalidad.length > 0 && celdasPerdidas.length === 0,
    celdasPerdidas.slice(0, 2).join(' | '),
  );
  // Se compara línea a línea, no por un trozo del texto: los apartados
  // de lista se emiten con su marca por renglón —"- Barrido y…"— desde
  // que la entidad puede elegir viñetas, literales o números, así que un
  // recorte que cruce un salto de línea ya no coincide nunca.
  const perdidos = reparto.asignaciones.filter((a) =>
    a.texto
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)]|[a-z]{1,2}\))\s+/i, '').trim())
      .filter((l) => l.length > 15)
      .some((l) => !doc.markdown.includes(l)),
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
