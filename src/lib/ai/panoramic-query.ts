/**
 * Detección de preguntas PANORÁMICAS / de RESUMEN y expansión a
 * múltiples sub-búsquedas por facetas para mejorar el recall
 * temático.
 *
 * Feedback César 13/07/2026: LexIA fallaba en preguntas tipo
 *   "resúmeme todo respecto a la modalidad de contratación pública
 *   eficiente"
 *   "explícame todo respecto a los impedimentos de contratación"
 *
 * mientras NotebookLM sí respondía bien. Diagnóstico: el retrieval
 * híbrido traía 15 chunks del ARTÍCULO específico más cercano, pero
 * la pregunta pide una PANORÁMICA del tema (múltiples artículos,
 * incisos, tipos y excepciones). El vector semántico dominante
 * seleccionaba una faceta y perdía las demás.
 *
 * Solución en 3 pasos:
 *   1. Detectar patrón "de resumen" en la query (`isPanoramicQuery`).
 *   2. Expandir a facetas típicas del tema (`buildPanoramicFacets`)
 *      que devuelve 3-6 queries cortas orientadas a diferentes
 *      dimensiones del tema (tipos, requisitos, procedimiento,
 *      excepciones, plazos, sanciones).
 *   3. Instrucción adicional al system prompt para SINTETIZAR en
 *      secciones enumeradas, no citar chunk por chunk.
 */

/**
 * Devuelve true si la pregunta del usuario pide una VISIÓN
 * PANORÁMICA de un tema, no una respuesta puntual. Detecta patrones
 * comunes:
 *   - "resume|resúmeme|resumen de X"
 *   - "explica|explícame TODO sobre X"
 *   - "cuáles son los tipos de X"
 *   - "qué es X y cómo funciona"
 *   - "todo sobre X"
 *   - "clases|tipos|formas|categorías|modalidades de X"
 *   - "impedimentos|requisitos|procedimientos|plazos|sanciones de X"
 */
export function isPanoramicQuery(query: string): boolean {
  const q = query.toLowerCase().trim();

  const PANORAMIC_PATTERNS = [
    /\b(res[uú]me(?:me)?|res[uú]men)\b/,
    /\bexpl[íi]ca(?:me)?\b.{0,20}\btodo\b/,
    /\btodo\b.{0,20}\b(sobre|respecto|acerca)\b/,
    /\b(cu[áa]les?)\b.{0,30}\b(son|existen|hay)\b/,
    // Palabras que sugieren enumeración de un conjunto (tipos, modalidades,
    // formas, clases, categorías) — pueden venir precedidas por qué/cuáles
    // o directamente ("qué modalidades existen", "los tipos de X").
    /\b(qu[ée]|cu[áa]les?|los?|las?)\s+(tipos?|modalidades?|formas|clases|categor[íi]as|clasificaci[óo]n)\b/,
    /\b(qu[ée] es y c[óo]mo)\b/,
    /\bdame\b.{0,20}\b(res[uú]men|panorama|visi[óo]n)\b/,
    /\bpanorama\b/,
    /\bvisi[óo]n general\b/,
    /\ben qu[ée] consiste\b/,
    /\bqu[ée] establece la ley (?:sobre|acerca)\b/,
    // "en qué casos/supuestos..." — pregunta de enumeración de causales
    // (Q3 de César: "En qué casos el comité debe evaluar...")
    /\ben qu[ée] (?:casos|supuestos|situaciones|circunstancias)\b/,
    // "detalla(me) paso a paso..." — pide una guía completa del proceso
    // (Q6 de César: "detalles paso a paso cuando una entidad debe...")
    /\bpaso\s+a\s+paso\b/,
    /\bdet[aá]lla(?:me)?\b/,
  ];

  return PANORAMIC_PATTERNS.some((rx) => rx.test(q));
}

/**
 * Extrae el TEMA CENTRAL de una pregunta panorámica. Elimina las
 * frases de "resumen" y quedarse solo con el sujeto legal.
 *
 * Ejemplo:
 *   "resúmeme todo respecto a la modalidad de contratación pública eficiente"
 *   → "modalidad de contratación pública eficiente"
 */
export function extractCentralTopic(query: string): string {
  let topic = query.trim();

  // Quitar prefijos de resumen/pregunta comunes. Se aplican EN ORDEN,
  // los más específicos primero. El bucle itera hasta convergencia
  // porque a veces hay 2 prefijos apilados ("quiero que me resumas todo
  // respecto a X" = "quiero que me" + "resúmeme todo respecto a").
  const PREFIXES = [
    /^(?:por\s+favor,?\s+)?(?:me\s+puedes?\s+|puedes?\s+|podr[íi]as?\s+)/i,
    /^(?:quiero|necesito|deseo)\s+(?:que\s+)?(?:me\s+)?/i,
    // Cubre "resume", "resúmeme", "resumas" (subjuntivo tras "que me")
    /^(?:res[uú]me(?:me)?|res[uú]mas)\s+(?:todo\s+)?(?:respecto\s+(?:a|al|de)|sobre|acerca\s+de|de)\s+(?:la\s+|el\s+|los\s+|las\s+)?/i,
    // Cubre "explica", "explícame", "explique", "expliques" (subjuntivo)
    /^(?:expl[íi]ca(?:me)?|expl[íi]cas|expl[íi]que|expl[íi]ques)\s+(?:todo\s+)?(?:respecto\s+(?:a|al|de)|sobre|acerca\s+de|de)\s+(?:la\s+|el\s+|los\s+|las\s+)?/i,
    /^dame\s+(?:un\s+)?(?:res[uú]men|panorama|visi[óo]n(?:\s+general)?)\s+(?:de|sobre|acerca\s+de)\s+(?:la\s+|el\s+|los\s+|las\s+)?/i,
    /^cu[áa]les?\s+son\s+(?:los?|las?)\s+(?:tipos?|modalidades?|formas?|clases|categor[íi]as|impedimentos?)\s+de\s+/i,
    /^qu[ée]\s+(?:tipos?|modalidades?|formas?|clases|categor[íi]as)\s+(?:de\s+)?(?:hay|existen)?\s*/i,
    /^qu[ée]\s+es\s+(?:el|la|los|las|un|una)?\s*/i,
    /^en\s+qu[ée]\s+consiste(?:n)?\s+(?:el|la|los|las)?\s*/i,
    /^qu[ée]\s+establece\s+la\s+ley\s+(?:sobre|acerca\s+de|respecto\s+(?:a|al|de))\s+/i,
    /^todo\s+(?:sobre|acerca|respecto\s+(?:a|al|de))\s+/i,
    /^en\s+qu[ée]\s+(?:casos|supuestos|situaciones|circunstancias)\s+/i,
    /^(?:respecto\s+(?:a|al|de)|sobre|acerca\s+de|de)\s+(?:la\s+|el\s+|los\s+|las\s+)?/i,
  ];
  for (let pass = 0; pass < 4; pass++) {
    let matched = false;
    for (const rx of PREFIXES) {
      const before = topic;
      topic = topic.replace(rx, '');
      if (topic !== before) matched = true;
    }
    if (!matched) break;
  }
  // Quitar sufijos redundantes ("existen?", "hay?")
  topic = topic.replace(/\s+(existen|hay)\s*[?¿.!¡]*\s*$/i, '');
  // Quitar signos de puntuación finales
  topic = topic.replace(/[?¿.!¡,;]+\s*$/, '').trim();
  return topic;
}

/**
 * Construye 4-6 sub-queries cortas orientadas a facetas típicas del
 * tema. Estas queries se ejecutan en paralelo con hybrid_search y
 * sus resultados se mezclan al pool principal antes del rerank.
 *
 * Ejemplo:
 *   topic = "modalidad de contratación pública eficiente"
 *   → [
 *       "tipos de modalidad de contratación pública eficiente",
 *       "modalidad de contratación pública eficiente definición",
 *       "modalidad de contratación pública eficiente requisitos",
 *       "modalidad de contratación pública eficiente procedimiento",
 *       "modalidad de contratación pública eficiente excepciones",
 *     ]
 */
/**
 * Facetas ESPECÍFICAS para temas legales conocidos del dominio. Cuando
 * el tópico matchea, se usan estas en vez de las genéricas — mejoran
 * dramáticamente el recall porque usan el VOCABULARIO REAL del corpus.
 *
 * Agregado 24/07/2026 tras test contra las Q&A de César: la pregunta de
 * impedimentos scoreaba 50% con facetas genéricas ("impedimentos
 * requisitos", "impedimentos procedimiento") porque el Art. 30 usa
 * tipología propia ("Tipo 1.A", "parientes", "capital social").
 */
const KNOWN_TOPIC_FACETS: Array<{ match: RegExp; facets: string[] }> = [
  {
    match: /impedimento/i,
    facets: [
      'artículo 30 impedimentos personas naturales cargo funcionarios alcance nacional',
      'impedimentos parientes cónyuge conviviente segundo grado consanguinidad afinidad',
      'impedimentos personas jurídicas capital social participación órganos de administración',
      'impedimentos sanción inhabilitación REDAM REDERECI registro deudores',
      'impedimentos seis meses después de dejar el cargo ámbito de competencia',
      'verificación impedimentos Ficha Única del Proveedor declaración jurada',
    ],
  },
  {
    match: /modalidad(?:es)?\s+de\s+(?:la\s+)?contrataci[óo]n|contrataci[óo]n\s+p[úu]blica\s+eficiente/i,
    facets: [
      'contratos menores 8 UIT disposiciones generales',
      'compra por encargo entidad organismo internacional convenio',
      'compra centralizada Perú Compras importancia estratégica',
      'compra corporativa obligatoria facultativa agregación demanda',
      'compra pública de innovación precomercial asociación',
      'acuerdo marco catálogos electrónicos',
    ],
  },
  {
    match: /discrecional|valor\s+por\s+dinero/i,
    facets: [
      'artículo 132 negociación oferta supera cuantía procedimiento',
      'rechazo ofertas sustancialmente por debajo composición detallada',
      'diálogo competitivo soluciones modalidades diferenciadas',
      'jurado concurso proyectos arquitectónicos calificación no apelable',
      'facultad discrecional rigor técnico decisión sustentada',
    ],
  },
  {
    match: /emergencia|desastre/i,
    facets: [
      'contrataciones prevención atención emergencias contratación directa',
      'contratos de contingencia evento futuro pago disponibilidad activación',
      'regularización veinte días hábiles informe técnico legal',
      'cuadro multianual necesidades gestión riesgos acuerdos marco emergencia',
      'entidad contratante definición poderes del estado ministerios gobiernos regionales locales empresas',
      'garantía fiel cumplimiento contratación directa emergencia',
    ],
  },
  {
    match: /[áa]rea\s+usuaria/i,
    facets: [
      'área usuaria formula requerimiento especificaciones técnicas términos referencia',
      'área usuaria cuadro multianual necesidades programación',
      'área usuaria conformidad prestación verificación obligaciones',
      'área usuaria gestión de riesgos identificación',
      'área técnica estratégica rol responsabilidades',
    ],
  },
];

export function buildPanoramicFacets(topic: string): string[] {
  const t = topic.trim();
  if (t.length === 0) return [];

  // 1. Temas conocidos → facetas específicas con vocabulario del corpus
  for (const known of KNOWN_TOPIC_FACETS) {
    if (known.match.test(t)) {
      return known.facets.slice(0, 6);
    }
  }

  // 2. Fallback genérico para temas no mapeados
  const facets = [
    `tipos de ${t}`,
    `${t} definición`,
    `${t} requisitos`,
    `${t} procedimiento`,
    `${t} excepciones y limitaciones`,
  ];

  // Facetas condicionales según pistas
  const tLower = t.toLowerCase();
  if (/inhabilitaci[óo]n|sanci[óo]n/.test(tLower)) {
    facets.push(`${t} alcance y aplicación`);
  }
  if (/plazo|t[ée]rmino|d[íi]a/.test(tLower)) {
    facets.push(`${t} cómputo y cómo se cuenta`);
  }
  if (/contrato|contrataci[óo]n/.test(tLower)) {
    facets.push(`${t} formalización y perfeccionamiento`);
  }

  // Limit a 6 facetas para no saturar el retrieval
  return facets.slice(0, 6);
}
