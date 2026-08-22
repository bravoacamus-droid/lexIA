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

  // ── Capa 3: orienta ───────────────────────────────────────────────
  lineamiento: { capa: 3, orden: 1, etiqueta: 'Lineamiento' },
  comunicado: { capa: 3, orden: 2, etiqueta: 'Comunicado' },
  aviso: { capa: 3, orden: 3, etiqueta: 'Aviso' },
  nota_informativa: { capa: 3, orden: 4, etiqueta: 'Nota informativa' },
  guia: { capa: 3, orden: 5, etiqueta: 'Guía' },
  manual_seace: { capa: 3, orden: 6, etiqueta: 'Manual del SEACE' },
  manual: { capa: 3, orden: 6, etiqueta: 'Manual' },
  tupa: { capa: 3, orden: 7, etiqueta: 'TUPA' },
  faq: { capa: 3, orden: 8, etiqueta: 'Preguntas frecuentes' },
};

const POR_DEFECTO: Rango = { capa: 3, orden: 9, etiqueta: 'Documento de orientación' };

export function rangoDe(tipo: string): Rango {
  return RANGOS[tipo] ?? POR_DEFECTO;
}

/** Los tipos de la capa 1, para pedirlos expresamente a la búsqueda. */
export const TIPOS_CAPA_1 = Object.entries(RANGOS)
  .filter(([, r]) => r.capa === 1)
  .map(([tipo]) => tipo);

/**
 * Ordena las fuentes por jerarquía y, dentro de cada rango, por lo bien
 * que responden a la pregunta.
 *
 * Que el Reglamento vaya el primero no es cosmético: el modelo lee en
 * orden y lo que ve antes pesa más en lo que escribe.
 */
export function ordenarPorJerarquia<T extends { doc_type: string; similarity?: number }>(
  fuentes: T[],
): T[] {
  return [...fuentes].sort((a, b) => {
    const ra = rangoDe(a.doc_type);
    const rb = rangoDe(b.doc_type);
    if (ra.capa !== rb.capa) return ra.capa - rb.capa;
    if (ra.orden !== rb.orden) return ra.orden - rb.orden;
    return (b.similarity ?? 0) - (a.similarity ?? 0);
  });
}

/** Etiqueta que precede a cada fuente en el contexto del modelo. */
export function etiquetaJerarquia(tipo: string): string {
  const r = rangoDe(tipo);
  const nombre = r.capa === 1 ? 'NORMA' : r.capa === 2 ? 'CRITERIO' : 'ORIENTACIÓN';
  return `CAPA ${r.capa} · ${nombre}`;
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

REGLAS QUE NO PUEDES ROMPER:

1. Ningún criterio interpretativo, opinión, pronunciamiento, comunicado,
   informe, lineamiento o resolución puede utilizarse para contradecir
   una norma de superior jerarquía.

2. Un plazo, un requisito o un umbral se responden SIEMPRE con la capa 1
   cuando la tengas entre los fragmentos, citando el artículo o numeral.
   Si solo tienes una fuente de capa 2 o 3 para ese dato, dilo
   expresamente: "no consta en la Ley ni el Reglamento entre los
   fragmentos recuperados; lo siguiente proviene de [tipo de documento],
   que interpreta la norma y debe verificarse contra el texto vigente".

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
   eventual carácter vinculante.`;
