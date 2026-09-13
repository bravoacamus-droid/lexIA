/**
 * La entrevista: de lo que el área usuaria cuenta, a los interruptores.
 *
 * POR QUÉ EXISTE
 *
 * César, setiembre de 2026, trasladando lo que le dijeron sus colegas:
 * la estructura por objeto de contratación les parece correcta, «pero
 * llenar uno a uno es un poco tedioso y genera mayor tiempo». Es
 * literal: en Bienes en General el formulario tiene 79 apartados, 34
 * interruptores, 35 textos y 33 campos. Entre sesenta y ciento diez
 * decisiones, y la mayoría no son decisiones de verdad —nadie duda de
 * si un suministro de avena necesita rotulado— sino trabajo mecánico.
 *
 * Lo que se ataca aquí son los interruptores, que son los que más
 * cuestan: deciden qué apartados existen, hay que recorrerlos todos
 * antes de escribir nada, y equivocarse en uno deja el documento sin
 * una cláusula o con una que sobra.
 *
 * QUÉ HACE Y QUÉ NO
 *
 * Lee un relato de la necesidad —dos líneas o dos páginas— y decide,
 * para cada interruptor de ESA plantilla, si corresponde, no
 * corresponde, o no puede saberse. Lo que no puede saberse se queda
 * apagado y sale como pregunta: apagar de más cuesta un clic, encender
 * de más mete una exigencia que nadie pidió y que restringe la
 * competencia.
 *
 * No redacta. El texto de cada apartado sigue saliendo del redactor,
 * con su método, o de la mano del área usuaria.
 *
 * NO HAY ÁRBOLES POR TIPO DE BIEN
 *
 * La propuesta que llegó sugería árboles de decisión por naturaleza del
 * objeto —uno para alimentos, otro para vehículos, otro para
 * medicamentos—. No se hace así: los interruptores y sus apartados ya
 * están en la plantilla, con sus títulos, y se le dan al modelo tal
 * como son. Un árbol escrito a mano habría que mantenerlo para las
 * quince plantillas y se quedaría viejo a la primera observación de
 * César; esto se adapta solo cuando la plantilla cambia.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { condicionesPorApartado } from './indice';
import type { PlantillaRequerimiento } from './plantilla-tipos';

/** Qué decidió LexIA sobre un interruptor, y por qué. */
export interface DecisionCondicion {
  id: string;
  /** El apartado que gobierna, para poder enseñárselo al usuario. */
  titulo: string;
  estado: 'corresponde' | 'no_corresponde' | 'no_se_sabe';
  /** Una frase. Va a la pantalla: el usuario tiene que poder discutirla. */
  razon: string;
}

export interface ResultadoEntrevista {
  decisiones: DecisionCondicion[];
  /** Lo que hay que preguntarle al área usuaria para cerrar lo dudoso. */
  preguntas: string[];
  /** Los interruptores que quedan encendidos, listos para `respuestas.condiciones`. */
  condiciones: Record<string, boolean>;
}

/**
 * Lo que no se deduce de la necesidad, por mucho que se cuente.
 *
 * Estos apartados no dependen de qué se contrata sino de una decisión
 * de la Entidad —o de un documento que existe o no existe en el
 * expediente—. La primera prueba en pantalla lo enseñó: de un relato
 * sobre un grupo electrógeno, LexIA apagó confidencialidad, propiedad
 * intelectual y seguridad de la información. Ninguna de las tres se
 * sigue de comprar un generador; son política de la Entidad, y
 * apagarlas por su cuenta le quita al documento una cláusula que quizá
 * la Entidad pone siempre.
 *
 * No se le pasan al modelo: se devuelven como pregunta. Una regla en el
 * texto del sistema se puede desobedecer; esto no.
 */
const INSTITUCIONALES: Record<string, string> = {
  aplica_mype: '¿La contratación se sujeta al régimen de micro y pequeña empresa?',
  adelanto_directo: '¿La Entidad otorgará adelanto directo? ¿En qué porcentaje?',
  otorga_adelanto: '¿La Entidad otorgará adelanto directo? ¿En qué porcentaje?',
  adelanto_avance: '¿La Entidad otorgará adelanto por avance?',
  adelanto_materiales: '¿La Entidad otorgará adelanto para materiales, equipamiento o mobiliario?',
  permite_pago_anticipado: '¿Se pagará por adelantado alguna parte de la prestación?',
  reserva_prestaciones_esenciales: '¿Hay prestaciones que el contratista no podrá subcontratar?',
  exige_consorcio: '¿Se exigirá algo particular a los postores que se presenten en consorcio?',
  exige_requisitos_consorcio: '¿Se exigirá algo particular a los postores que se presenten en consorcio?',
  aplica_confidencialidad: '¿La Entidad exige cláusula de confidencialidad en esta contratación?',
  aplica_incumplimiento_confidencialidad:
    '¿Se penaliza el incumplimiento del deber de confidencialidad?',
  aplica_propiedad_intelectual: '¿Los productos de la contratación quedan en propiedad de la Entidad?',
  aplica_seguridad_informacion: '¿El contratista tendrá acceso a sistemas o información de la Entidad?',
  tiene_compatibilizacion: '¿El requerimiento cuenta ya con el documento de compatibilización?',
};

/**
 * Lo que se le enseña al usuario junto al interruptor.
 *
 * La pregunta va aquí y no en la lista de preguntas: allí salían las
 * nueve institucionales siempre iguales, repitiendo lo que ya decía la
 * lista de dudas y dejando fuera, por el tope, las tres que sí eran de
 * este caso. Junto a su interruptor, en cambio, se contesta con un clic.
 */
const razonInstitucional = (id: string) => `Lo decide la Entidad. ${INSTITUCIONALES[id]}`;

const SISTEMA = `Eres LexIA, y estás ayudando a un área usuaria de una entidad pública peruana a formular su requerimiento bajo la Ley N° 32069 y su Reglamento.

Te dan el relato de una necesidad y la lista de los apartados OPCIONALES del formato oficial que corresponde a esa contratación. Tu trabajo es decidir, para cada uno, si corresponde incluirlo.

CÓMO DECIDIR
- CORRESPONDE: el relato, o la naturaleza evidente de lo que se contrata, lo exige. Un alimento envasado necesita rotulado; un equipo que se instala necesita puesta en funcionamiento.
- NO CORRESPONDE: la naturaleza de lo que se contrata lo excluye. Un servicio de traducción no necesita envase; un bien que se entrega en almacén no necesita visita al lugar de la prestación.
- NO SE SABE: hace falta un dato que el relato no da y que no se deduce. No adivines.

REGLAS QUE NO PUEDES ROMPER
- Ante la duda, NO SE SABE. Apagar de más le cuesta al usuario un clic; encender de más mete en el documento una exigencia que nadie pidió, y toda exigencia de más restringe la competencia.
- Pero NO SE SABE tampoco es gratis: cada uno que dejes sin decidir se lo devuelves al área usuaria, que es justo de lo que se queja. Úsalo solo cuando falte un DATO CONCRETO que puedas nombrar en una pregunta. Si el dato que falta no lo sabes nombrar, entonces no te falta: decide.
- Lo que la naturaleza del objeto resuelve, resuélvelo. Que unos útiles de escritorio no necesitan seguros, condiciones de operación ni visita al lugar no es una duda: es un no.
- La lista que te dan ya viene limpia de decisiones de política de la Entidad (adelantos, pago anticipado, régimen MYPE, consorcio, confidencialidad): esas se preguntan aparte y no tienes que pronunciarte sobre ellas. Sobre lo que sí te dan, decide por la naturaleza de lo que se contrata.
- Decide por la naturaleza de lo que se contrata, no porque el apartado exista.
- La razón es UNA frase, concreta y referida a ESTE caso. Nada de "podría corresponder según la naturaleza": eso no es una razón.
- No inventes datos del relato. Si dices que corresponde mantenimiento, que sea porque el relato habla de un equipo que lo necesita, no porque los equipos suelen tenerlo.

Devuelve EXCLUSIVAMENTE este JSON, sin markdown:

{
  "decisiones": [{ "id": "identificador_tal_cual", "estado": "corresponde" | "no_corresponde" | "no_se_sabe", "razon": "una frase" }],
  "preguntas": ["la pregunta mínima que resolvería cada NO SE SABE, en el lenguaje del área usuaria"]
}`;

/** El relato que se le pide al área usuaria para arrancar. */
export const PREGUNTA_DE_ARRANQUE =
  'Cuénteme qué necesita la Entidad: qué va a contratar, para qué lo necesita, quién lo va a usar y dónde. Con dos o tres líneas basta para empezar.';

export async function interpretarNecesidad(
  plantilla: PlantillaRequerimiento,
  relato: string,
): Promise<ResultadoEntrevista> {
  const grupos = condicionesPorApartado(plantilla.secciones);
  const catalogo = grupos.flatMap((g) =>
    g.condiciones.map((c) => ({ id: c.id, titulo: c.titulo, apartado: g.titulo })),
  );
  if (catalogo.length === 0) {
    return { decisiones: [], preguntas: [], condiciones: {} };
  }

  // Los institucionales no entran en la lista que ve el modelo.
  const decidibles = catalogo.filter((c) => !(c.id in INSTITUCIONALES));
  const lista = decidibles
    .map((c) => `- ${c.id} → "${c.titulo}" (dentro de ${c.apartado})`)
    .join('\n');

  const prompt = `FORMATO: ${plantilla.subtitulo}

APARTADOS OPCIONALES DE ESTE FORMATO (decide sobre TODOS, uno por uno):
${lista}

LO QUE CUENTA EL ÁREA USUARIA:
"""
${relato.trim().slice(0, 6000)}
"""

Devuelve ahora el JSON.`;

  // Se reintenta si la respuesta no sirve. Una respuesta rota dejaba los
  // treinta y cuatro interruptores en "no se sabe", que para el usuario
  // es indistinguible de que LexIA fuera prudente.
  let mejor: ResultadoEntrevista = { decisiones: [], preguntas: [], condiciones: {} };
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const { text } = await generateText({
        model: chatModel,
        system: SISTEMA,
        prompt,
        temperature: 0.2,
        // Treinta y cuatro decisiones con su razón no caben en la
        // respuesta por defecto: se cortaba a media frase y había que
        // repetir la llamada entera.
        maxTokens: 8192,
      });
      const { resultado: r, legible } = depurar(text, catalogo);
      const decididos = r.decisiones.filter((d) => d.estado !== 'no_se_sabe').length;
      if (decididos > mejor.decisiones.filter((d) => d.estado !== 'no_se_sabe').length) mejor = r;
      // La mitad decidida ya es una respuesta útil; por debajo, se
      // reintenta antes de devolverle el trabajo al usuario.
      // Se reintenta cuando la respuesta viene ROTA, no cuando viene
      // prudente. Exigir la mitad de los decidibles dejaba la pantalla
      // diecisiete segundos pensando para acabar devolviendo la primera
      // respuesta, que decidía doce de veinticinco y era buena. Lo que
      // no vale es un JSON ilegible o un puñado suelto de decisiones.
      if (legible && decididos >= decidibles.length / 3) return r;
    } catch (e) {
      console.error('[entrevista] intento ' + intento + ' falló', (e as Error).message.slice(0, 90));
    }
  }
  return mejor.decisiones.length > 0
    ? mejor
    : { decisiones: [...porDefecto(catalogo)], preguntas: [], condiciones: {} };
}

/** Todo sin decidir: lo que se devuelve si el modelo no responde nunca. */
function porDefecto(catalogo: Array<{ id: string; titulo: string }>): DecisionCondicion[] {
  return catalogo.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    estado: 'no_se_sabe' as const,
    razon: 'LexIA no pudo pronunciarse; decídelo tú.',
  }));
}

/**
 * Filtra lo que devuelve el modelo.
 *
 * Un interruptor que el modelo no mencionó NO se enciende: se queda como
 * "no se sabe". Y uno que se inventó se descarta, porque encender algo
 * que la plantilla no tiene deja una condición huérfana que el
 * formulario no sabe pintar.
 */
function depurar(
  crudo: string,
  catalogo: Array<{ id: string; titulo: string; apartado: string }>,
): { resultado: ResultadoEntrevista; legible: boolean } {
  let datos: { decisiones?: unknown; preguntas?: unknown } = {};
  let legible = true;
  try {
    datos = JSON.parse(crudo.replace(/^```json\s*|\s*```$/g, '').trim());
  } catch (e) {
    legible = false;
    // Sin esto, un JSON roto se disfrazaba de "no se sabe" en los
    // treinta y cuatro interruptores y parecía prudencia del modelo.
    console.error('[entrevista] JSON ilegible', {
      error: (e as Error).message.slice(0, 90),
      caracteres: crudo.length,
      final: crudo.slice(-120),
    });
  }

  const porId = new Map<string, DecisionCondicion>();
  for (const c of catalogo) {
    porId.set(c.id, {
      id: c.id,
      titulo: c.titulo,
      estado: 'no_se_sabe',
      razon:
        c.id in INSTITUCIONALES
          ? razonInstitucional(c.id)
          : 'LexIA no se pronunció sobre este apartado.',
    });
  }

  for (const bruto of Array.isArray(datos.decisiones) ? datos.decisiones : []) {
    const d = bruto as Record<string, unknown>;
    const id = String(d.id ?? '').trim();
    // Si el modelo se pronuncia sobre uno institucional —no se lo hemos
    // dado, pero podría deducirlo del nombre de otro— no se le hace caso.
    if (id in INSTITUCIONALES) continue;
    const yaEsta = porId.get(id);
    if (!yaEsta) continue;
    const estado = String(d.estado ?? '').trim();
    if (estado !== 'corresponde' && estado !== 'no_corresponde' && estado !== 'no_se_sabe') continue;
    const razon = String(d.razon ?? '').trim();
    porId.set(id, { ...yaEsta, estado, razon: razon || yaEsta.razon });
  }

  const decisiones = [...porId.values()];
  const condiciones: Record<string, boolean> = {};
  for (const d of decisiones) condiciones[d.id] = d.estado === 'corresponde';

  // Solo las de ESTE caso: las institucionales viajan como razón del
  // interruptor que las necesita.
  const preguntas = [
    ...new Set(
      (Array.isArray(datos.preguntas) ? datos.preguntas : [])
        .map((p) => String(p).trim())
        .filter((p) => p.length > 10),
    ),
  ].slice(0, 8);

  return { resultado: { decisiones, preguntas, condiciones }, legible };
}
