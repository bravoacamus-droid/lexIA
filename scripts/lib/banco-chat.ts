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
import { rewriteToLegalQueries } from '../../src/lib/ai/query-rewrite';

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
    id: 'oferta-supera-cuantia-sie',
    pregunta:
      'Cuando la oferta supera el valor de la cuantía, ¿me puede proporcionar el número de artículo de la Ley 32069 que permite notificar la solicitud de rebaja de la oferta del postor, antes de solicitar la ampliación del presupuesto? Es para una SIE.',
    porque:
      'César, 06/09/2026: la respuesta era correcta «sin embargo, está haciendo referencia a términos con la norma derogada, tales como VALOR REFERENCIAL Y ADJUDICACIONES SIMPLIFICADAS, esos términos no se manejan con la norma actual», y añade que la única negociación prevista en subasta inversa es la del artículo 301. Comprobado: el artículo 132.1 invierte el orden que da por supuesto la pregunta —primero la ampliación presupuestal, y solo si no hay recursos se negocia— y no encaja en SIE, porque parte del «mejor puntaje total» y el artículo 96.3 excluye la evaluación técnica',
    debeDecir: [/132/],
    debeDecirTodas: [
      // La conclusión tiene que negar: el artículo que la pregunta da
      // por supuesto no existe, y el orden es el contrario. El detalle
      // del orden se comprueba sobre el texto entero, más abajo: se
      // explica en el cuerpo y exigirlo en la conclusión daba 1 de 12
      // midiendo dónde estaba escrito, no si era correcto.
      /^[^a-z]{0,80}no\b|\bno,? no (?:existe|puedes|procede|es posible|cabe|corresponde)|no existe (?:dicho|tal|ese|un) art[íi]culo/i,
    ],
    debeDistinguir: [
      // El orden real: la ampliación va primero.
      // «ampliación DEL PRESUPUESTO» y «ampliación presupuestal» son
      // lo mismo, y la respuesta suele expresar el orden negando el
      // que propone la pregunta: «no permite pedir la rebaja ANTES de
      // solicitar la ampliación».
      /(?:primero|previamente|en primer lugar)[^.]{0,110}ampliaci[óo]n[^.]{0,40}presupuest|inverso|no (?:permite|permiten|existe|es posible|cabe|procede|puede)[^.]{0,170}antes de[^.]{0,110}ampliaci|ampliaci[óo]n[^.]{0,40}presupuest[^.]{0,170}(?:y (?:solo|s[óo]lo)|luego|despu[ée]s|si no)/i,
      // Que diga que en subasta inversa esto no aplica, y por qué.
      /(?:subasta inversa|SIE)[^.]{0,220}(?:no (?:se aplica|aplica|es aplicable|resulta|procede|corresponde|cabe|hay)|ni [^.]{0,40}est[áa] (?:permitid|previst)|ni (?:procede|cabe|aplica)|excluid|proh[íi]b|solo|[úu]nica)|(?:no (?:se aplica|aplica|es aplicable|resulta aplicable|procede|corresponde|cabe)|ni [^.]{0,40}est[áa] (?:permitid|previst)|ni (?:est[áa] permitid|procede|cabe)|excluid|proh[íi]b|menos a[úu]n)[^.]{0,190}(?:subasta inversa|SIE)/i,
      // El fundamento expreso de la exclusión: el 132.7 la dice con
      // todas las letras, y es mejor cita que deducirla del 96.
      /132\.7/,
      // Que quede claro que ahí no cabe negociar. Se admite tanto
      // decirlo como nombrar el artículo 301, que es el único
      // supuesto en que la subasta inversa sí admite negociación
      // —farmacéuticos con ficha técnica y oferta única—. Exigir el
      // 301 a secas penalizaba respuestas completas: la pregunta no
      // es de ese supuesto, así que citarlo es una digresión.
      /\b301\b|no (?:cabe|existe|hay|procede|corresponde)[^.]{0,90}negociaci[óo]n|negociaci[óo]n[^.]{0,90}no (?:cabe|procede|es aplicable|resulta aplicable)/i,
    ],
    noDebeDecir: [
      // El vocabulario del régimen derogado, que es lo que reportó César.
      /valor referencial/i,
      /adjudicaci[óo]n(?:es)? simplificada/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'area-usuaria-valida-cotizaciones',
    pregunta:
      'Buenos días. ¿Es válido que la DEC solicite al área usuaria la validación de cotizaciones para la contratación de un servicio?',
    porque:
      'César, 06/09/2026: «respondió de manera intermedio. La DEC puede (no debe) solicitar al área usuaria que corrobore si la información técnica de las cotizaciones cumple con los términos de referencia. Sin embargo, la norma no establece que el área usuaria deba validar integralmente las cotizaciones. Su participación se limita a la coordinación o revisión técnica, mientras que la responsabilidad de la interacción con el mercado continúa a cargo de la DEC». Comprobado: el artículo 127.1 del Reglamento pone la interacción en manos de la DEC y la Opinión N° 069-2023/DTN, conclusión 3.2, admite la coordinación con el área usuaria para «corroborar» la información recibida por cotizaciones',
    debeDecir: [/corrobor|coordinaci[óo]n|coordinar/i],
    debeDecirTodas: [
      // Que conteste que sí se puede pedir.
      /s[íi][,.]?\s|es v[áa]lido|resulta v[áa]lido|s[íi] (?:es|resulta|puede|corresponde|cabe)/i,
    ],
    debeDistinguir: [
      // Que sea una facultad, no un deber del área usuaria.
      /puede[^.]{0,140}(?:solicitar|pedir|coordinar|corrobor|requerir)|no (?:est[áa] obligad|es obligatori|existe (?:la )?obligaci|impone)/i,
      // Y que la responsabilidad no se mueva de la DEC.
      /(?:responsabilidad|responsable|a cargo|conduce|corresponde)[^.]{0,120}\bDEC\b|\bDEC\b[^.]{0,140}(?:responsable|a cargo|conduce|mantiene|no se traslada|sigue siendo)/i,
    ],
    noDebeDecir: [
      // Convertir la coordinación en un deber del área usuaria.
      /[áa]rea usuaria[^.]{0,80}(?:debe|deber[áa]|est[áa] obligada a)\s+validar/i,
    ],
    debeCitarNorma: true,
  },
  // Las preguntas de examen que mandó César el 06/09/2026, con su clave
  // marcada en rojo en el documento. Cada una comprobada contra el
  // artículo que él mismo cita como sustento.
  {
    id: 'q-alto-riesgo-servicios',
    pregunta:
      'Marca la alternativa correcta. Una contratación de servicios se clasifica como de alto riesgo si el promedio de postores en los dos años previos es igual o menor a...\na) 1\nb) 2\nc) 3\nd) 4',
    porque:
      'clave de César: b) 2. El artículo 125.3.ii, modificado por el DS N° 001-2026-EF, distingue: «menor o igual a tres en el caso de bienes, o igual o menor a dos en el caso de servicios». El error natural es dar el umbral de bienes',
    debeDecir: [/\b(?:dos|2)\b/],
    // Vale el número o la letra: la conclusión suele decir «la
    // alternativa correcta es la b)» sin repetir la cifra, y eso
    // se contaba como fallo.
    debeDecirTodas: [
      /\b(?:dos|2)\b|alternativa (?:correcta )?(?:es (?:la )?)?\*{0,2}b\*{0,2}(?:\)|\b)|(?:la|opci[óo]n) \*{0,2}b\*{0,2}\b/i,
    ],
    noDebeDecirEnConclusion: [
      /(?:igual o )?menor a (?:tres|3)[^.]{0,50}servicio|servicio[^.]{0,60}(?:igual o )?menor a (?:tres|3)|alternativa (?:correcta )?(?:es (?:la )?)?c\)/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'q-alto-riesgo-caso',
    pregunta:
      'Marca la alternativa correcta. Una entidad planea contratar un servicio especializado en monitoreo satelital en zonas rurales. En los últimos dos años, procesos similares contaron con un promedio de tres postores. ¿Puede considerarse de alto riesgo por ese criterio?\na) No, porque el promedio supera los límites establecidos.\nb) Sí, porque se trata de un servicio y el límite es de tres postores.\nc) No, porque se trata de un servicio y el límite es de dos postores.\nd) Sí, por tratarse de una tecnología especializada.',
    porque:
      'clave de César: c). No basta con decir «no»: hay que decir por qué, y el porqué es que en servicios el umbral son dos postores. La alternativa a) también dice «no», pero sin dar el umbral, y el chat la eligió en la primera prueba pese a razonar bien',
    debeDecir: [/125\.3|alto riesgo/i],
    debeDecirTodas: [
      /\bno\b/i,
      /(?:dos|2)\s*(?:\(\s*2\s*\))?\s*postores|l[íi]mite[^.]{0,40}(?:dos|2)|igual o menor a (?:dos|2)/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'q-mda-sin-interaccion',
    pregunta:
      'Marca la alternativa correcta. ¿En qué proceso de contratación no se realiza interacción con el mercado?\na) Licitación Pública con MDA\nb) Compra Pública de Innovación\nc) Concurso Público con diálogo competitivo\nd) Ninguno de los anteriores',
    porque:
      'clave de César: a). El artículo 295.1 dice que en el proceso mediante MDA son aplicables las disposiciones de las actuaciones preparatorias «con excepción de la segmentación de contrataciones y la interacción con el mercado». En la primera prueba el chat contestó que no encontraba una exclusión expresa: el artículo no le llegaba',
    debeDecir: [/MDA|295\.1/i],
    debeDecirTodas: [/\bMDA\b|alternativa (?:correcta )?(?:es (?:la )?)?a\)/i],
    noDebeDecirEnConclusion: [
      /no (?:aparece|se advierte|figura|hay)[^.]{0,90}(?:exclusi[óo]n|disposici[óo]n|regla)|no (?:puedo|es posible) (?:determinar|precisar)/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'q-incentivo-supervision',
    pregunta:
      'Marca la alternativa correcta. ¿Cuál es el monto máximo que puede otorgarse por el incentivo de respuesta rápida de la supervisión?\na) Hasta el 3% del monto del contrato original.\nb) Hasta el 3% del monto del contrato vigente.\nc) Un monto fijo calculado según el porcentaje de avance físico.\nd) Hasta el 3% del monto acumulado de valorizaciones.',
    porque:
      'el artículo 162, literal c), dice «una bonificación equivalente hasta el 3% del monto del contrato ORIGINAL», y no lleva nota de modificatoria. La clave del documento marca la b) —contrato vigente—; aquí manda la norma, y por eso el caso se guarda con la cita delante',
    debeDecir: [/3\s*%/],
    debeDecirTodas: [/original/i],
    noDebeDecirEnConclusion: [/contrato vigente/i],
    debeCitarNorma: true,
  },
  {
    id: 'q-incentivo-ambiental',
    pregunta:
      'Respecto al incentivo vinculado a estándares de excelencia ambiental y de seguridad del artículo 162 del Reglamento, identifique la alternativa INCORRECTA:\na) Se aplica a componentes del proyecto de obra vinculados a las fases de formulación, elaboración del expediente técnico, operación y mantenimiento.\nb) Otorga una bonificación de hasta el 1% del monto del contrato original.\nc) Exige establecer indicadores iniciales en el contrato.\nd) Cuando se establece en la estrategia de contratación, no se incluye como factor de evaluación la sostenibilidad ambiental.',
    porque:
      'clave de César: a). El literal b) del artículo 162 dice que ese incentivo «aplica únicamente para componentes de ejecución de obra», así que extenderlo a la formulación, al expediente técnico o al mantenimiento es lo incorrecto. Las otras tres alternativas salen del mismo literal',
    debeDecir: [/162|ejecuci[óo]n de obra/i],
    debeDecirTodas: [/alternativa (?:incorrecta |correcta )?(?:es (?:la )?)?\*{0,2}a\*{0,2}(?:\)|\b)|literal a\)|(?:la|opci[óo]n) \*{0,2}a\*{0,2}\b/i],
    debeDistinguir: [
      /[úu]nicamente[^.]{0,80}(?:componentes de )?ejecuci[óo]n de obra|solo[^.]{0,70}ejecuci[óo]n de obra/i,
    ],
    debeCitarNorma: true,
  },
  {
    id: 'q-llave-en-mano',
    pregunta:
      'Marca la alternativa correcta. En la adquisición de mobiliario para 15 colegios se propone el sistema de entrega llave en mano. ¿Es adecuado para esta contratación?\na) Sí, si se entrega el mobiliario completamente instalado y en funcionamiento\nb) No, porque llave en mano aplica solo a bienes con instalación compleja o proyectos integrales\nc) Sí, si el valor supera 50 UIT\nd) No, si la entidad no tiene supervisor',
    porque:
      'clave de César: a). El artículo 129, literal a), dice que llave en mano «aplica para la adquisición de bienes cuando el postor oferta adicionalmente su instalación y puesta en funcionamiento». No exige complejidad ninguna, así que la b) añade un requisito que la norma no pone. En la primera prueba el chat eligió justamente la b)',
    debeDecir: [/129|llave en mano/i],
    // Vale tanto el «sí» como señalar la alternativa: desde que el
    // criterio entró en la biblioteca, la conclusión suele ir
    // directa a la letra sin la palabra suelta.
    debeDecirTodas: [
      /\bs[íi]\b|alternativa (?:correcta )?(?:es (?:la )?)?\*{0,2}a\*{0,2}(?:\)|\b)|(?:la|opci[óo]n) \*{0,2}a\*{0,2}\b|es adecuado|resulta adecuado/i,
    ],
    noDebeDecirEnConclusion: [
      /instalaci[óo]n compleja|proyectos integrales|alternativa (?:correcta )?(?:es (?:la )?)?\*{0,2}b\)/i,
    ],
    debeDistinguir: [/puesta en funcionamiento/i],
    debeCitarNorma: true,
  },
  {
    id: 'q-necesidad-en-cmn',
    pregunta:
      'Marca la alternativa correcta. Una entidad necesita contratar vigilancia para una nueva sede que no estaba prevista en su programación. Convoca el procedimiento y recién después la registra. ¿Es conforme al Reglamento?\na) Sí, si el contrato se perfecciona luego de la modificación\nb) Sí, si se justifica como necesidad urgente\nc) No, salvo que la DGA lo autorice\nd) No, porque la necesidad debe estar previamente registrada',
    porque:
      'clave de César: d). El artículo 54.3 dice que «para aprobar un expediente de contratación la necesidad debe encontrarse prevista en el CMN aprobado del año fiscal correspondiente o su modificatoria». En la primera prueba el chat contestó que SÍ era conforme, que es el error de fondo',
    debeDecir: [/54\.3|CMN|cuadro multianual/i],
    debeDecirTodas: [/\bno\b/i],
    noDebeDecirEnConclusion: [
      /\bs[íi],? (?:el procedimiento )?(?:es|resulta|ser[íi]a) conforme|s[íi] es v[áa]lido|no (?:constituye|configura) (?:una )?vulneraci/i,
    ],
    debeDistinguir: [/CMN|cuadro multianual de necesidades/i],
    debeCitarNorma: true,
  },
  {
    id: 'q-clausulas-obligatorias',
    pregunta:
      'Marca la alternativa correcta. ¿Qué cláusulas deben incluirse obligatoriamente, bajo responsabilidad, en los contratos regulados por la Ley N° 32069?\na) Confidencialidad, penalidades y reajuste de precios.\nb) Garantías, anticorrupción y antisoborno, y solución de controversias.\nc) Subcontratación, cesión de posición contractual y adelantos.\nd) Impacto ambiental, responsabilidad social y seguros.',
    porque:
      'clave de César: b). El artículo 60 de la Ley enumera cinco cláusulas: garantías, anticorrupción y antisoborno, solución de controversias, resolución de contrato por incumplimiento y gestión de riesgos. En la primera prueba el chat no llegó a señalar ninguna alternativa: se quedó en la recomendación',
    debeDecir: [/anticorrupci[óo]n/i],
    debeDecirTodas: [
      /alternativa (?:correcta )?(?:es (?:la )?)?\*{0,2}b\*{0,2}(?:\)|\b)|(?:la|opci[óo]n) \*{0,2}b\*{0,2}\b|garant[íi]as[^.]{0,140}(?:anticorrupci|antisoborno)/i,
    ],
    debeDistinguir: [
      /resoluci[óo]n (?:de|del) contrato por incumplimiento/i,
      /gesti[óo]n de riesgos/i,
    ],
    debeCitarNorma: true,
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
  /** La da hybrid_search; hace falta para ordenar el ancla. */
  similarity?: number;
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
/**
 * Cuántos fragmentos trae cada frase reescrita.
 *
 * Medido el 07/09/2026: con la reescritura «inclusión obligatoria de la
 * contratación en el plan anual antes de convocar», el artículo 54.3
 * —el que resuelve la pregunta— sale en el PUESTO 4 de su propia
 * búsqueda. Traer solo el primero no lo alcanzaba.
 */
const ANCLAS_POR_FRASE = 3;

/**
 * Cuántas anclas se conservan en total.
 *
 * Es un equilibrio medido, no un número redondo. Con seis, la
 * pregunta por el plazo de ampliación en obras —que acertaba
 * siempre— pasó a contestar «en los fragmentos disponibles no
 * aparece el plazo» cuatro de doce veces: los fragmentos extra
 * reparten la atención. Con dos, la pregunta por el registro previo
 * de la necesidad perdía el artículo 54.3 y caía del 92 % al 33 %.
 */
const TOPE_ANCLAS = 4;

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

  // ANCLA NORMATIVA — igual que en la ruta. La pregunta habla del caso
  // y el artículo habla de la institución jurídica, así que se busca
  // también con la traducción jurídica de la pregunta y se trae UNA
  // pieza por frase. Sin esto el banco mediría una recuperación que no
  // es la de la aplicación.
  const frases = await rewriteToLegalQueries(pregunta);
  if (frases.length > 0) {
    const puestas = new Set(fuentes.map((f) => f.chunk_id));
    const anclas: ChatSource[] = [];
    for (const frase of frases) {
      const e = await embedOne(frase, 'RETRIEVAL_QUERY');
      const porTipo = await Promise.all(
        (['ley', 'reglamento'] as const).map(async (tipo) => {
          const { data: d } = await admin.rpc('hybrid_search', {
            query_text: frase,
            query_embedding: e,
            match_count: ANCLAS_POR_FRASE * 2,
            filter_type: tipo,
          });
          return (d ?? []) as Fragmento[];
        }),
      );
      const ordenadas = porTipo
        .flat()
        .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      // Si lo mejor que encuentra la traducción jurídica YA está en el
      // pool, la recuperación normal acertó y el ancla solo añadiría
      // ruido. Es lo que distingue las dos preguntas que se midieron:
      // «¿en qué plazo se solicita la ampliación en obras?» ya viene en
      // lenguaje de la norma y trae el artículo 200 sola —anclarla la
      // empeoraba—; «una entidad contrata vigilancia para una sede no
      // prevista y la registra después» es narrativa y sin ancla nunca
      // ve el artículo 54.3.
      if (ordenadas.length === 0 || puestas.has(ordenadas[0].chunk_id)) continue;
      const candidatas = ordenadas
        .filter((c) => !puestas.has(c.chunk_id) && (puestas.add(c.chunk_id), true))
        .slice(0, ANCLAS_POR_FRASE);
      anclas.push(...candidatas.map(aFuente));
    }
    // Solo las dos mejores, como en la ruta: garantizar seis echaba
    // fuera artículos que el pool ya traía bien.
    const mejores = anclas.slice(0, TOPE_ANCLAS);
    if (mejores.length > 0) fuentes = [...mejores, ...fuentes];
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
