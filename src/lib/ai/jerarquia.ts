/**
 * Jerarquía normativa: qué manda sobre qué.
 *
 * POR QUÉ EXISTE
 *
 * César preguntó el 21/08/2026 por las condiciones para aprobar una
 * ampliación de plazo y el chat respondió "siete (7) días hábiles". El
 * Reglamento vigente dice diez, en el numeral 142.3. Los siete salían de
 * una Opinión escrita bajo la norma anterior. En otra pregunta sobre
 * plazos respondió quince días donde el artículo 200 dice diez.
 *
 * El fallo no es de recuperación: los dos documentos estaban. Es que
 * todas las fuentes pesaban igual, así que una interpretación pudo más
 * que la norma que interpreta.
 *
 * LAS TRES CAPAS
 *
 * Las definió César y son las de la práctica peruana:
 *
 *   1. Normativa obligatoria: Ley, Reglamento, directivas y normas de
 *      carácter general, bases estándar y bases integradas.
 *   2. Jurisprudencia y criterios de aplicación: precedentes de
 *      observancia obligatoria, acuerdos de Sala Plena, resoluciones del
 *      Tribunal, pronunciamientos y opiniones. Interpretan la capa 1.
 *   3. Orientación y comunicación: lineamientos no normativos,
 *      comunicados, avisos, notas informativas, guías, manuales,
 *      preguntas frecuentes y material de orientación.
 *
 * Y la regla que las ata, en sus palabras: "ningún criterio
 * interpretativo, opinión, pronunciamiento, comunicado, informe,
 * lineamiento o resolución puede ser utilizado para contradecir una
 * norma de superior jerarquía".
 */

export type Capa = 1 | 2 | 3;

interface Rango {
  capa: Capa;
  /** Posición dentro de su capa; menor es más fuerte. */
  orden: number;
  etiqueta: string;
}

/**
 * Tipo de documento de la biblioteca → su lugar en la jerarquía.
 *
 * Los tipos que no figuran caen en la capa 3: ante la duda, un documento
 * sin clasificar orienta, no obliga.
 */
const RANGOS: Record<string, Rango> = {
  // ── Capa 1: obliga ────────────────────────────────────────────────
  ley: { capa: 1, orden: 1, etiqueta: 'Ley' },
  reglamento: { capa: 1, orden: 2, etiqueta: 'Reglamento' },
  directiva: { capa: 1, orden: 3, etiqueta: 'Directiva' },
  codigo_etica: { capa: 1, orden: 3, etiqueta: 'Código de Ética' },
  bases_estandar: { capa: 1, orden: 4, etiqueta: 'Bases estándar' },
  bases_integradas: { capa: 1, orden: 5, etiqueta: 'Bases integradas' },

  // ── Capa 2: interpreta ────────────────────────────────────────────
  precedente: { capa: 2, orden: 1, etiqueta: 'Precedente de observancia obligatoria' },
  acuerdo_sala_plena: { capa: 2, orden: 2, etiqueta: 'Acuerdo de Sala Plena' },
  resolucion_tce: { capa: 2, orden: 3, etiqueta: 'Resolución del Tribunal' },
  resolucion: { capa: 2, orden: 3, etiqueta: 'Resolución' },
  pronunciamiento: { capa: 2, orden: 4, etiqueta: 'Pronunciamiento' },
  opinion: { capa: 2, orden: 5, etiqueta: 'Opinión' },
  /**
   * Los casos que ya resolvimos y comprobamos contra la norma.
   *
   * Van los últimos de la capa que interpreta: no obligan a nadie, así
   * que no pueden citarse por delante del artículo que los sostiene.
   * Pero van en esta capa y no en la que orienta porque su oficio es
   * justamente salir: existen para que una pregunta que había que
   * deducir se pueda buscar.
   */
  criterio_validado: {
    capa: 2,
    orden: 6,
    etiqueta: 'Criterio ya resuelto y verificado (no sustituye a la norma que cita)',
  },

  // ── Capa 3: orienta ───────────────────────────────────────────────
  lineamiento: { capa: 3, orden: 1, etiqueta: 'Lineamiento' },
  comunicado: { capa: 3, orden: 2, etiqueta: 'Comunicado' },
  aviso: { capa: 3, orden: 3, etiqueta: 'Aviso' },
  nota_informativa: { capa: 3, orden: 4, etiqueta: 'Nota informativa' },
  guia: { capa: 3, orden: 5, etiqueta: 'Guía' },
  /**
   * Las normas internas de una entidad concreta.
   *
   * Obligan dentro de esa entidad y a nadie más, así que no pueden
   * fijar cómo se llama una figura de alcance nacional. Fue el fallo
   * que reportó César el 01/09/2026: las disposiciones de contratos
   * menores de la SUNARP estaban como `directiva` —capa 1— y el chat
   * dio su terminología interna en vez de la del artículo 228.2 del
   * Reglamento, que también tenía delante.
   */
  directiva_entidad: {
    capa: 3,
    orden: 5,
    etiqueta: 'Norma interna de una entidad (obliga solo dentro de ella)',
  },
  manual_seace: { capa: 3, orden: 6, etiqueta: 'Manual del SEACE' },
  manual: { capa: 3, orden: 6, etiqueta: 'Manual' },
  tupa: { capa: 3, orden: 7, etiqueta: 'TUPA' },
  faq: { capa: 3, orden: 8, etiqueta: 'Preguntas frecuentes' },
};

const POR_DEFECTO: Rango = { capa: 3, orden: 9, etiqueta: 'Documento de orientación' };

/**
 * El 22 de abril de 2025 entró en vigencia la Ley N° 32069 y su
 * Reglamento. Lo dice, entre otras, la Resolución N° 7505-2026-S4 del
 * Tribunal, y de ahí sale esta fecha: no es una suposición.
 *
 * Antes de ese día regía la Ley N° 30225 y su Reglamento. Todo criterio
 * emitido bajo aquella norma sigue siendo útil para entender una figura,
 * pero sus plazos, umbrales y porcentajes pueden estar cambiados.
 */
export const VIGENCIA_32069 = '2025-04-22';

/** Normas derogadas, tal como se las nombra en los documentos. */
const NORMAS_DEROGADAS = /30225|082-2019-EF|344-2018-EF|350-2015-EF|30114/;

/**
 * El año de un documento, sacado de cómo se le nombra: "Opinión N°
 * 098-2023/DTN", "Resolución N° 4377-2025-S3", "D000016-2026-OECE-DTN".
 *
 * Se exige que empiece por 19 o 20 para no confundir el año con el
 * número de la ley: en "Ley N° 32069" no hay ningún año.
 */
function anioDe(texto: string): number | null {
  const anios = [...texto.matchAll(/\b(?:19|20)\d\d\b/g)].map((m) => Number(m[0]));
  return anios.length > 0 ? Math.max(...anios) : null;
}

export interface FuenteJerarquia {
  doc_type: string;
  doc_title?: string | null;
  doc_number?: string | null;
  /** El texto del fragmento, cuando se tiene: dice bajo qué norma habla. */
  snippet?: string | null;
  similarity?: number;
}

/**
 * ¿Este documento habla de la norma vigente o de la derogada?
 *
 * Solo se marca lo que consta: un documento de 2023 interpreta la Ley N°
 * 30225 porque la otra no existía, y uno que nombra la 30225 en su
 * título tampoco deja dudas. Del resto no se dice nada, que es distinto
 * de decir que es vigente.
 *
 * POR QUÉ HACE FALTA
 *
 * Medido el 22/08/2026 con la pregunta de César sobre la ampliación de
 * plazo en obras: de veinticuatro fragmentos recuperados, DOCE decían
 * "quince (15) días" —opiniones de 2020 a 2024 y unas preguntas
 * frecuentes de la Ley N° 30225— y uno solo, el del artículo 200 del
 * Reglamento vigente, decía diez. Con esa mayoría el modelo respondió
 * quince. Ordenar por capas no basta cuando doce voces repiten la cifra
 * vieja: hay que decirle cuáles son viejas.
 */
export function regimenDe(fuente: FuenteJerarquia): 'anterior' | 'indeterminado' {
  const nombre = `${fuente.doc_title ?? ''} ${fuente.doc_number ?? ''}`;
  // Que se nombre a sí mismo bajo una norma derogada vale para
  // cualquier capa.
  if (NORMAS_DEROGADAS.test(nombre)) return 'anterior';
  // La fecha, en cambio, solo dice algo de los criterios. Una norma no
  // caduca por ser vieja: el Texto Único Ordenado del DS N° 206-2024-EF
  // —reactivación de obras paralizadas— es de 2024 y sigue vigente, y
  // marcarlo como derogado habría hecho que el modelo lo descartara.
  if (rangoDe(fuente.doc_type).capa === 1) return 'indeterminado';

  // Lo que dice el propio fragmento manda sobre la fecha del documento.
  //
  // Una resolución de 2026 puede estar juzgando hechos de 2023 y aplicar
  // la Ley N° 30225 —"norma vigente al momento de la ocurrencia de los
  // hechos", escriben—. Medido con la pregunta del banco sobre
  // contrataciones de emergencia: de los diez fragmentos que daban el
  // plazo de regularización, nueve decían diez días y solo el artículo
  // 289.2 del Reglamento vigente decía veinte; entre esos nueve había
  // resoluciones de 2025 que por fecha no se marcaban.
  //
  // Si el fragmento nombra las dos normas está explicando el tránsito de
  // una a otra, y entonces no se marca: esa comparación es justo lo que
  // se quiere leer.
  const texto = fuente.snippet ?? '';
  if (texto && NORMAS_DEROGADAS.test(texto) && !/32069|009-2025-EF/.test(texto)) {
    return 'anterior';
  }

  const anio = anioDe(nombre);
  if (anio !== null && anio < 2025) return 'anterior';

  // SE PROBÓ Y SE RETIRÓ (06/09/2026): marcar los documentos de 2025
  // que no nombran la Ley N° 32069 como «año de tránsito», por si
  // aplicaban la norma derogada. La primera medición, sobre ocho
  // vueltas, decía que reducía las citas al artículo 60 del Reglamento
  // anterior de 8 de 8 a 4 de 8. Repetida sobre doce, el efecto salió
  // AL REVÉS —1 de 12 con el aviso frente a 8 de 12 sin él— y además
  // hundía la pregunta del comité tras la nulidad del 50 % al 25 %.
  //
  // La lección no es sobre esta etiqueta: es que ocho vueltas no bastan
  // para decidir. Si se vuelve a intentar, medir con doce como mínimo y
  // en las dos preguntas.
  return 'indeterminado';
}

/**
 * Artículos que cambiaron de número al pasar al Reglamento vigente.
 *
 * POR QUÉ HACE FALTA
 *
 * Medido el 06/09/2026 con la pregunta de la firma que falta en un
 * anexo: de los treinta y ocho fragmentos recuperados, CINCO eran
 * resoluciones del Tribunal de 2025 que citan «el artículo 60 del
 * Reglamento» para la subsanación de ofertas —el del reglamento
 * derogado— y ninguna quedaba marcada como régimen anterior, porque no
 * nombran la Ley N° 30225 en su texto y por fecha son de 2025. Cinco
 * voces dando el artículo viejo contra una que da el vigente. El chat
 * respondía bien casi siempre, pero una de cada doce veces escribía «el
 * artículo 60 del Reglamento (referido a los supuestos de subsanación
 * de ofertas)» como si estuviera vigente.
 *
 * POR QUÉ NO SE RESUELVE CON LA FECHA
 *
 * Ya se intentó y se retiró: marcar todo documento de 2025 que no
 * nombre la Ley N° 32069 hundía otras preguntas. La fecha no distingue
 * una resolución que aplica la norma vieja de otra que aplica la nueva.
 * El número del artículo junto a su asunto sí: en el Reglamento vigente
 * la subsanación es el artículo 78, y el 60 regula a los jurados, así
 * que un texto que une «artículo 60» con «subsanación» está hablando
 * del reglamento derogado, sea del año que sea.
 *
 * CÓMO SE AMPLÍA
 *
 * Solo con pares comprobados uno a uno contra los dos textos. Un par
 * mal puesto marca como derogado un fragmento vigente, que es peor que
 * no marcar nada.
 */
interface Renumeracion {
  /** Cómo se cita el artículo en el reglamento derogado. */
  viejo: RegExp;
  /** Su número, para escribirlo en la etiqueta sin releer el patrón. */
  numeroViejo: string;
  /** El asunto, que tiene que aparecer cerca de la cita. */
  asunto: RegExp;
  /** Cómo se llama hoy. */
  vigente: string;
  /** De qué trata, para escribirlo en la etiqueta. */
  materia: string;
}

const RENUMERADOS: Renumeracion[] = [
  {
    viejo: /art[iíI]culo\s+60\b|\bnumeral\s+60\.\d/i,
    numeroViejo: '60',
    asunto: /subsan/i,
    vigente: '78',
    materia: 'la subsanación de las ofertas',
  },
];

/** Cuánto puede alejarse el asunto de la cita para seguir contando. */
const CERCA = 220;

/**
 * ¿El fragmento cita un artículo del reglamento derogado?
 *
 * Se exige que el asunto esté CERCA de la cita, no solo en el mismo
 * fragmento: nuestro propio criterio del jurado cita el artículo 60
 * —el vigente, que trata de los jurados— y marcarlo sería decir que la
 * respuesta correcta está derogada.
 */
export function articuloRenumerado(fuente: FuenteJerarquia): Renumeracion | null {
  const texto = fuente.snippet ?? '';
  if (!texto) return null;
  // Si el propio fragmento nombra la norma vigente, está comparando las
  // dos y no hay nada que advertir.
  if (/32069|009-2025-EF/.test(texto)) return null;
  for (const r of RENUMERADOS) {
    for (const m of texto.matchAll(new RegExp(r.viejo.source, 'gi'))) {
      const i = m.index ?? 0;
      const ventana = texto.slice(Math.max(0, i - CERCA), i + CERCA);
      if (r.asunto.test(ventana)) return r;
    }
  }
  return null;
}

export function rangoDe(tipo: string): Rango {
  return RANGOS[tipo] ?? POR_DEFECTO;
}

/** Los tipos de la capa 1, para pedirlos expresamente a la búsqueda. */
export const TIPOS_CAPA_1 = Object.entries(RANGOS)
  .filter(([, r]) => r.capa === 1)
  .map(([tipo]) => tipo);

/** Etiqueta que precede a cada fuente en el contexto del modelo. */
export function etiquetaJerarquia(tipo: string): string {
  const r = rangoDe(tipo);
  const nombre = r.capa === 1 ? 'NORMA' : r.capa === 2 ? 'CRITERIO' : 'ORIENTACIÓN';
  return `CAPA ${r.capa} · ${nombre}`;
}

/**
 * La etiqueta completa, con el aviso de norma derogada cuando toca.
 *
 * El aviso va en la cabecera del fragmento y no en una nota al pie
 * porque el modelo lee la cabecera junto al texto: si la advertencia
 * está lejos, se le olvida al llegar a la cifra.
 */
export function etiquetaFuente(fuente: FuenteJerarquia): string {
  const base = etiquetaJerarquia(fuente.doc_type);
  const regimen = regimenDe(fuente);
  if (regimen === 'anterior') {
    return `${base} · RÉGIMEN ANTERIOR (Ley N° 30225, derogada el 22/04/2025)`;
  }
  const renumerado = articuloRenumerado(fuente);
  if (renumerado) {
    return (
      `${base} · CITA EL REGLAMENTO DEROGADO: lo que llama artículo ` +
      `${renumerado.numeroViejo} es hoy el artículo ` +
      `${renumerado.vigente} del DS N° 009-2025-EF (${renumerado.materia}). ` +
      'El razonamiento sirve; el número, no.'
    );
  }
  return base;
}

/**
 * Las reglas que el modelo tiene que aplicar antes de responder.
 *
 * Van redactadas como las escribió César, porque son suyas y porque
 * dicen exactamente lo que hay que decir.
 */
export const BLOQUE_JERARQUIA = `═══════════════════════════════════════════════════════
JERARQUÍA NORMATIVA — se aplica ANTES de redactar
═══════════════════════════════════════════════════════
Cada fragmento viene marcado con su capa:

  CAPA 1 · NORMA — Ley N° 32069, su Reglamento, directivas y normas de
    carácter general, bases estándar y bases integradas. Obligan.
  CAPA 2 · CRITERIO — precedentes de observancia obligatoria, acuerdos
    de Sala Plena, resoluciones del Tribunal, pronunciamientos y
    opiniones. Interpretan y aplican la capa 1.
  CAPA 3 · ORIENTACIÓN — lineamientos no normativos, comunicados,
    avisos, notas informativas, guías, manuales y material de
    orientación. Menor fuerza interpretativa.

Algunos fragmentos vienen marcados como CRITERIO YA RESUELTO Y
VERIFICADO. Son casos que este equipo resolvió y comprobó contra la
norma, y sirven de atajo: dicen la respuesta y nombran los artículos que
la sostienen. NO son fuente por sí mismos. Si te apoyas en uno, cita el
artículo que él cita, no el criterio: responder «los criterios validados
de LexIA establecen…» sin nombrar la norma deja al usuario sin poder
comprobar nada. Y si el criterio contradijera a la norma que tienes
delante, manda la norma y conviene decirlo.

REGLAS QUE NO PUEDES ROMPER:

1. Ningún criterio interpretativo, opinión, pronunciamiento, comunicado,
   informe, lineamiento o resolución puede utilizarse para contradecir
   una norma de superior jerarquía.

2. Un plazo, un requisito o un umbral se responden con la capa 1 cuando
   la tengas entre los fragmentos, citando el artículo o numeral.

   Si el dato solo consta en fuentes de capa 2 o 3 que aplican la norma
   VIGENTE —una resolución de este año que cita el artículo, por
   ejemplo—, DALO IGUALMENTE y di de dónde sale: "según la Resolución
   N° …, que aplica el artículo …; conviene contrastarlo con el texto
   vigente". Callarse un dato correcto por prudencia es tan malo como
   dar uno equivocado: el usuario se queda sin la mitad de la respuesta
   y no se entera.

3. Si una fuente de capa 2 o 3 dice una cifra distinta de la que dice la
   capa 1, manda la capa 1. Explica la discrepancia en una línea: es
   frecuente que un criterio antiguo siga citando la norma derogada
   —la Ley N° 30225 y su Reglamento— y en ese caso hay que advertirlo.

4. Ante criterios contradictorios NO elijas automáticamente el más
   reciente. Determina jerarquía, vigencia, carácter vinculante,
   competencia del órgano emisor, especialidad y ámbito temporal y
   material, y recién entonces cuál resulta aplicable al caso.

5. Antes de aplicar un criterio, identifica su naturaleza jurídica,
   órgano emisor, fundamento normativo, ámbito de aplicación, vigencia y
   eventual carácter vinculante.

6. Los fragmentos marcados RÉGIMEN ANTERIOR interpretan la Ley N° 30225,
   derogada el 22 de abril de 2025. NO tomes de ellos un plazo, un
   umbral, un porcentaje ni una cifra para darla como respuesta, por
   muchos fragmentos que la repitan: que doce documentos digan lo mismo
   no los hace vigentes, los hace igual de antiguos. Sirven para explicar
   una figura, no para fijar un número.

   Si la cifra que te piden solo aparece en fragmentos de régimen
   anterior, dilo así: "el dato proviene de criterios emitidos bajo la
   Ley N° 30225, derogada; bajo la Ley N° 32069 debe verificarse en el
   artículo correspondiente del Reglamento vigente".`;
