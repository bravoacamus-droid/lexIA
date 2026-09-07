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
  /**
   * Como `noDebeDecir`, pero solo en la conclusión.
   *
   * Para preguntas con alternativas: el cuerpo cita cada opción para
   * analizarla —«### B) Ocho días hábiles siguientes al consentimiento»—
   * y buscar ahí la frase equivocada marca como error una respuesta que
   * precisamente la está desmontando. Lo que cuenta es si la da por
   * buena al concluir.
   */
  noDebeDecirEnConclusion?: RegExp[];
  /**
   * Tiene que nombrar el supuesto vecino para separarlo de este.
   *
   * La mitad de los errores medidos venían de contestar el caso de al
   * lado: la firma que falta por el documento que falta, la omisión de
   * unos datos del anexo por el anexo no presentado. Una respuesta que
   * acierta pero calla el lindero deja al lector a un paso de
   * trasladarla al supuesto equivocado, así que se mide aparte.
   *
   * Se busca en el texto entero, no en la conclusión: el contraste se
   * explica en el cuerpo y resumirlo al final sería repetirse.
   */
  debeDistinguir?: RegExp[];
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
      /(?:\bDEC\b|Dependencia Encargada)[^.]{0,220}jurado|jurado[^.]{0,220}(?:\bDEC\b|Dependencia Encargada)/i,
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
      /no\s+(?:corresponde|se debe|debe|es necesario|resulta necesario|procede|cabe|se requiere|hay que)[^.]{0,120}(?:dejar sin efecto|reconform|conformar|crear|designar|nuevo comit)|(?:el )?comit[ée][^.]{0,90}(?:contin[\u00fau]a\b|contin[\u00fau]an\b|contin[\u00fau]e\b|se mantiene|mantiene su|mantenerse|conserva su|sigue a cargo|sigue siendo|vigente|en funciones)|manten(?:er|erse)[^.]{0,60}(?:comit[ée]|evaluadores)|no constituye[^.]{0,90}causal/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'firma-anexo-bonificacion',
    pregunta:
      'Un postor no firmó el Anexo de solicitud de bonificación del 5% por su condición de REMYPE. ¿Es subsanable la omisión de la firma?',
    porque:
      'reportada el 02/09/2026: contestó que NO es subsanable porque «compromete el contenido esencial de la oferta». Sí lo es. El artículo 78.1 permite subsanar una omisión o un error material o FORMAL mientras no se altere el contenido esencial; la firma que falta en un anexo ya presentado es justamente eso. Y la condición de fondo no la prueba el anexo: las Bases Estándar advierten que la entidad verifica el REMYPE en la web del Ministerio de Trabajo. La única regla que declaraba no subsanable una firma —régimen derogado, artículo 60 del DS 344-2018-EF— se refería a la oferta económica, no a los anexos',
    debeDecir: [/subsanable/i],
    debeDecirTodas: [
      // «Sí es subsanable», en cualquiera de sus formas. Incluye
      // ordenar la subsanación —«otorgue al postor un plazo para que
      // subsane»—, que es decir lo mismo sin usar el adjetivo: sin eso
      // se contaban como fallo respuestas correctas.
      /(?:s[íi],?\s+)?(?:es|resulta|constituye|califica como)\s+(?:un |una )?(?:defecto |error |vicio |omisi[óo]n )?subsanable|s[íi] cabe (?:la )?subsanaci|(?<!\bno )(?:otorg|conced|requer|requier|solicit|corresponde|procede)\w*[^.]{0,70}subsan|(?<!\bno )(?:otorg|conced)\w*[^.]{0,80}(?:para que|a fin de)[^.]{0,50}(?:subsan|suscrib|regulariz|firm)/i,
    ],
    noDebeDecir: [
      // La negativa, en sus dos formas: «no es subsanable» y «no
      // corresponde otorgar plazo para subsanar». La primera versión
      // solo veía la primera, y una respuesta equivocada dicha de la
      // segunda manera pasaba las dos comprobaciones.
      /no\s+(?:es|resulta|ser[íi]a|cabe|corresponde|procede)\s+[^.]{0,60}subsan/i,
      // El plazo y el artículo del régimen derogado. Medido el
      // 02/09/2026: dos de cinco respuestas daban «tres (3) días
      // hábiles» y citaban el artículo 60, que son del Reglamento
      // anterior. El vigente es el 78.4 y da dos días, prorrogables
      // por otros dos. Y esa cifra no salía de los fragmentos: en la
      // recuperación medida no aparecía ni una vez, así que la pone el
      // modelo de memoria contra lo que tiene delante.
      /(?:tres|\b3\b)\s*(?:\(\s*3\s*\))?\s*d[ií]as h[áa]biles/i,
      /art[íi]culo 60 del Reglamento/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'anexo-experiencia-no-presentado',
    pregunta:
      'Un postor no presentó el Anexo N° 11 «Experiencia del postor en la especialidad». No es que le falten datos: no lo incluyo en su oferta. ¿Es subsanable esa omisión?',
    porque:
      'reportada por César el 06/09/2026: contestamos bien la pregunta de al lado. Dijimos que la omisión de ALGUNOS DATOS del anexo es subsanable —lo es—, pero lo preguntado era la omisión TOTAL, no haber presentado el anexo. El artículo 78.1 permite subsanar omisiones y errores «de los documentos (...) presentados»; la falta de presentación solo se rescata por el 78.2, y ese numeral alcanza únicamente a los documentos «emitidos por entidades públicas o privados ejerciendo función pública». Un anexo lo emite el propio postor, así que no entra',
    debeDecir: [/subsanable|subsanaci/i],
    debeDecirTodas: [
      // Que concluya que no cabe subsanarlo. «No PUEDE ser reparada
      // mediante subsanación» también es negarlo, y la primera versión
      // lo contaba como fallo.
      /no\s+(?:se\s+)?(?:le\s+)?(?:es|resulta|ser[íi]a|cabe|corresponde|procede|proceder[íi]a|puede|poder|podr[íi]a|amerita|otorga|admite)[^.]{0,90}subsan|no\s+subsanable|insubsanable/i,
    ],
    noDebeDecirEnConclusion: [
      // La conclusión del supuesto vecino, dada como si fuera esta.
      /(?<!no )(?:s[íi],?\s+)?(?:es|resulta|ser[íi]a)\s+subsanable/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'anexo-experiencia-pregunta-ambigua',
    pregunta:
      '¿Es subsanable la omisión del Anexo N° 11 «Experiencia del postor en la especialidad» en una oferta?',
    porque:
      'así es como llega la pregunta de verdad, sin decir de cuál de los dos supuestos se trata, y es donde nos equivocamos: contestamos que sí —cierto para el anexo presentado al que le faltan datos— cuando preguntaban por el anexo no presentado. Con la pregunta ambigua no vale elegir una rama en silencio: hay que nombrar las dos y decir qué distingue una de otra',
    debeDecir: [/subsanable|subsanaci/i],
    debeDistinguir: [
      // La rama del anexo presentado al que le falta algo.
      /incomplet|campos? vac[íi]o|algunos? (?:de los )?datos|(?:una|la) columna|falta(?:n|ba)? (?:alg[úu]n|algunos|datos|campos)|omisi[óo]n parcial|error (?:material|formal)|defecto (?:de )?form|sin firma|no firm|s[íi] (?:se )?present[óo]/i,
      // La rama del anexo que no se presentó.
      /omisi[óo]n total|totalmente omitid|por completo|omiti[óo] incluir|no (?:lo )?(?:present|incluy|adjunt|incorpor)|no fue (?:present|incluid|adjuntad|incorporad)|ausencia (?:total )?del|en absoluto/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'iso-version-anterior',
    pregunta:
      'Las bases integradas exigen el certificado ISO 37001:2025 para el factor de evaluación «integridad en la contratación pública». Un postor presentó un certificado ISO 37001:2016 vigente. ¿Corresponde otorgarle el puntaje?',
    porque:
      'César, 06/09/2026: «hay dos posiciones de las salas de tribunal (...) el hecho de que hay mas resoluciones que dicen que son válidos no significa que la mayoría gana; ante este caso y otros similares en la que hay dos posiciones, la respuesta debería advertir que hay dos posiciones y luego un análisis y una recomendación». Comprobado una a una: a favor las Resoluciones 4323-2026-TCP-S5, 3318-2026-TCP-S6 y 6127-2026-TCP-S1; en contra las 4735-2026-TCP-S4, 4780-2026-TCP-S4 y 1727-2026-TCP-S2. Elegir una en silencio es lo que no vale',
    debeDecir: [/37001/],
    debeDistinguir: [
      // Que diga que el Tribunal está dividido.
      /dos posiciones|posiciones (?:distintas|divergentes|opuestas|encontradas)|criterios? (?:distintos|divergentes|opuestos|discrepantes|divididos|dispares|encontrados)|no (?:existe|hay) (?:un )?criterio (?:uniforme|un[íi]voco|[úu]nico|pac[íi]fico)|salas[^.]{0,80}(?:discrepan|difieren|distinto)|jurisprudencia (?:dividida|no uniforme)|posici[óo]n que (?:s[íi]|no)\b|depende de la posici[óo]n/i,
      // La posición que admite la versión anterior.
      /per[íi]odo de transici[óo]n|periodo de transici[óo]n|conserva aptitud|mantiene(?:n)? (?:su )?validez|coexisten/i,
      // Y la que se atiene a la literalidad de las bases.
      /no corresponde (?:asignar|otorgar|reconocer)[^.]{0,140}(?:2016|versi[óo]n anterior|puntaje)|no (?:se ajusta|satisface|cumple)[^.]{0,90}bases|bases[^.]{0,140}(?:no admiten|exigen expresamente|y no versiones anteriores|reglas definitivas|obligatorio cumplimiento)|literalidad de las bases|estricto cumplimiento de las bases|apartarse de las bases/i,
    ],
    // Sin `debeCitarNorma`: este punto no lo decide un artículo, sino
    // las bases integradas y la jurisprudencia. Exigir la cita de un
    // numeral empujaba a colgar uno decorativo, y nueve de doce
    // respuestas correctas se contaban como fallo por no llevarlo.
  },
  {
    id: 'apelacion-desde-cuando',
    pregunta: `Marca la alternativa correcta. ¿Cuál es el plazo perentorio con el que cuentan los
postores para interponer el recurso de apelación contra el otorgamiento de la buena pro en
licitaciones públicas y concursos públicos?
A) Tres (3) días hábiles contados desde el día siguiente de la notificación de los resultados en la Pladicop.
B) Ocho (8) días hábiles siguientes al consentimiento de la buena pro.
C) Cinco (5) días calendario perentorios.
D) Diez (10) días hábiles improrrogables.`,
    porque:
      'reportada el 02/09/2026. Aquí no hay alternativa correcta y eso es lo que hay que decir: el artículo 304.1 cuenta los ocho días hábiles desde que se NOTIFICA EL OTORGAMIENTO por la Pladicop, y la alternativa B los cuenta desde el CONSENTIMIENTO. No es lo mismo ni puede serlo: el artículo 82.1 dice que el consentimiento se produce al día siguiente de vencido el plazo para apelar, así que contar el plazo desde el consentimiento sería circular. En la captura que mandó César el chat acertaba los ocho días y luego señalaba la alternativa C, que dice cinco días calendario',
    debeDecir: [/(?:ocho|\b8\b)\s*(?:\(\s*8\s*\))?\s*d[ií]as h[áa]biles/i],
    debeDecirTodas: [
      // El punto de partida correcto, que es lo que se discute.
      /notific\w*[^.]{0,90}otorgamiento|otorgamiento[^.]{0,150}Pladicop/i,
    ],
    // Y no dar por bueno el punto de partida de la alternativa B. Solo
    // en la conclusión: el cuerpo cita esa alternativa para desmontarla.
    noDebeDecirEnConclusion: [
      /(?:contad\w*|comput\w*|siguientes)[^.]{0,40}(?:al|del) consentimiento/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'operador-tributario-consorcio',
    pregunta:
      'En una promesa de consorcio para una obra, un consorciado se obligó a ser el «operador tributario» y se suscribió el contrato de consorcio con dicha obligación. Ahora, en ejecución contractual y antes del pago de la primera valorización, ¿se puede cambiar al operador tributario?',
    porque:
      'caso 1 del documento «Respondiendo casos reales» (02/09/2026). El chat contestó que NO se puede cambiar «ni en ningún otro momento de la ejecución contractual»; el otro sistema contestó que sí, y César le da la razón. Sí se puede, y la cadena está verificada: el artículo 89.1 dice que el contrato de consorcio mantiene el contenido respecto a LOS INTEGRANTES, LAS OBLIGACIONES Y EL PORCENTAJE consignados en la promesa, y las Bases Estándar (numeral 2.3.3) congelan exactamente esos tres —literales a), e) y f)—. El operador tributario no está entre ellos: las Bases lo piden aparte, como contenido del contrato de consorcio —«identificar al integrante a quien se efectúa el pago y emite la factura»— y admiten expresamente que ese contrato regule la administración interna. Cambiarlo no incorpora, sustituye ni separa a un integrante, así que cabe por adenda firmada por todos y comunicada a la entidad antes de facturar',
    debeDecir: [/operador tributario|facturaci[óo]n/i],
    debeDecirTodas: [
      /(?:s[íi],?\s+)?(?:es|resulta)\s+(?:jur[íi]dicamente \s*)?(?:posible|viable|procedente)|procede (?:la modificaci|el cambio)|s[íi],?\s+(?:se puede|cabe|procede)/i,
    ],
    // La respuesta equivocada que dio y que reportó César.
    noDebeDecir: [
      /no (?:es|resulta)\s+(?:jur[íi]dicamente \s*)?(?:posible|viable)[^.]{0,60}(?:cambiar|modificar)|no se puede cambiar al operador/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'ampliacion-cuantos-dias',
    pregunta:
      'Cuando un contratista solicita que se amplíe el plazo de su ejecución contractual, ¿qué aspectos debo tener en cuenta y cómo determino si corresponde ampliar dos o tres días, más, menos, o denegarle?',
    porque:
      'caso 3 del documento «Respondiendo casos reales» (02/09/2026). Aquí la respuesta del chat NO era incorrecta: se comprobó contra el artículo 200.1, literal a), y coincide punto por punto —diez días hábiles para notificar la solicitud, detalle de los días de inicio y fin de la causal, cuantificación, riesgos asociados, programa de ejecución actualizado, cuaderno de incidencias como sustento y las extemporáneas por no presentadas—. El caso queda en el banco para que esa respuesta no se pierda, no para arreglarla',
    debeDecir: [/(?:diez|10)\s*(?:\(\s*10\s*\))?\s*d[ií]as h[áa]biles/i],
    debeDecirTodas: [
      // En obras, sin afectación de la ruta crítica no hay ampliación.
      /ruta cr[íi]tica/i,
      // Y el matiz que echaba en falta César: una partida con holgura
      // que no desplaza la fecha final no da derecho a ampliación; solo
      // la da cuando el retraso sobrepasa esa holgura y la partida se
      // vuelve crítica.
      /holgura|no cr[íi]tica se convierta|no toda demora|no todo (?:atraso|retraso)/i,
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
    (['ley', 'directiva', 'criterio_validado'] as const).map(async (tipo) => {
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


/** Lo que devuelve la recuperación, en lo que aquí se mira. */
interface FuenteRecuperada {
  doc_title?: string | null;
  doc_number?: string | null;
  doc_type?: string | null;
  snippet?: string | null;
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

/**
 * Las resoluciones que cita, ¿existen entre las que se le pasaron?
 *
 * Pedirle que nombre la resolución en la que se apoya tiene un riesgo
 * evidente: que se invente el número. Una cita falsa es peor que
 * ninguna, porque parece comprobable y no lo es. Así que se comprueba
 * en todas las preguntas, no solo en las que piden jurisprudencia.
 *
 * Se admite como buena la resolución que aparezca en el título de
 * cualquier fragmento recuperado o DENTRO del texto de alguno: una
 * resolución que cita a otra es una fuente legítima para nombrarla.
 */
function citasInventadas(texto: string, fuentes: FuenteRecuperada[]): string[] {
  const citadas = [...texto.matchAll(/(\d{3,5})\s*-\s*20(\d\d)\s*-\s*TCP/gi)].map(
    (m) => `${String(Number(m[1]))}-20${m[2]}`,
  );
  if (citadas.length === 0) return [];
  const pajar = fuentes.map((f) => `${f.doc_title ?? ''} ${f.doc_number ?? ''} ${f.snippet ?? ''}`).join(' ');
  // Los números vienen con ceros delante de forma irregular —«07784» y
  // «7784» son la misma—, así que se compara sin ellos.
  const enPajar = new Set(
    [...pajar.matchAll(/(\d{3,5})\s*-\s*20(\d\d)/g)].map((m) => `${String(Number(m[1]))}-20${m[2]}`),
  );
  return [...new Set(citadas)].filter((c) => !enPajar.has(c));
}

export function juzgar(
  caso: Caso,
  texto: string,
  fuentes: FuenteRecuperada[] = [],
): Comprobacion[] {
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

  (caso.debeDistinguir ?? []).forEach((r, i) => {
    salida.push({
      clave: `${caso.id}/distingue-${i + 1}`,
      nombre: 'nombra los dos supuestos y los separa',
      ok: r.test(texto),
      detalle: primeraLinea(texto),
    });
  });

  (caso.noDebeDecirEnConclusion ?? []).forEach((mal, i) => {
    salida.push({
      clave: `${caso.id}/no-en-conclusion-${i + 1}`,
      nombre: 'no da por buena la versión equivocada al concluir',
      ok: !mal.test(conclusion),
      detalle: conclusion.slice(0, 190).replace(/\s+/g, ' '),
    });
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

  const inventadas = citasInventadas(texto, fuentes);
  if (fuentes.length > 0 && /\d{3,5}\s*-\s*20\d\d\s*-\s*TCP/i.test(texto)) {
    salida.push({
      clave: `${caso.id}/citas-existen`,
      nombre: 'las resoluciones que cita estaban entre las recuperadas',
      ok: inventadas.length === 0,
      detalle: inventadas.length ? `inventadas: ${inventadas.join(', ')}` : '',
    });
  }

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
