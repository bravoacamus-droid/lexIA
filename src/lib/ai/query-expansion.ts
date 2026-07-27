export interface LegalExpansion {
  /** Query original + todos los términos técnicos concatenados. Usa
   *  esto para la 2ª búsqueda semántica general. */
  expanded: string;
  /** Frases cortas y CONCENTRADAS para búsquedas focalizadas por
   *  artículo específico (con filter_type='ley' idealmente). Cada
   *  frase suele tener 4-8 palabras que evocan un artículo puntual —
   *  como "artículo 226 contrato menor 8 UIT". Se usan para
   *  garantizar que el chunk base de la Ley entre al pool aunque la
   *  query expandida completa lo diluya. */
  focalQueries: string[];
}

/**
 * Query expansion — detecta patrones legales comunes en la pregunta del
 * usuario y agrega términos técnicos que suelen aparecer en los artículos
 * relevantes del Reglamento. La query original se mantiene; los términos
 * extra ayudan a que el embedding matchee chunks con vocabulario numérico
 * específico (ej: "50% utilidad", "8 días hábiles").
 *
 * Extraído de src/app/api/chat/route.ts el 08/07/2026 tras diagnóstico de
 * la reunión con César — la voz NO tenía expansion y la pregunta
 * "¿aplica la gestión de riesgos en contratos menores?" no traía el
 * chunk correcto del Art. 226 porque el embedding pesaba más "gestión de
 * riesgos" que "contrato menor" y traía pronunciamientos de gestión
 * genérica sin la modalidad de contrato menor.
 *
 * Retorna `{expanded, focalQueries}`. Si no aplica ninguna expansión
 * `expanded` es string vacío y `focalQueries` array vacío.
 */
export function expandLegalQuery(query: string): LegalExpansion {
  const q = query.toLowerCase();
  const additions: string[] = [];
  const focalQueries: string[] = [];

  // Helper para registrar simultáneamente la adición larga (expanded)
  // y una focal corta (búsqueda focalizada en la Ley).
  const add = (verbose: string, focal: string) => {
    additions.push(verbose);
    focalQueries.push(focal);
  };

  // Resolución de contrato por Entidad → 50% utilidad Art. 123.5
  if (
    /(?:resoluci[óo]n|resolver).*(?:contrat|imputable|atribuible).*(?:entidad|contratante)/i.test(q) ||
    (/derecho.*contratista/i.test(q) && /resoluci[óo]n/i.test(q))
  ) {
    add(
      'artículo 123 reglamento 50% utilidad prevista saldo obra fórmulas reajuste liquidación',
      'artículo 123 resolución contrato 50% utilidad',
    );
  }

  // Suspensión de plazo por Entidad → Art. 107.5 AGA
  if (/suspensi[óo]n.*plazo/i.test(q) && /entidad|contratante/i.test(q)) {
    add(
      'artículo 107 numeral 107.5 autoridad gestión administrativa AGA autorización previa',
      'artículo 107 suspensión plazo AGA',
    );
  }

  // Falta de pago valorizaciones → Art. 202.3
  if (/(?:falta|no)\s+pago.*valorizaci[óo]n|dos\s+valorizaciones/i.test(q)) {
    add(
      'artículo 202 numeral 202.3 costos directos mayores gastos generales vinculados acreditados',
      'artículo 202 falta pago valorizaciones',
    );
  }

  // Sistemas de entrega bienes/servicios → Art. 129
  if (/sistema.*entrega|llave en mano|comodato|gesti[óo]n de instalaciones/i.test(q)) {
    add(
      'artículo 129 sistemas entrega bienes servicios llave en mano mantenimiento suministro comodato',
      'artículo 129 sistemas de entrega',
    );
  }

  // Ampliación de plazo → Art. 198
  if (/ampliaci[óo]n.*plazo/i.test(q) && !/preguntas/i.test(q)) {
    add(
      'artículo 198 numeral 198.1 causales ampliación plazo ruta crítica',
      'artículo 198 ampliación plazo',
    );
  }

  // Difusión del requerimiento → Art. 51
  if (/difusi[óo]n.*requerimiento/i.test(q)) {
    add(
      'artículo 51 numeral 51.2 51.3 51.4 51.5 cinco días hábiles seis días absolución acta',
      'artículo 51 difusión requerimiento',
    );
  }

  // Recurso de apelación → Art. 304
  if (/apelaci[óo]n.*tribunal|recurso.*apelaci[óo]n/i.test(q)) {
    add(
      'artículo 304 ocho días hábiles Tribunal Contrataciones Públicas',
      'artículo 304 recurso apelación tribunal',
    );
  }

  // Prevalencia pliego vs bases integradas → Art. 66.6
  if (
    /prevalece|divergencia/i.test(q) &&
    /(?:pliego|bases integradas|integraci[óo]n)/i.test(q)
  ) {
    add(
      'artículo 66 numeral 66.6 prevalece lo absuelto pliego absolución consultas',
      'artículo 66 prevalencia pliego bases integradas',
    );
  }

  // Contrato menor / contrataciones menores a 8 UIT → Art. 226
  // Feedback César 08/07/2026 durante llamada: preguntó por "gestión de
  // riesgos en contrato menor" y la voz respondió "no encontré el
  // término contrato menor". El vector semántico pesaba más "gestión
  // de riesgos" que "contrato menor" y traía pronunciamientos de
  // gestión genérica sin el chunk del Art. 226.
  if (
    /contrato[s]?\s+menor|contrataci[óo]n(?:es)?\s+menor|menor(?:es)?\s+a\s+8\s*UIT/i.test(q)
  ) {
    add(
      'artículo 226 disposiciones generales contratos menores 8 UIT modalidades contratación pública eficiente',
      'artículo 226 contrato menor 8 UIT',
    );
  }

  // Gestión de riesgos en general → Art. 128 y 156
  if (/gesti[óo]n\s+de\s+riesgos|matriz\s+de\s+riesgos/i.test(q)) {
    add(
      'artículo 128 156 planificación integral gestión riesgos matriz identificación análisis cualitativo cuantitativo distribución',
      'artículo 128 gestión de riesgos matriz',
    );
  }

  // ══ Patrones agregados 24/07/2026 tras test contra las 9 Q&A modelo
  //    de César. Los 3 temas de abajo scoreaban 0-50% porque el
  //    retrieval no traía los artículos específicos. ══

  // No suscribir/perfeccionar contrato + multa → Art. 87 infracciones
  // (lista), Art. 364 (tabla de multas % por infracción), retención con
  // compromiso de pago, ejecución coactiva.
  // Q8 de César scoreó 0%: pregunta narrativa larga ("Antes con la
  // 30225... ahora con la norma actual...") cuyo embedding difuso no
  // matcheaba los chunks técnicos del procedimiento sancionador.
  // Vocabulario real del corpus verificado en BD: la tabla de multas
  // está en Art. 364.6 ("Porcentaje de oferta económica... 3 - 6%...
  // MYPES... 5% - 8%").
  if (
    /no\s+suscrib|no\s+perfeccion|no\s+firm[ae].*contrato|neg[aá]\w*\s+a\s+(?:suscribir|firmar)/i.test(q) ||
    (/multa/i.test(q) && /(?:suscrib|perfeccion|contrato|tribunal|sanci[óo]n)/i.test(q))
  ) {
    add(
      'artículo 87 infracciones administrativas participantes postores proveedores perfeccionar contrato injustificadamente artículo 364 multa porcentaje oferta económica MYPES Tribunal Contrataciones Públicas',
      'artículo 364 multa porcentaje oferta económica infracciones',
    );
    focalQueries.push('artículo 87 infracciones perfeccionar el contrato injustificadamente');
    focalQueries.push('compromiso de pago retención multa nuevos contratos');
    // Art. 89.5 verificado en BD: "En caso de no pagarse la multa
    // impuesta en el plazo establecido, el OECE puede iniciar los actos
    // de ejecución coactiva" + reincidencia. Detectado 27/07/2026: los
    // puntos "coactiva/reincidencia" faltaban de forma recurrente.
    focalQueries.push('artículo 89 multa no pagada ejecución coactiva reincidencia inhabilitación');
  }

  // Modalidades de la contratación pública eficiente → enumeración
  // completa en los Arts. 34-39 de la Ley (Título VI): contratos
  // menores, compra por encargo, centralizada, corporativa, CPI y
  // acuerdos marco. Detectado 27/07/2026: V1 de voz caía a 40% porque
  // el top-5 traía la Guía de estrategia (sim 0.86) pero no el chunk
  // que enumera las 6 modalidades. Vocabulario verificado en BD.
  if (/modalidad/i.test(q) && /(?:contrataci[óo]n|eficiente|compra)/i.test(q)) {
    add(
      'modalidades de la contratación pública eficiente artículo 34 contratos menores artículo 35 compra por encargo artículo 36 compra centralizada artículo 37 compra corporativa artículo 38 compra pública de innovación artículo 39 acuerdos marco',
      'modalidades contratación pública eficiente contratos menores compra encargo centralizada corporativa innovación acuerdos marco',
    );
  }

  // Impedimentos → Art. 30 con sus categorías completas.
  // Q2 de César scoreó 50%: las facetas genéricas no traían personas
  // jurídicas (30% capital), 6 meses post-cargo ni REDAM/REDERECI.
  if (/impedimento/i.test(q) || (/impedid/i.test(q) && /contrat|proveedor|postor/i.test(q))) {
    add(
      'artículo 30 impedimentos contratar personas naturales jurídicas cónyuge parientes segundo grado consanguinidad afinidad capital social 30% seis meses',
      'artículo 30 impedimentos personas jurídicas capital social',
    );
    focalQueries.push('impedimentos seis meses después de dejar el cargo funcionarios');
    // Consecuencia de contratar con impedido → nulidad (Art. 70 Ley,
    // "70.2. La nulidad puede ser declarada por..."). Detectado
    // 27/07/2026 en test de coherencia: ni chat ni voz mencionaban la
    // nulidad al preguntar "¿qué pasa si se contrata con un impedido?".
    focalQueries.push('artículo 70 nulidad contratos celebrados con proveedores impedidos');
    focalQueries.push('impedimentos REDAM REDERECI deudores sanciones inhabilitación');
  }

  // Discrecionalidad del evaluador / valor por dinero en evaluación →
  // Art. 132 (negociación por exceso, rechazo por bajo costo), 76-77
  // (diálogo competitivo, negociación), 135 (jurado arquitectónico).
  // Q3 de César scoreó 42%: faltaban rechazo por bajo costo, diálogo
  // competitivo y jurado no apelable.
  if (
    /discrecional/i.test(q) ||
    (/valor\s+por\s+dinero/i.test(q) && /(?:evalua|comit[eé]|oferta|decisi[óo]n)/i.test(q))
  ) {
    add(
      'artículo 132 negociación oferta supera cuantía rechazo ofertas sustancialmente por debajo composición detallada evaluadores',
      'artículo 132 rechazo ofertas bajo costo negociación',
    );
    focalQueries.push('diálogo competitivo negociación modalidades diferenciadas artículo 76 77');
    focalQueries.push('jurado concurso proyectos arquitectónicos calificación no apelable');
  }

  const expanded = additions.length === 0 ? '' : `${query} ${additions.join(' ')}`;
  return { expanded, focalQueries };
}
